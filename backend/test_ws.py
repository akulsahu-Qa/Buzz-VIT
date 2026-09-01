import asyncio
import websockets
import json

async def fetch_channels():
    async with websockets.connect("ws://localhost:3000") as ws:
        req = ["REQ", "sub1", {"kinds": [39000]}]
        await ws.send(json.dumps(req))
        
        while True:
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
                print(msg)
            except asyncio.TimeoutError:
                break
        
        req2 = ["REQ", "sub2", {"kinds": [39002]}]
        await ws.send(json.dumps(req2))
        while True:
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
                print(msg)
            except asyncio.TimeoutError:
                break

asyncio.run(fetch_channels())
