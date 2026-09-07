import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=env_path, override=True)

class Settings:
    # App
    API_BASE_URL: str = os.environ.get("API_BASE_URL", "http://localhost:8000").rstrip("/")
    CHECKLIST_BASE_URL: str = os.environ.get("CHECKLIST_BASE_URL", "http://localhost:5173").rstrip("/")
    ADMIN_API_KEY: str = os.environ.get("ADMIN_API_KEY", "supersecret123")
    
    # DB
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "sqlite:///./hospital.db")
    
    # Buzz
    NURSES_CHANNEL_ID: str = os.environ.get("NURSES_CHANNEL_ID", "")
    SUPERVISORS_CHANNEL_ID: str = os.environ.get("SUPERVISORS_CHANNEL_ID", "")

settings = Settings()
