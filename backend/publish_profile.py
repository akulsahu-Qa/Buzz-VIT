import asyncio
import json
import os
import httpx
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path=env_path, override=True)

from buzz_client import BuzzClient, _build_event

async def main():
    client = BuzzClient()
    
    metadata = {
        "name": "Workflow Bot",
        "display_name": "Hospital Workflow Bot",
        "about": "Automated checklist and workflow bot",
        "picture": "https://robohash.org/workflowbot.png"
    }
    
    endpoint = f"{client.relay_http_url}/events"
    
    event = _build_event(
        privkey_hex=client._privkey_hex,
        pubkey=client._pubkey,
        kind=0,
        content=json.dumps(metadata, separators=(',', ':')),
        tags=[]
    )
    
    auth_header = client._make_nip98_auth(endpoint)
    
    async with httpx.AsyncClient() as hc:
        resp = await hc.post(
            endpoint,
            json=event,
            headers={
                "Content-Type": "application/json",
                "Authorization": auth_header
            }
        )
        print("Response:", resp.status_code, resp.text)

asyncio.run(main())
