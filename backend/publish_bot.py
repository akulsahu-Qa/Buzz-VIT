import asyncio
import os
import json
import httpx
from buzz_client import BuzzClient, _build_event
from nostr_sign import privkey_to_pubkey_hex, _bytes_from_int

# Generate new key
bot_privkey_hex = os.urandom(32).hex()

# Temporarily override the environment for BuzzClient
os.environ["BOT_PRIVATE_KEY"] = bot_privkey_hex
os.environ["BUZZ_RELAY_HTTP_URL"] = "https://vitoperationsdemo.communities.buzz.xyz"

# Bech32 encode npub
def convertbits(data, frombits, tobits, pad=True):
    acc = 0; bits = 0; ret = []
    maxv = (1 << tobits) - 1; max_acc = (1 << (frombits + tobits - 1)) - 1
    for value in data:
        acc = ((acc << frombits) | value) & max_acc
        bits += frombits
        while bits >= tobits:
            bits -= tobits
            ret.append((acc >> bits) & maxv)
    if pad and bits:
        ret.append((acc << (tobits - bits)) & maxv)
    return ret

def bech32_polymod(values):
    g = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
    c = 1
    for v in values:
        b = c >> 25
        c = ((c & 0x1ffffff) << 5) ^ v
        for i in range(5):
            c ^= g[i] if ((b >> i) & 1) else 0
    return c

def bech32_encode(hrp, data):
    C = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
    d = [ord(x) >> 5 for x in hrp] + [0] + [ord(x) & 31 for x in hrp] + data
    p = bech32_polymod(d + [0]*6) ^ 1
    chk = [(p >> 5 * (5 - i)) & 31 for i in range(6)]
    return hrp + "1" + "".join([C[x] for x in data + chk])

bot_pubkey_hex = privkey_to_pubkey_hex(bytes.fromhex(bot_privkey_hex))
npub = bech32_encode("npub", convertbits(bytes.fromhex(bot_pubkey_hex), 8, 5, True))

async def main():
    client = BuzzClient()
    endpoint = f"{client.relay_http_url}/events"
    
    metadata = {
        "name": "Hospital Bot",
        "display_name": "Hospital Workflow Bot",
        "about": "Automated checklist and workflow bot",
        "picture": "https://robohash.org/workflowbot2.png"
    }
    
    event = _build_event(
        privkey_hex=client._privkey_hex,
        pubkey=client._pubkey,
        kind=0,
        content=json.dumps(metadata, separators=(',', ':')),
        tags=[]
    )
    
    auth_header = client._make_nip98_auth(endpoint)
    
    print("Publishing Bot Profile...")
    async with httpx.AsyncClient() as hc:
        resp = await hc.post(
            endpoint,
            json=event,
            headers={"Content-Type": "application/json", "Authorization": auth_header}
        )
        print("Response:", resp.status_code, resp.text)
        
    print("\n--- BOT CREDENTIALS ---")
    print(f"BOT_PRIVATE_KEY={bot_privkey_hex}")
    print(f"BOT_NPUB={npub}")
    
    # Save the new private key to .env immediately!
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    with open(env_path, 'r') as f:
        lines = f.readlines()
    with open(env_path, 'w') as f:
        for line in lines:
            if line.startswith("BOT_PRIVATE_KEY="):
                f.write(f"BOT_PRIVATE_KEY={bot_privkey_hex}\n")
            else:
                f.write(line)

asyncio.run(main())
