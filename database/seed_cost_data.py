#!/usr/bin/env python3
"""
Seed script to populate the database with test data for the cost dashboard.
Usage: python database/seed_cost_data.py <user_id>

Example: python database/seed_cost_data.py "123e4567-e89b-12d3-a456-426614174000"
"""

import os
import sys
import uuid
import random
from datetime import datetime, timedelta, timezone

import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Model configurations with realistic pricing (per 1K tokens)
MODELS = {
    "gpt-4o": {"input_cost": 0.005, "output_cost": 0.015},
    "gpt-4o-mini": {"input_cost": 0.00015, "output_cost": 0.0006},
    "claude-3-5-sonnet-20241022": {"input_cost": 0.003, "output_cost": 0.015},
    "claude-3-5-haiku-20241022": {"input_cost": 0.001, "output_cost": 0.005},
    "gpt-3.5-turbo": {"input_cost": 0.0005, "output_cost": 0.0015},
}

# Agent names for variety
AGENT_NAMES = [
    "customer-support-bot",
    "code-assistant",
    "data-analyst",
    "content-writer",
    "research-agent",
]

# Sample input previews (for repeated prompt detection)
INPUT_PREVIEWS = [
    "Summarize the following document:",
    "Translate this text to Spanish:",
    "Write a professional email about",
    "Analyze the sentiment of this review:",
    "Generate unit tests for the following function:",
    "Explain this code snippet:",
    "Create a marketing copy for",
    "Debug the following error:",
]


def get_connection():
    """Get database connection from environment."""
    conn_string = os.getenv("DIRECT_CONNECTION")
    if not conn_string:
        print("Error: DIRECT_CONNECTION environment variable not set")
        print("Please set it in your .env file")
        sys.exit(1)
    return psycopg2.connect(conn_string)


def create_agents(conn, user_id: str, count: int = 3) -> list:
    """Create test agents for the user."""
    agents = []
    with conn.cursor() as cur:
        for i in range(count):
            agent_id = str(uuid.uuid4())
            agent_name = AGENT_NAMES[i % len(AGENT_NAMES)]
            api_key = f"orb_test_{uuid.uuid4().hex[:16]}"

            cur.execute("""
                INSERT INTO agents (agent_id, user_id, agent_name, api_key, created_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (api_key) DO NOTHING
                RETURNING agent_id
            """, (agent_id, user_id, agent_name, api_key, datetime.now(timezone.utc)))

            result = cur.fetchone()
            if result:
                agents.append({"agent_id": result[0], "agent_name": agent_name})
                print(f"  Created agent: {agent_name} ({agent_id[:8]}...)")

    conn.commit()
    return agents


