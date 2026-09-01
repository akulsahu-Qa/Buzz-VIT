"""
Load .env before FastAPI starts — add this to the top of main.py
if not already using a process manager that sets env vars.
"""
from dotenv import load_dotenv
load_dotenv()
