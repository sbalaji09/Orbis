#!/usr/bin/env python3
"""
Create a test API key for tool tracking tests
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

import bcrypt
from backend.db_connection import db

def hash_api_key(api_key: str) -> str:
    """Hash an API key using bcrypt"""
    return bcrypt.hashpw(api_key.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_test_api_key():
    # Use a simple, memorable API key for testing
    plaintext_key = "test-tool-tracking-key-123"
    user_id = "00000000-0000-0000-0000-000000000000"
    agent_name = "tool-tracking-test-agent"

    # Hash the key
    hashed_key = hash_api_key(plaintext_key)

    print("=" * 70)
    print("Creating Test API Key for Tool Tracking")
    print("=" * 70)

    try:
        # Insert the agent with hashed key
        result = db.insert_agent(user_id, agent_name, hashed_key)

        print("\n✅ API Key Created Successfully!")
        print("\n" + "=" * 70)
        print("SAVE THESE CREDENTIALS:")
        print("=" * 70)
        print(f"\nPlaintext API Key: {plaintext_key}")
        print(f"User ID:           {user_id}")
        print(f"Agent Name:        {agent_name}")
        print(f"\nBcrypt Hash:       {hashed_key}")
        print("\n" + "=" * 70)
        print("\nUse in your SDK tests:")
        print("=" * 70)
        print(f"""
configure(
    api_key="{plaintext_key}",
    project_id="<agent_id>",  # Get from database
    user_id="{user_id}",
    api_url="http://localhost:8080"
)
""")
        print("=" * 70)

        # Get the agent_id
        print("\nFetching agent_id from database...")
        conn = db.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT agent_id FROM agents
                    WHERE user_id = %s AND agent_name = %s
                    ORDER BY created_at DESC LIMIT 1
                """, (user_id, agent_name))
                result = cur.fetchone()
                if result:
                    agent_id = result[0]
                    print(f"\n✅ Agent ID: {agent_id}")
                    print(f"\nFull configuration:")
                    print("=" * 70)
                    print(f"""
configure(
    api_key="{plaintext_key}",
    project_id="{agent_id}",
    user_id="{user_id}",
    api_url="http://localhost:8080"
)
""")
                    print("=" * 70)
        finally:
            db.return_connection(conn)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_test_api_key()