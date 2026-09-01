import asyncio
from dotenv import load_dotenv
import os
from buzz_client import BuzzClient

load_dotenv()

async def main():
    client = BuzzClient()
    supervisors_channel = os.getenv("SUPERVISORS_CHANNEL_ID")
    
    print(f"Testing post to supervisor channel: {supervisors_channel}")
    try:
        client.post_message(supervisors_channel, "Test message from bot to supervisor")
        print("Success!")
    except Exception as e:
        print(f"FAILED: {e}")

asyncio.run(main())
