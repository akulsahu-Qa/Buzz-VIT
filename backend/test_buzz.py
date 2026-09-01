import asyncio
from buzz_client import BuzzClient
import os
import sys
from dotenv import load_dotenv

load_dotenv(override=True)

async def test():
    client = BuzzClient()
    try:
        res = await client.post_generic_task_notification(
            channel_id=os.environ.get("NURSES_CHANNEL_ID"),
            workflow_id="test",
            task_id="test_task",
            phase_id="test_phase",
            checklist_base_url="http://localhost:5173",
            assignee_name="Test"
        )
        print("SUCCESS:", res)
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(test())
