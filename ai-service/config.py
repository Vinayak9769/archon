import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

DEFAULT_PROVIDER = os.getenv("DEFAULT_PROVIDER", "gemini").lower()

# Validate that keys are set for whichever provider is chosen
def check_keys():
    errors = []
    if not OPENAI_API_KEY:
        errors.append("OPENAI_API_KEY is not set.")
    if not GEMINI_API_KEY:
        errors.append("GEMINI_API_KEY / GOOGLE_API_KEY is not set.")
    return errors
