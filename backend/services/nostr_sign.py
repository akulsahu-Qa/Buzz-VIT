"""
Pure-Python secp256k1 Schnorr signing for Nostr (NIP-01)

No C extensions, no OpenSSL, no pkg-config required.
Implements BIP-340 Schnorr signatures over secp256k1 using only
Python's built-in `hashlib` and `secrets`.

Reference: https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
           https://github.com/nostr-protocol/nostr/blob/master/01.md
"""

import hashlib
import hmac
import secrets
from typing import Optional

# ── secp256k1 curve parameters ─────────────────────────────────────────────────

P  = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
N  = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
G  = (
    0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798,
    0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8,
)


def _point_add(P1, P2):
    if P1 is None:
        return P2
    if P2 is None:
        return P1
    if P1[0] == P2[0]:
        if P1[1] != P2[1]:
            return None
        lam = (3 * P1[0] * P1[0] * pow(2 * P1[1], P - 2, P)) % P
    else:
        lam = ((P2[1] - P1[1]) * pow(P2[0] - P1[0], P - 2, P)) % P
    x = (lam * lam - P1[0] - P2[0]) % P
    y = (lam * (P1[0] - x) - P1[1]) % P
    return (x, y)


def _point_mul(point, n):
    result = None
    addend = point
    while n:
        if n & 1:
            result = _point_add(result, addend)
        addend = _point_add(addend, addend)
        n >>= 1
    return result


def _x(point):
    return point[0]


def _has_even_y(point):
    return point[1] % 2 == 0


def _bytes_from_int(x: int) -> bytes:
    return x.to_bytes(32, "big")


def _int_from_bytes(b: bytes) -> int:
    return int.from_bytes(b, "big")


def _tagged_hash(tag: str, data: bytes) -> bytes:
    tag_hash = hashlib.sha256(tag.encode()).digest()
    return hashlib.sha256(tag_hash + tag_hash + data).digest()


# ── Public API ──────────────────────────────────────────────────────────────────

def privkey_to_pubkey_hex(privkey_bytes: bytes) -> str:
    """
    Derive the Nostr public key (x-coordinate only, 32 bytes, hex)
    from a 32-byte private key.
    """
    d = _int_from_bytes(privkey_bytes)
    if not (1 <= d < N):
        raise ValueError("Private key out of range")
    point = _point_mul(G, d)
    return _bytes_from_int(_x(point)).hex()


def schnorr_sign(msg32: bytes, privkey_bytes: bytes, aux_rand: Optional[bytes] = None) -> bytes:
    """
    BIP-340 Schnorr sign.
    msg32   : 32-byte message (typically SHA-256 of the Nostr event serialisation)
    privkey : 32-byte private key
    aux_rand: 32 bytes of auxiliary randomness (default: secrets.token_bytes(32))
    Returns 64-byte signature.
    """
    if len(msg32) != 32:
        raise ValueError("msg32 must be 32 bytes")
    if aux_rand is None:
        aux_rand = secrets.token_bytes(32)

    d0 = _int_from_bytes(privkey_bytes)
    if not (1 <= d0 < N):
        raise ValueError("Private key out of range")

    P_point = _point_mul(G, d0)
    d = d0 if _has_even_y(P_point) else N - d0

    t = _int_from_bytes(
        bytes(a ^ b for a, b in zip(_bytes_from_int(d), _tagged_hash("BIP0340/aux", aux_rand)))
    )
    k0 = _int_from_bytes(_tagged_hash("BIP0340/nonce", _bytes_from_int(t) + _bytes_from_int(_x(P_point)) + msg32)) % N
    if k0 == 0:
        raise ValueError("Nonce is zero — extremely unlikely, retry")

    R = _point_mul(G, k0)
    k = k0 if _has_even_y(R) else N - k0
    e = _int_from_bytes(
        _tagged_hash("BIP0340/challenge", _bytes_from_int(_x(R)) + _bytes_from_int(_x(P_point)) + msg32)
    ) % N
    sig = _bytes_from_int(_x(R)) + _bytes_from_int((k + e * d) % N)
    return sig


def schnorr_sign_hex(msg32_hex: str, privkey_hex: str) -> str:
    """Convenience wrapper that accepts and returns hex strings."""
    sig = schnorr_sign(bytes.fromhex(msg32_hex), bytes.fromhex(privkey_hex))
    return sig.hex()


# ── Bech32 / npub Conversion ───────────────────────────────────────────────────

_BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"

def _convertbits(data, frombits, tobits, pad=True):
    acc = 0
    bits = 0
    ret = []
    maxv = (1 << tobits) - 1
    max_acc = (1 << (frombits + tobits - 1)) - 1
    for value in data:
        if value < 0 or (value >> frombits):
            return None
        acc = ((acc << frombits) | value) & max_acc
        bits += frombits
        while bits >= tobits:
            bits -= tobits
            ret.append((acc >> bits) & maxv)
    if pad and bits:
        ret.append((acc << (tobits - bits)) & maxv)
    return ret

def npub_to_hex(npub: str) -> str:
    """
    Accepts either a 64-character hex Nostr public key or an npub1... bech32 string
    and returns the 64-character lowercase hex public key.
    """
    cleaned = npub.strip().lower()
    if not cleaned.startswith("npub1"):
        if len(cleaned) == 64 and all(c in "0123456789abcdef" for c in cleaned):
            return cleaned
        raise ValueError(f"Invalid pubkey or npub: '{npub}'")

    data = [_BECH32_CHARSET.find(x) for x in cleaned[5:]]
    if any(x == -1 for x in data):
        raise ValueError("Invalid bech32 character in npub")
    # Discard 6-character checksum
    data = data[:-6]
    decoded = _convertbits(data, 5, 8, False)
    if decoded is None or len(decoded) != 32:
        raise ValueError("Invalid npub payload length (expected 32 bytes)")
    return bytes(decoded).hex()

