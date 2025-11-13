import os
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from psycopg2.pool import SimpleConnectionPool
from dotenv import load_dotenv
from typing import Dict, List, Optional
from uuid import UUID

load_dotenv()

# this class is the connection to SupabaseDB
class SupabaseDB:

    # init the connection pool to Supabase
    def __init__(self):
        connection_string = os.getenv('DIRECT_CONNECTION')

        if not connection_string:
            raise ValueError("DIRECT_CONNECTION not found in environment variables")

        # create connection pool
        self.pool = SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=connection_string
        )

        print(f"✓ Connected to Supabase PostgreSQL")

    # get a connection from the pool
    def get_connection(self):
        
        return self.pool.getconn()

    # return a specific connection to the pool
    def return_connection(self, conn):
        self.pool.putconn(conn)

    # insert a specific trace into the database
    """
    trace_data: dictionary with trace information
        - trace_id (UUID): Trace identifier
        - user_id (UUID): User who created the trace
        - start_time (str): ISO timestamp
        - status (str): 'running' or 'completed'
    """
    def insert_trace(self, trace_data: Dict) -> str:
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                sql = """
                    INSERT INTO traces (
                        trace_id, user_id, start_time, status,
                        total_cost, total_tokens
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s
                    )
                    RETURNING trace_id
                """
                cur.execute(sql, (
                    trace_data.get('trace_id'),
                    trace_data.get('user_id'),
                    trace_data.get('start_time'),
                    trace_data.get('status', 'running'),
                    trace_data.get('total_cost', 0),
                    trace_data.get('total_tokens', 0)
                ))
                result = cur.fetchone()
                conn.commit()
                return str(result[0])
        except Exception as e:
            conn.rollback()
            raise Exception(f"Failed to insert trace: {e}")
        finally:
            self.return_connection(conn)

    # updates the trace with the values after finishing the trace span
    """
    trace_id: UUID of the trace
        update_data: Dictionary with fields to update
            - end_time (str): ISO timestamp
            - duration (float): Total duration in seconds
            - total_cost (float): Total cost
            - total_tokens (int): Total tokens
            - status (str): 'completed' or 'error'
    """
    def update_trace(self, trace_id: str, update_data: Dict) -> bool:
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                set_clauses = []
                values = []

                for key, value in update_data.items():
                    set_clauses.append(f"{key} = %s")
                    values.append(value)

                values.append(trace_id)  # For WHERE clause

                sql = f"""
                    UPDATE traces
                    SET {', '.join(set_clauses)}
                    WHERE trace_id = %s
                """
                cur.execute(sql, values)
                conn.commit()
                return True
        except Exception as e:
            conn.rollback()
            raise Exception(f"Failed to update trace: {e}")
        finally:
            self.return_connection(conn)

    # insert a new span into the database using a dict that contains span information
    def insert_span(self, span_data: Dict) -> str:
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                sql = """
                    INSERT INTO spans (
                        span_id, trace_id, parent_span_ids, name,
                        start_time, end_time, duration,
                        input_preview, input_blob_url,
                        output_preview, output_blob_url,
                        llm_model, prompt_tokens, completion_tokens,
                        cost, status, error_message
                    ) VALUES (
                        %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s,
                        %s, %s,
                        %s, %s, %s,
                        %s, %s, %s
                    )
                    RETURNING span_id
                """
                cur.execute(sql, (
                    span_data.get('span_id'),
                    span_data.get('trace_id'),
                    span_data.get('parent_span_ids', []),
                    span_data.get('name'),
                    span_data.get('start_time'),
                    span_data.get('end_time'),
                    span_data.get('duration'),
                    span_data.get('input_preview'),
                    span_data.get('input_blob_url'),
                    span_data.get('output_preview'),
                    span_data.get('output_blob_url'),
                    span_data.get('llm_model'),
                    span_data.get('prompt_tokens'),
                    span_data.get('completion_tokens'),
                    span_data.get('cost'),
                    span_data.get('status'),
                    span_data.get('error_message')
                ))
                result = cur.fetchone()
                conn.commit()
                return str(result[0])
        except Exception as e:
            conn.rollback()
            raise Exception(f"Failed to insert span: {e}")
        finally:
            self.return_connection(conn)

    # returns the id for a specific trace
    def get_trace_by_id(self, trace_id: str) -> Optional[Dict]:
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                sql = "SELECT * FROM traces WHERE trace_id = %s"
                cur.execute(sql, (trace_id,))
                result = cur.fetchone()
                return dict(result) if result else None
        finally:
            self.return_connection(conn)

    # gets all the spans that correspond to a certain trace
    def get_spans_by_trace(self, trace_id: str) -> List[Dict]:
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                sql = """
                    SELECT * FROM spans
                    WHERE trace_id = %s
                    ORDER BY start_time ASC
                """
                cur.execute(sql, (trace_id,))
                results = cur.fetchall()
                return [dict(row) for row in results]
        finally:
            self.return_connection(conn)

    # closes all the connections in the pool
    def close(self):
        self.pool.closeall()
        print("✓ Database connections closed")

db = SupabaseDB()


# Test the connection
if __name__ == "__main__":
    print("\n=== Testing Supabase Connection ===\n")

    try:
        # Test connection
        print("✓ Database connection successful!")

        # You can add more tests here once your schema is set up

    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        print("\nMake sure:")
        print("1. Supabase project is running")
        print("2. DIRECT_CONNECTION is set in .env")
        print("3. Database schema is created (run init.sql)")

    print("\n=== Test Complete ===\n")
