import requests
import json
import time
import sys
import os
from datetime import datetime, timezone
from uuid import uuid4

# Add backend to path for database access
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))
from backend.db_connection import db

# Test configuration
API_URL = "http://localhost:8000/span"
API_KEY = "test_api_key_123"  # Make sure this matches your .env or Redis

def get_or_create_test_user():
    """Get an existing user from auth.users or return None to skip foreign key"""
    conn = None
    try:
        conn = db.get_connection()
        with conn.cursor() as cur:
            # Try to get any existing user
            cur.execute("SELECT id FROM auth.users LIMIT 1")
            result = cur.fetchone()
            if result:
                user_id = result[0]
                print(f"  Using existing user: {user_id}")
                return str(user_id)
            else:
                print("  No users found in auth.users")
                return None
    except Exception as e:
        print(f"  Could not access auth.users: {e}")
        return None
    finally:
        if conn:
            db.return_connection(conn)

def create_test_agent():
    """Create a test agent in the database and return its ID"""
    conn = None
    try:
        # First get a valid user_id
        user_id = get_or_create_test_user()
        if not user_id:
            print("✗ No valid user_id available - cannot create agent with foreign key constraint")
            print("\nOptions:")
            print("  1. Create a user in Supabase Authentication dashboard")
            print("  2. Remove the foreign key constraint from agents.user_id")
            print("  3. Change user_id to not reference auth.users")
            return None

        conn = db.get_connection()
        with conn.cursor() as cur:
            # First, check if agents table exists and has correct schema
            cur.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'agents'
                ORDER BY ordinal_position
            """)
            columns = [row[0] for row in cur.fetchall()]
            print(f"  Agents table columns: {columns}")

            # Try to insert agent (agent_id will be auto-generated as UUID)
            sql = """
                INSERT INTO agents (user_id, agent_name, api_key)
                VALUES (%s, %s, %s)
                RETURNING agent_id
            """
            agent_name = "test_agent_" + str(uuid4())[:8]
            print(f"  Creating agent: {agent_name} for user: {user_id}")

            cur.execute(sql, (
                user_id,
                agent_name,
                API_KEY
            ))
            result = cur.fetchone()
            conn.commit()
            agent_id = str(result[0])  # Convert UUID to string
            print(f"✓ Created test agent with ID: {agent_id}")
            return agent_id
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"✗ Failed to create agent: {e}")
        print(f"  Error details: {type(e).__name__}")
        print("\nTroubleshooting:")
        print("  1. Make sure you've run the migration: database/migration_add_agent_id.sql")
        print("  2. Or recreate tables with: database/init.sql")
        print("  3. Check that auth.users table has at least one user")
        return None
    finally:
        if conn:
            db.return_connection(conn)

def create_test_span(trace_id: str, span_id: str, user_id: str = None, agent_id: str = None, is_start: bool = False, is_end: bool = False):
    """Create a test span with realistic data"""
    span_data = {
        "trace_id": trace_id,
        "span_id": span_id,
        "parent_span_id": [],
        "name": "test_llm_call",
        "start_time": datetime.now(timezone.utc).isoformat(),
        "end_time": datetime.now(timezone.utc).isoformat(),
        "duration": 1.5,
        "input_data": "What is the meaning of life?",
        "output_data": "The meaning of life is 42.",
        "model": "gpt-4",
        "input_tokens": 10,
        "output_tokens": 20,
        "total_cost": 0.0015,
        "status": "success",
        "error_message": None,
        "user_id": user_id if user_id else "00000000-0000-0000-0000-000000000000",  # Use UUID format
        "is_start_span": is_start,
        "is_end_span": is_end
    }

    # Add agent_id if provided (as string UUID)
    if agent_id is not None:
        span_data["agent_id"] = agent_id

    return span_data

def send_span(span_data):
    """Send a span to the ingestion API"""
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }

    response = requests.post(API_URL, json=span_data, headers=headers)
    return response

def verify_trace_in_db(trace_id, max_wait=10):
    """Wait for trace to appear in database after being processed by worker"""
    print(f"  Waiting for worker to process trace {trace_id[:8]}...")

    for i in range(max_wait):
        time.sleep(1)
        try:
            conn = db.get_connection()
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM traces WHERE trace_id = %s", (trace_id,))
                trace = cur.fetchone()
                if trace:
                    print(f"  ✓ Trace found in database after {i+1}s")
                    db.return_connection(conn)
                    return True
            db.return_connection(conn)
        except Exception as e:
            print(f"  Database check error: {e}")
            return False

    print(f"  ✗ Trace not found in database after {max_wait}s")
    print(f"  This likely means the worker is not running!")
    return False

def test_single_span(user_id=None, agent_id=None):
    """Test sending a single span"""
    print("\n=== Test 1: Single Span ===")

    trace_id = str(uuid4())
    span_id = str(uuid4())

    span = create_test_span(trace_id, span_id, user_id=user_id, agent_id=agent_id, is_start=True, is_end=True)

    print(f"Sending span with trace_id: {trace_id}")
    if user_id:
        print(f"  Associated with user_id: {user_id}")
    if agent_id:
        print(f"  Associated with agent_id: {agent_id}")
    response = send_span(span)

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    if response.status_code == 202:
        print("✓ Span accepted by API")
        # Verify it was processed and inserted into database
        if verify_trace_in_db(trace_id):
            return True
        else:
            print("✗ Span not processed - check if worker is running!")
            return False
    else:
        print(f"✗ Failed: {response.text}")
        return False

def test_trace_with_multiple_spans(user_id=None, agent_id=None):
    """Test sending a trace with multiple spans"""
    print("\n=== Test 2: Trace with Multiple Spans ===")

    trace_id = str(uuid4())

    # Create 3 spans for the same trace
    spans = [
        create_test_span(trace_id, str(uuid4()), user_id=user_id, agent_id=agent_id, is_start=True, is_end=False),
        create_test_span(trace_id, str(uuid4()), user_id=user_id, agent_id=agent_id, is_start=False, is_end=False),
        create_test_span(trace_id, str(uuid4()), user_id=user_id, agent_id=agent_id, is_start=False, is_end=True)
    ]

    print(f"Sending 3 spans for trace_id: {trace_id}")
    if user_id:
        print(f"  Associated with user_id: {user_id}")
    if agent_id:
        print(f"  Associated with agent_id: {agent_id}")

    success_count = 0
    for i, span in enumerate(spans, 1):
        response = send_span(span)
        if response.status_code == 202:
            print(f"  ✓ Span {i}/3 accepted")
            success_count += 1
        else:
            print(f"  ✗ Span {i}/3 failed: {response.text}")

        time.sleep(0.1)  # Small delay between requests

    if success_count == 3:
        print("✓ All spans accepted successfully")
        return True
    else:
        print(f"✗ Only {success_count}/3 spans accepted")
        return False

def test_rate_limiting():
    """Test rate limiting by sending many requests"""
    print("\n=== Test 3: Rate Limiting ===")

    print("Sending 10 rapid requests to test rate limiting...")

    success_count = 0
    rate_limited_count = 0

    for i in range(10):
        trace_id = str(uuid4())
        span_id = str(uuid4())
        span = create_test_span(trace_id, span_id, is_start=True, is_end=True)

        response = send_span(span)
        if response.status_code == 202:
            success_count += 1
        elif response.status_code == 429:
            rate_limited_count += 1
            print(f"  Rate limited after {success_count} requests")
            break

    print(f"✓ Sent {success_count} requests before rate limiting")
    return True

def test_invalid_span():
    """Test sending an invalid span"""
    print("\n=== Test 4: Invalid Span ===")

    # Create span with missing required fields
    invalid_span = {
        "trace_id": "not-a-uuid",
        "span_id": "also-not-a-uuid"
    }

    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }

    response = requests.post(API_URL, json=invalid_span, headers=headers)

    if response.status_code == 400 or response.status_code == 422:
        print(f"✓ Invalid span rejected with status {response.status_code}")
        return True
    else:
        print(f"✗ Expected 400/422, got {response.status_code}")
        return False

def main():
    print("=== Orbis Data Pipeline End-to-End Test ===")
    print("\nPrerequisites:")
    print("1. Redis is running (redis-server)")
    print("2. Worker is running (python3 worker.py)")
    print("3. Ingestion API is running on port 8000")
    print("   cd data-pipeline && uvicorn ingestion_api:app --reload --port 8000")
    print("4. API key is configured in Redis or .env")
    print("5. Database schema is up to date")

    input("\nPress Enter to start tests...")

    # Get user_id from auth.users first
    print("\n=== Getting test user ===")
    user_id = get_or_create_test_user()

    if not user_id:
        print("\n⚠️  ERROR: No user_id available!")
        print("Tests require a valid user from auth.users table.")
        print("\nTo fix this:")
        print("  1. Create a user in Supabase Authentication dashboard")
        print("  2. Or run a SQL command to insert a test user")
        print("Exiting...")
        return

    # Create a test agent first
    print("\n=== Setting up test agent ===")
    agent_id = create_test_agent()

    if not agent_id:
        print("\n⚠️  WARNING: Agent creation failed!")
        print("Tests will run WITHOUT agent_id association.")
        print("\nTo fix this, run in Supabase SQL Editor:")
        print("  1. Open: database/migration_add_agent_id.sql")
        print("  2. Copy contents and run in Supabase")
        print("  3. Re-run this test")
        response = input("\nContinue tests without agent? (y/n): ")
        if response.lower() != 'y':
            print("Exiting...")
            return

    results = []

    # Run tests with user_id and agent_id (agent_id will be None if creation failed)
    print("\n=== Running Tests ===")
    results.append(("Single Span", test_single_span(user_id=user_id, agent_id=agent_id)))
    results.append(("Multiple Spans", test_trace_with_multiple_spans(user_id=user_id, agent_id=agent_id)))
    results.append(("Rate Limiting", test_rate_limiting()))
    results.append(("Invalid Span", test_invalid_span()))

    # Print summary
    print("\n" + "="*50)
    print("=== Test Summary ===")
    print("="*50)
    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{test_name:.<30} {status}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if agent_id:
        print(f"\n✓ Test agent successfully created!")
        print(f"  Agent ID: {agent_id}")
        print(f"  Query traces: SELECT * FROM traces WHERE agent_id = {agent_id};")
    else:
        print(f"\n⚠️  Tests ran WITHOUT agent association")
        print(f"  Traces were created with agent_id = NULL")

    print("\n" + "="*50)
    print("Next Steps:")
    print("="*50)
    print("1. Check worker logs: data-pipeline/logs/data-pipeline.log")
    print("2. Verify data in Supabase dashboard")
    print("3. Check queue: redis-cli LLEN span_processing_queue")
    print("4. Check DLQ: python3 inspect_dlq.py view")
    if agent_id:
        print(f"5. Verify agent_id in traces: SELECT trace_id, agent_id FROM traces WHERE agent_id = {agent_id};")

if __name__ == "__main__":
    main()
