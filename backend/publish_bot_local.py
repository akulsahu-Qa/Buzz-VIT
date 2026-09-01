import asyncio
import json
import httpx
from dotenv import load_dotenv
from buzz_client import BuzzClient, _build_event

load_dotenv()

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
    
    print("Publishing Bot Profile to Community Relay...")
    async with httpx.AsyncClient() as hc:
        resp = await hc.post(
            endpoint,
            json=event,
            headers={"Content-Type": "application/json", "Authorization": auth_header}
        )
        print("Response:", resp.status_code, resp.text)

asyncio.run(main())
