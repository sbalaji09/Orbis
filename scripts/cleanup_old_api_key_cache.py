import redis
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

def cleanup():
    r = redis.from_url(REDIS_URL)
    
    # Find all old-style keys (api_key:* where value is user_id)
    old_keys = list(r.scan_iter("api_key:*"))
    
    if old_keys:
        print(f"Found {len(old_keys)} old-style API key cache entries")
        # Delete them
        r.delete(*old_keys)
        print("Deleted old cache entries")
    else:
        print("No old-style cache entries found")

if __name__ == "__main__":
    cleanup()