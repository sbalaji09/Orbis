import sys
import os
sys.path.append(os.path.dirname(__file__))

from db_connection import db

print("=== Verifying Data in Supabase ===\n")

# Get connection
conn = db.get_connection()

try:
    with conn.cursor() as cur:
        # Count traces
        cur.execute("SELECT COUNT(*) FROM traces")
        trace_count = cur.fetchone()[0]
        print(f"Total traces: {trace_count}")

        # Count spans
        cur.execute("SELECT COUNT(*) FROM spans")
        span_count = cur.fetchone()[0]
        print(f"Total spans: {span_count}")

        if trace_count > 0:
            print("\nLatest traces:")
            cur.execute("""
                SELECT trace_id, status, total_cost, total_tokens, start_time
                FROM traces
                ORDER BY start_time DESC
                LIMIT 5
            """)
            for row in cur.fetchall():
                print(f"  - {row[0]}: {row[1]}, cost=${row[2]}, tokens={row[3]}")

        if span_count > 0:
            print("\nLatest spans:")
            cur.execute("""
                SELECT span_id, trace_id, llm_model, cost, status
                FROM spans
                ORDER BY start_time DESC
                LIMIT 5
            """)
            for row in cur.fetchall():
                print(f"  - {row[0]}: model={row[2]}, cost=${row[3]}, status={row[4]}")

finally:
    db.return_connection(conn)

print("\n✓ Verification complete!")
