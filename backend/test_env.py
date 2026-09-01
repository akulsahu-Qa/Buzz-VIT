import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
print(f"Loading from: {env_path}")
load_dotenv(dotenv_path=env_path, override=True)

print(f"NURSES_CHANNEL_ID: {os.getenv('NURSES_CHANNEL_ID')}")
