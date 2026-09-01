import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # Request kind 39000 (group metadata) from relay
        resp = await client.post("http://localhost:3000/events", json={
            "kinds": [39000]
        })
        print(resp.status_code, resp.text)
        
        # In Nostr HTTP (NIP-98/NIP-01 over HTTP), fetching events is usually a WebSocket req.
        # But let's try via websockets!
