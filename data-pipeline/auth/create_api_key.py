import sys
import secrets
from auth_middleware import create_api_key

# generates a secure api key for the user
def generate_api_key(user_id: str = None):
    # generates the api key
    api_key = f"sk_live_{secrets.token_urlsafe(32)}"

    # stores the api key in redis
    success = create_api_key(user_id, api_key)

    if success:
        print("\n" + "="*60)
        print("✓ API Key Created Successfully")
        print("="*60)
        print(f"\nUser ID:  {user_id}")
        print(f"API Key:  {api_key}")
        print("\n" + "="*60)
        print("\nAdd this to your SDK configuration:")
        print(f'  headers = {{"X-API-Key": "{api_key}"}}')
        print("\nOr add to .env file:")
        print(f'  VALID_API_KEYS=...,{api_key}:{user_id}')
        print("="*60 + "\n")
    else:
        print("✗ Failed to create API key")
        return None

    return api_key


if __name__ == "__main__":
    generate_api_key()