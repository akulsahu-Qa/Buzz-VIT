import asyncio
import os
import json
import httpx
from dotenv import load_dotenv
import websockets

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path=env_path, override=True)

from buzz_client import BuzzClient, _build_event

async def get_channels():
    client = BuzzClient()
    
    async with websockets.connect("ws://localhost:3000") as ws:
        msg = await ws.recv()
        print("<<", msg)
        auth_msg = json.loads(msg)
        if auth_msg[0] == "AUTH":
            challenge = auth_msg[1]
            auth_event = _build_event(
                privkey_hex=client._privkey_hex,
                pubkey=client._pubkey,
                kind=22242,
                content="",
                tags=[["relay", "ws://localhost:3000"], ["challenge", challenge]]
            )
            print(">>", json.dumps(["AUTH", auth_event]))
            await ws.send(json.dumps(["AUTH", auth_event]))
            
        req = ["REQ", "sub1", {"kinds": [39000]}]
        print(">>", json.dumps(req))
        await ws.send(json.dumps(req))
        
        while True:
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
                print("<<", msg)
            except asyncio.TimeoutError:
                break

asyncio.run(get_channels())