def generate_trace_with_spans(conn, user_id: str, agent: dict, base_time: datetime, trace_num: int):
    """Generate a single trace with multiple spans."""
    trace_id = str(uuid.uuid4())
    trace_hash_id = f"trace_{uuid.uuid4().hex[:8]}"

    # Random number of spans per trace (1-5)
    num_spans = random.randint(1, 5)

    # Vary the duration realistically
    trace_duration = random.uniform(500, 15000)  # 0.5s to 15s

    total_cost = 0
    total_tokens = 0
    spans_data = []

    for span_idx in range(num_spans):
        span_id = str(uuid.uuid4())

        # Pick a random model (weighted towards cheaper models)
        model_weights = [0.15, 0.35, 0.15, 0.25, 0.10]  # Favor mini/haiku models
        model_name = random.choices(list(MODELS.keys()), weights=model_weights)[0]
        model_config = MODELS[model_name]

        # Generate realistic token counts
        prompt_tokens = random.randint(50, 2000)
        completion_tokens = random.randint(20, 1500)

        # Calculate cost
        input_cost = (prompt_tokens / 1000) * model_config["input_cost"]
        output_cost = (completion_tokens / 1000) * model_config["output_cost"]
        span_cost = input_cost + output_cost

        total_cost += span_cost
        total_tokens += prompt_tokens + completion_tokens

        # Calculate span timing
        span_start = base_time + timedelta(milliseconds=span_idx * (trace_duration / num_spans))
        span_duration = trace_duration / num_spans
        span_end = span_start + timedelta(milliseconds=span_duration)

        # Pick input preview (some repeated for caching detection)
        input_preview = random.choice(INPUT_PREVIEWS)
        if random.random() < 0.3:  # 30% chance of using same preview
            input_preview = INPUT_PREVIEWS[0]

        spans_data.append({
            "span_id": span_id,
            "trace_id": trace_id,
            "name": f"llm_call_{span_idx + 1}",
            "start_time": span_start,
            "end_time": span_end,
            "duration": span_duration,
            "llm_model": model_name,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "cost": span_cost,
            "status": "completed",
            "input_preview": input_preview[:200],
            "output_preview": f"Generated response for {input_preview[:50]}..."[:200],
            "span_type": "llm",
        })

    trace_end = base_time + timedelta(milliseconds=trace_duration)

    # Insert trace
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO traces (trace_id, trace_hash_id, start_time, end_time, duration,
                              total_cost, total_tokens, status, user_id, agent_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            trace_id, trace_hash_id, base_time, trace_end, trace_duration,
            total_cost, total_tokens, "completed", user_id, agent["agent_id"]
        ))

        # Insert spans
        for span in spans_data:
            cur.execute("""
                INSERT INTO spans (span_id, trace_id, name, start_time, end_time, duration,
                                 llm_model, prompt_tokens, completion_tokens, cost, status,
                                 input_preview, output_preview, span_type)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                span["span_id"], span["trace_id"], span["name"],
                span["start_time"], span["end_time"], span["duration"],
                span["llm_model"], span["prompt_tokens"], span["completion_tokens"],
                span["cost"], span["status"], span["input_preview"],
                span["output_preview"], span["span_type"]
            ))

    return total_cost, total_tokens


def seed_data(user_id: str, days: int = 30, traces_per_day: int = 10):
    """Seed the database with test cost data."""
    print(f"\nSeeding cost data for user: {user_id}")
    print(f"  Days: {days}")
    print(f"  Traces per day: {traces_per_day}")
    print("-" * 50)

    conn = get_connection()

    try:
        # Create agents
        print("\nCreating agents...")
        agents = create_agents(conn, user_id, count=3)

        if not agents:
            print("No agents created. Using existing agents...")
            with conn.cursor() as cur:
                cur.execute("SELECT agent_id, agent_name FROM agents WHERE user_id = %s", (user_id,))
                agents = [{"agent_id": str(r[0]), "agent_name": r[1]} for r in cur.fetchall()]

            if not agents:
                print("Error: No agents found for this user. Please create an agent first.")
                return

        # Generate traces for each day
        print("\nGenerating traces and spans...")
        total_traces = 0
        total_cost = 0
        total_tokens = 0

        now = datetime.now(timezone.utc)

        for day_offset in range(days):
            day_date = now - timedelta(days=day_offset)

            # Vary the number of traces per day (simulate realistic usage)
            day_traces = random.randint(max(1, traces_per_day - 5), traces_per_day + 5)

            for trace_idx in range(day_traces):
                # Random time during the day
                hour = random.randint(8, 22)  # Business hours mostly
                minute = random.randint(0, 59)
                second = random.randint(0, 59)

                trace_time = day_date.replace(hour=hour, minute=minute, second=second)

                # Pick a random agent
                agent = random.choice(agents)

                cost, tokens = generate_trace_with_spans(conn, user_id, agent, trace_time, total_traces)
                total_traces += 1
                total_cost += cost
                total_tokens += tokens

            if (day_offset + 1) % 5 == 0:
                print(f"  Generated {day_offset + 1}/{days} days...")
                conn.commit()

        conn.commit()

        print("\n" + "=" * 50)
        print("Seeding complete!")
        print(f"  Total traces: {total_traces}")
        print(f"  Total cost: ${total_cost:.4f}")
        print(f"  Total tokens: {total_tokens:,}")
        print("=" * 50)

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        conn.close()


def main():
    if len(sys.argv) < 2:
        print("Usage: python seed_cost_data.py <user_id> [days] [traces_per_day]")
        print("\nExample:")
        print("  python seed_cost_data.py '123e4567-e89b-12d3-a456-426614174000'")
        print("  python seed_cost_data.py '123e4567-e89b-12d3-a456-426614174000' 60 20")
        sys.exit(1)

    user_id = sys.argv[1]
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    traces_per_day = int(sys.argv[3]) if len(sys.argv) > 3 else 10

    seed_data(user_id, days, traces_per_day)


if __name__ == "__main__":
    main()
