#!/usr/bin/env python3.12
"""
Quick script to create a test API key for development.
Usage: python3.12 create_test_api_key.py
"""
import sys
import secrets
import bcrypt
sys.path.append('.')
from db_connection import db

# Generate a simple test API key
test_api_key = "test_" + secrets.token_urlsafe(32)
user_id = "00000000-0000-0000-0000-000000000000"

# Hash the API key
hashed_key = bcrypt.hashpw(test_api_key.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Insert into database
conn = db.get_connection()
cur = conn.cursor()

try:
    cur.execute(
        """
        INSERT INTO agents (user_id, agent_name, api_key)
        VALUES (%s, %s, %s)
        ON CONFLICT (agent_id) DO NOTHING
        RETURNING agent_id
        """,
        (user_id, "Test Agent for WebSocket Development", hashed_key)
    )
    result = cur.fetchone()
    conn.commit()

    if result:
        agent_id = result[0]
        print("✅ Test API key created successfully!")
        print(f"\nAgent ID: {agent_id}")
        print(f"User ID: {user_id}")
        print(f"\n🔑 Your API Key (copy this): {test_api_key}")
        print("\n📋 To use it:")
        print(f"1. Open your browser console (F12)")
        print(f"2. Run: document.cookie = \"X-User-ID={test_api_key}; path=/; max-age=31536000\"")
        print(f"3. Refresh the page")
    else:
        print("Agent may already exist or insert failed")

except Exception as e:
    conn.rollback()
    print(f"❌ Error creating API key: {e}")
finally:
    db.return_connection(conn)
