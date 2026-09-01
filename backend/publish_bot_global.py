import asyncio
import json
import websockets

bot_privkey_hex = "c65995a8a19d217549b8cf303a85554a2c0706511d2440d03cf601a41793a202"
from nostr_sign import privkey_to_pubkey_hex
from buzz_client import _build_event
bot_pubkey_hex = privkey_to_pubkey_hex(bytes.fromhex(bot_privkey_hex))

async def publish():
    metadata = {
        "name": "Hospital Bot",
        "display_name": "Hospital Workflow Bot",
        "about": "Automated checklist and workflow bot",
        "picture": "https://robohash.org/workflowbot2.png"
    }
    
    event = _build_event(
        privkey_hex=bot_privkey_hex,
        pubkey=bot_pubkey_hex,
        kind=0,
        content=json.dumps(metadata, separators=(',', ':')),
        tags=[]
    )
    
    public_relays = ["ws://localhost:3000"] # We'll just try to publish to localhost as a fallback, but let's use global!
    
    async with websockets.connect("wss://relay.damus.io") as ws:
        print("Connected to Damus!")
        await ws.send(json.dumps(["EVENT", event]))
        res = await ws.recv()
        print("Damus Response:", res)
        
    async with websockets.connect("wss://nos.lol") as ws:
        print("Connected to Nos.lol!")
        await ws.send(json.dumps(["EVENT", event]))
        res = await ws.recv()
        print("Nos.lol Response:", res)

asyncio.run(publish())
