from datetime import datetime, timedelta, timezone
import json
import os
import re
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from psycopg2.pool import SimpleConnectionPool
from dotenv import load_dotenv
from typing import Dict, List, Optional, Any
from uuid import UUID
from psycopg2.extras import execute_values

load_dotenv()

# this class is the connection to SupabaseDB


class SupabaseDB:

    # init the connection pool to Supabase
    def __init__(self):
        connection_string = os.getenv('DIRECT_CONNECTION')

        if not connection_string:
            raise ValueError(
                "DIRECT_CONNECTION not found in environment variables")

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
        - agent_id (UUID, optional): Agent identifier
        - start_time (str): ISO timestamp
        - status (str): 'running' or 'completed'
    """

    def insert_trace(self, trace_data: Dict) -> str:
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                # Build dynamic SQL based on whether agent_id is provided
                if trace_data.get('agent_id') is not None:
                    sql = """
                        INSERT INTO traces (
                            trace_id, trace_hash_id, user_id, agent_id, start_time, status,
                            total_cost, total_tokens
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s
                        )
                        ON CONFLICT (trace_id) DO NOTHING
                        RETURNING trace_id
                    """
                    cur.execute(sql, (
                        trace_data.get('trace_id'),
                        trace_data.get('trace_hash_id'),
                        trace_data.get('user_id'),
                        trace_data.get('agent_id'),
                        trace_data.get('start_time'),
                        trace_data.get('status', 'running'),
                        trace_data.get('total_cost', 0),
                        trace_data.get('total_tokens', 0)
                    ))
                else:
                    sql = """
                        INSERT INTO traces (
                            trace_id, trace_hash_id, user_id, start_time, status,
                            total_cost, total_tokens
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s
                        )
                        ON CONFLICT (trace_id) DO NOTHING
                        RETURNING trace_id
                    """
                    cur.execute(sql, (
                        trace_data.get('trace_id'),
                        trace_data.get('trace_hash_id'),
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
                        cost, status, error_message, prompt_id,
                        prompt_name, prompt_version, prompt_hash,
                        span_type, tool_metadata,
                        http_method, http_url, http_status_code, api_name,
                        db_type, db_operation, db_query,
                        software_name, software_type,
                        cli_command, cli_exit_code, cli_stdout, cli_stderr,
                        tool_name, tool_category
                    ) VALUES (
                        %s, %s, %s::uuid[], %s,
                        %s, %s, %s,
                        %s, %s,
                        %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s,
                        %s, %s, %s, %s,
                        %s, %s
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
                    span_data.get('error_message'),
                    span_data.get('prompt_id'),
                    span_data.get('prompt_name'),
                    span_data.get('prompt_version'),
                    span_data.get('prompt_hash'),
                    # Tool tracking fields
                    span_data.get('span_type', 'llm'),
                    json.dumps(span_data.get('tool_metadata')) if span_data.get(
                        'tool_metadata') else None,
                    span_data.get('http_method'),
                    span_data.get('http_url'),
                    span_data.get('http_status_code'),
                    span_data.get('api_name'),
                    span_data.get('db_type'),
                    span_data.get('db_operation'),
                    span_data.get('db_query'),
                    span_data.get('software_name'),
                    span_data.get('software_type'),
                    span_data.get('cli_command'),
                    span_data.get('cli_exit_code'),
                    span_data.get('cli_stdout'),
                    span_data.get('cli_stderr'),
                    span_data.get('tool_name'),
                    span_data.get('tool_category')
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

                # Convert PostgreSQL array format to Python lists
                spans = []
                for row in results:
                    span = dict(row)
                    # Parse parent_span_ids from PostgreSQL array format "{id1,id2}" to Python list
                    if 'parent_span_ids' in span and isinstance(span['parent_span_ids'], str):
                        # Remove curly braces and split by comma
                        array_str = span['parent_span_ids'].strip('{}')
                        if array_str:
                            span['parent_span_ids'] = array_str.split(',')
                        else:
                            span['parent_span_ids'] = []
                    elif 'parent_span_ids' not in span or span['parent_span_ids'] is None:
                        span['parent_span_ids'] = []
                    spans.append(span)

                return spans
        finally:
            self.return_connection(conn)

    # gets all the traces that correspond to a certain agent
    def get_traces_by_agentid(self, agent_id: str, user_id: str) -> List[Dict]:
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                sql = """
                    SELECT * FROM traces
                    WHERE agent_id = %s
                    AND user_id = %s
                    ORDER BY start_time ASC
                """
                cur.execute(sql, (agent_id, user_id))
                results = cur.fetchall()
                return [dict(row) for row in results]
        finally:
            self.return_connection(conn)

    def get_traces_by_user(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get all traces for a user with pagination"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                sql = """
                    SELECT * FROM traces
                    WHERE user_id = %s
                    ORDER BY start_time DESC
                    LIMIT %s OFFSET %s
                """
                cur.execute(sql, (user_id, limit, offset))
                results = cur.fetchall()
                return [dict(row) for row in results]
        finally:
            self.return_connection(conn)

    def get_traces_with_stats(self, user_id: str, limit: int = 50, offset: int = 0, status_filter: str = None) -> List[Dict]:
        """
        Get traces for a user with enhanced stats calculated from spans.
        This provides accurate duration, cost, and status information.
        """
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                sql = """
                WITH trace_stats AS (
                    SELECT 
                        t.trace_id,
                        t.user_id,
                        t.agent_id,
                        t.trace_hash_id,
                        t.start_time,
                        t.end_time,
                        COALESCE(
                            EXTRACT(EPOCH FROM (MAX(s.end_time) - MIN(s.start_time))),
                            EXTRACT(EPOCH FROM (t.end_time - t.start_time)),
                            0
                        ) as duration,
                        COALESCE(SUM(s.cost), t.total_cost, 0) as total_cost,
                        COUNT(s.span_id) as span_count,
                        MAX(CASE WHEN s.parent_span_ids = '{}' THEN s.name ELSE NULL END) as root_span_name,
                        CASE 
                            WHEN t.status = 'error' THEN 'error'
                            WHEN BOOL_OR(s.status = 'error') THEN 'error'
                            WHEN t.status = 'completed' THEN 'success'
                            ELSE t.status
                        END as status
                    FROM traces t
                    LEFT JOIN spans s ON t.trace_id = s.trace_id
                    WHERE t.user_id = %s
                    GROUP BY t.trace_id, t.user_id, t.agent_id, t.trace_hash_id, t.start_time, t.end_time, t.total_cost, t.status
                )
                SELECT 
                    trace_id,
                    user_id,
                    agent_id,
                    trace_hash_id,
                    root_span_name,
                    start_time,
                    start_time as created_at,
                    duration,
                    total_cost,
                    span_count,
                    status
                FROM trace_stats
                WHERE 1=1
                """

                params = [user_id]

                if status_filter:
                    sql += " AND status = %s"
                    params.append(status_filter)

                sql += " ORDER BY start_time DESC LIMIT %s OFFSET %s"
                params.extend([limit, offset])

                cur.execute(sql, params)
                results = cur.fetchall()

                traces = []
                for row in results:
                    trace = dict(row)

                    # Convert ALL datetime objects to ISO strings
                    # Use list() to avoid dict size change during iteration
                    for key, value in list(trace.items()):
                        if isinstance(value, datetime.datetime):
                            trace[key] = value.isoformat()

                    traces.append(trace)

                if traces:
                    print(
                        f"DEBUG: Final trace[0] created_at type: {type(traces[0]['created_at'])}")
                return traces
        except Exception as e:
            print(f"Error in get_traces_with_stats: {e}")
            raise
        finally:
            self.return_connection(conn)

    def get_user_metrics(self, user_id: str) -> Dict:
        """Get aggregate metrics for a user"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get aggregated metrics
                sql = """
                    SELECT
                        COUNT(*) as total_traces,
                        COALESCE(SUM(total_cost), 0) as total_cost,
                        COALESCE(SUM(total_tokens), 0) as total_tokens,
                        COALESCE(SUM(duration), 0) as total_duration,
                        COALESCE(AVG(total_cost), 0) as avg_cost_per_trace
                    FROM traces
                    WHERE user_id = %s
                """
                cur.execute(sql, (user_id,))
                trace_metrics = dict(cur.fetchone())

                # Get total spans count
                cur.execute(
                    "SELECT COUNT(*) as total_spans FROM spans s JOIN traces t ON s.trace_id = t.trace_id WHERE t.user_id = %s", (user_id,))
                span_count = cur.fetchone()['total_spans']

                trace_metrics['total_spans'] = span_count
                return trace_metrics
        finally:
            self.return_connection(conn)

    def get_span_by_id(self, span_id: str) -> Optional[Dict]:
        """Get a specific span by ID"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                sql = "SELECT * FROM spans WHERE span_id = %s"
                cur.execute(sql, (span_id,))
                result = cur.fetchone()

                if not result:
                    return None

                span = dict(result)
                # Parse parent_span_ids from PostgreSQL array format to Python list
                if 'parent_span_ids' in span and isinstance(span['parent_span_ids'], str):
                    array_str = span['parent_span_ids'].strip('{}')
                    if array_str:
                        span['parent_span_ids'] = array_str.split(',')
                    else:
                        span['parent_span_ids'] = []
                elif 'parent_span_ids' not in span or span['parent_span_ids'] is None:
                    span['parent_span_ids'] = []

                return span
        finally:
            self.return_connection(conn)

    def get_recent_traces(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get the most recent traces for a user"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                sql = """
                    SELECT * FROM traces
                    WHERE user_id = %s
                    ORDER BY start_time DESC
                    LIMIT %s
                """
                cur.execute(sql, (user_id, limit))
                results = cur.fetchall()
                return [dict(row) for row in results]
        finally:
            self.return_connection(conn)

    def get_trace_summary(self, trace_id: str) -> Optional[Dict]:
        """Get a trace with aggregated span information"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get the trace
                trace = self.get_trace_by_id(trace_id)
                if not trace:
                    return None

                # Get span count
                cur.execute(
                    "SELECT COUNT(*) as span_count FROM spans WHERE trace_id = %s", (trace_id,))
                span_count = cur.fetchone()['span_count']

                # Get unique models used
                cur.execute(
                    "SELECT DISTINCT llm_model FROM spans WHERE trace_id = %s AND llm_model IS NOT NULL", (trace_id,))
                models = [row['llm_model'] for row in cur.fetchall()]

                # Get error count
                cur.execute(
                    "SELECT COUNT(*) as error_count FROM spans WHERE trace_id = %s AND status != 'success'", (trace_id,))
                error_count = cur.fetchone()['error_count']

                # Add summary info to trace
                trace['span_count'] = span_count
                trace['models_used'] = models
                trace['error_count'] = error_count

                return trace
        finally:
            self.return_connection(conn)

    def search_traces(self, user_id: str, filters: Dict) -> List[Dict]:
        """Search traces with filters"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Build WHERE clauses dynamically based on filters
                where_clauses = ["user_id = %s"]
                params = [user_id]

                if filters.get('status'):
                    where_clauses.append("status = %s")
                    params.append(filters['status'])

                if filters.get('min_cost') is not None:
                    where_clauses.append("total_cost >= %s")
                    params.append(filters['min_cost'])

                if filters.get('max_cost') is not None:
                    where_clauses.append("total_cost <= %s")
                    params.append(filters['max_cost'])

                if filters.get('start_date'):
                    where_clauses.append("start_time >= %s")
                    params.append(filters['start_date'])

                if filters.get('end_date'):
                    where_clauses.append("start_time <= %s")
                    params.append(filters['end_date'])

                # Join with spans if filtering by model
                if filters.get('model'):
                    sql = f"""
                        SELECT DISTINCT t.* FROM traces t
                        JOIN spans s ON t.trace_id = s.trace_id
                        WHERE {' AND '.join(where_clauses)}
                        AND s.llm_model = %s
                        ORDER BY t.start_time DESC
                    """
                    params.append(filters['model'])
                else:
                    sql = f"""
                        SELECT * FROM traces
                        WHERE {' AND '.join(where_clauses)}
                        ORDER BY start_time DESC
                    """

                cur.execute(sql, params)
                results = cur.fetchall()
                return [dict(row) for row in results]
        finally:
            self.return_connection(conn)

    def agent_name_exists(self, user_id: str, agent_name: str) -> bool:
        """Check if an agent with the given name already exists for this user"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                sql = """
                    SELECT 1 FROM agents
                    WHERE user_id = %s AND agent_name = %s
                    LIMIT 1
                """
                cur.execute(sql, (user_id, agent_name))
                return cur.fetchone() is not None
        finally:
            self.return_connection(conn)

    def insert_agent(self, user_id: str, agent_name: str, api_key: str) -> str:
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                sql = """
                    INSERT INTO agents (
                        user_id,
                        agent_name,
                        api_key
                    ) VALUES (
                        %s,
                        %s,
                        %s
                    )
                    RETURNING agent_id
                """
                cur.execute(sql, (
                    user_id,
                    agent_name,
                    api_key
                ))
                result = cur.fetchone()
                conn.commit()
                return f"AI agent creation successful with agent id: {result[0]}"
        except Exception as e:
            conn.rollback()
            raise Exception(f"Failed to insert agent: {e}")
        finally:
            self.return_connection(conn)

    def get_agents_by_userid(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                sql = """
                    SELECT * FROM agents
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """
                cur.execute(sql, (user_id, limit, offset))
                results = cur.fetchall()
                return [dict(row) for row in results]
        finally:
            self.return_connection(conn)

    def get_all_agents_for_auth(self) -> List[Dict]:
        """Get all agents with their hashed API keys for authentication verification"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                sql = """
                    SELECT agent_id, user_id, api_key FROM agents
                    WHERE api_key IS NOT NULL
                """
                cur.execute(sql)
                results = cur.fetchall()
                return [dict(row) for row in results]
        finally:
            self.return_connection(conn)

    def delete_agent(self, agent_id: str, user_id: str):
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # First get the API key before deleting
                sql_get = """
                    SELECT api_key FROM agents
                    WHERE user_id = %s AND agent_id = %s
                """
                cur.execute(sql_get, (user_id, agent_id))
                result = cur.fetchone()
                api_key = result['api_key'] if result else None

                sql = """
                    DELETE FROM agents
                    WHERE user_id = %s
                    AND agent_id = %s
                """
                cur.execute(sql, (user_id, agent_id))
                conn.commit()
                return {"message": "Successfully deleted agent", "api_key": api_key}
        finally:
            self.return_connection(conn)

    # insert multiple spans in a single query for batch processing
    # includes streaming metrics: is_streaming, time_to_first_token, tokens_per_second
    def insert_spans_batch(self, spans: list) -> list:
        if not spans:
            return []

        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                # query for batch inserting
                query = """
                    INSERT INTO spans (
                        span_id, trace_id, parent_span_ids, name, start_time, end_time,
                        duration, input_preview, input_blob_url, output_preview,
                        output_blob_url, llm_model, prompt_tokens, completion_tokens,
                        cost, status, error_message,
                        is_streaming, time_to_first_token, tokens_per_second,
                        prompt_id, prompt_name, prompt_version, prompt_hash,
                        span_type, tool_metadata,
                        http_method, http_url, http_status_code, api_name,
                        db_type, db_operation, db_query,
                        software_name, software_type,
                        cli_command, cli_exit_code, cli_stdout, cli_stderr,
                        tool_name, tool_category
                    ) VALUES %s
                    RETURNING span_id
                """

                # convert the list of dicts into a list of tuples
                values = [
                    (
                        span['span_id'], span['trace_id'], span.get(
                            'parent_span_ids', []),
                        span['name'], span['start_time'], span['end_time'],
                        span['duration'], span['input_preview'], span['input_blob_url'],
                        span['output_preview'], span['output_blob_url'], span['llm_model'],
                        span['prompt_tokens'], span['completion_tokens'], span['cost'],
                        span['status'], span['error_message'],
                        span.get('is_streaming', False),
                        span.get('time_to_first_token'),
                        span.get('tokens_per_second'),
                        span.get('prompt_id'),
                        span.get('prompt_name'),
                        span.get('prompt_version'),
                        span.get('prompt_hash'),
                        # Tool tracking fields
                        span.get('span_type', 'llm'),
                        json.dumps(span.get('tool_metadata')) if span.get(
                            'tool_metadata') else None,
                        span.get('http_method'),
                        span.get('http_url'),
                        span.get('http_status_code'),
                        span.get('api_name'),
                        span.get('db_type'),
                        span.get('db_operation'),
                        span.get('db_query'),
                        span.get('software_name'),
                        span.get('software_type'),
                        span.get('cli_command'),
                        span.get('cli_exit_code'),
                        span.get('cli_stdout'),
                        span.get('cli_stderr'),
                        span.get('tool_name'),
                        span.get('tool_category')
                    )
                    for span in spans
                ]

                # Use explicit UUID casting in template (41 values total)
                template = "(%s, %s, %s::uuid[], %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
                execute_values(cur, query, values,
                               template=template, fetch=True)

                conn.commit()
                # Return the span IDs from input, not from DB
                return [span['span_id'] for span in spans]
        except Exception as e:
            conn.rollback()
            raise Exception(f"Failed to batch insert spans: {e}")
        finally:
            self.return_connection(conn)

    def check_identical_hash(self, hash_val: str, agent_id: str) -> Optional[bool]:
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = """
                    SELECT * FROM prompt_versions
                    WHERE prompt_hash = %s
                    AND agent_id = %s
                """
                cur.execute(query, (hash_val, agent_id))

                result = cur.fetchone()
                if not result:
                    return None

                span = dict(result)
                if len(span) != 0:
                    return True
                return False
        except Exception as e:
            conn.rollback()
            raise Exception(f"Failed to check for identical hash: {e}")
        finally:
            self.return_connection(conn)

    def get_prompt_by_hash(self, hash_val: str, agent_id: str) -> Optional[dict]:
        """Get prompt version by hash - returns the prompt data"""
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = """
                    SELECT * FROM prompt_versions
                    WHERE prompt_hash = %s
                    AND agent_id = %s
                    ORDER BY created_at DESC
                    LIMIT 1
                """
                cur.execute(query, (hash_val, agent_id))
                result = cur.fetchone()
                return dict(result) if result else None
        finally:
            self.return_connection(conn)

    def max_version_prompt_number(self, name: str) -> int:
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT COALESCE(MAX(version_number), 0) + 1 
                    FROM prompt_versions 
                    WHERE name = %s
                """

                cur.execute(query, (
                    name,
                ))
                result = cur.fetchone()
                conn.commit()
                return {"Version number": result}
        except Exception as e:
            conn.rollback()
            raise Exception(f"Failed to query largest prompt number")
        finally:
            self.return_connection(conn)

    def insert_prompt_row(self, name: str, version_number: int, s3_url: str,
                          agent_id: str, prompt_hash: str, content_preview: str,
                          parent_version_id: str = None):
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                query = """
                    INSERT INTO prompt_versions (
                        prompt_id,
                        name,
                        version_number,
                        s3_url,
                        created_at,
                        is_active,
                        agent_id,
                        prompt_hash,
                        content_preview,
                        metadata,
                        parent_version_id
                    ) VALUES (
                        gen_random_uuid(),  -- prompt_id
                        %s,                 -- name
                        %s,                 -- version_number
                        %s,                 -- s3_url
                        NOW(),              -- created_at
                        TRUE,               -- is_active
                        %s,                 -- agent_id
                        %s,                 -- prompt_hash
                        %s,                 -- content_preview
                        '{}'::jsonb,        -- metadata (empty by default)
                        %s                  -- parent_version_id
                    )
                    RETURNING
                        prompt_id,
                        name,
                        version_number,
                        s3_url,
                        created_at,
                        is_active,
                        agent_id,
                        prompt_hash,
                        content_preview,
                        metadata,
                        parent_version_id;
                """

                cur.execute(
                    query,
                    (name, version_number, s3_url, agent_id,
                     prompt_hash, content_preview, parent_version_id)
                )
                created_prompt = cur.fetchone()
                conn.commit()
                columns = [
                    "prompt_id", "name", "version_number", "s3_url",
                    "created_at", "is_active", "agent_id", "prompt_hash",
                    "content_preview", "metadata", "parent_version_id"
                ]

            return dict(zip(columns, created_prompt))
        except Exception as e:
            conn.rollback()
            raise Exception(f"Failed to insert row into prompt versions")
        finally:
            self.return_connection(conn)

    # gets all the propmt families with their latest versions and version counts
    def get_all_prompt_families(self, user_id: str) -> List[Dict]:
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:  # Use RealDictCursor
                query = """
                    SELECT
                        pv.name,
                        pv.agent_id,
                        a.agent_name,
                        COUNT(*) as version_count,
                        MAX(pv.version_number) as latest_version,
                        MAX(pv.created_at) as last_updated
                    FROM prompt_versions pv
                    LEFT JOIN agents a ON pv.agent_id = a.agent_id
                    WHERE a.user_id = %s OR pv.agent_id IS NULL OR a.user_id IS NULL
                    GROUP BY pv.name, pv.agent_id, a.agent_name
                    ORDER BY MAX(pv.created_at) DESC
                """
                cur.execute(query, (user_id,))
                return cur.fetchall()  # fetchall() will return a list of dictionaries
        except Exception as e:
            conn.rollback()
            raise Exception(f"Failed to get prompt families: {str(e)}")
        finally:
            self.return_connection(conn)

    def get_prompts_by_agent_id(self, agent_id: str) -> List[Dict]:
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT * from prompt_versions
                    WHERE agent_id = %s
                """
                cur.execute(query, (agent_id,))
                rows = cur.fetchall()

            prompts = [dict(row) for row in rows]

            # group prompts by name
            families = {}
            for p in prompts:
                name = p["name"]
                if name not in families:
                    families[name] = {
                        "name": name,
                        "version_count": 0,
                        "versions": []
                    }

                families[name]["versions"].append(p)
                families[name]["version_count"] += 1

            # convert the mapping to a list
            return list(families.values())
        except Exception as e:
            conn.rollback()
            raise Exception(f"Failed to get prompts by agent id")
        finally:
            self.return_connection(conn)

    def get_s3url_prompt(self, name: str, version_number: int = None) -> List[Dict]:
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                if version_number:
                    query = """
                        SELECT s3_url FROM prompt_versions
                        WHERE name = %s
                        AND version_number = %s
                    """
                    cur.execute(
                        query,
                        (name, version_number)
                    )
                    result = cur.fetchone()
                    conn.commit()
                    return {"S3 URL": result}
                else:
                    query = """
                        SELECT s3_url FROM prompt_versions
                        WHERE prompt_id = %s
                    """
                    cur.execute(
                        query,
                        (name)
                    )
                    result = cur.fetchone()
                    conn.commit()
                    return {"S3 URL": result}
        except Exception as e:
            raise Exception(f"Failed to get s3URL by prompt id")
        finally:
            self.return_connection(conn)

    def get_prompts_versions(self, name: str) -> List[Dict]:
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT version_number, metadata, created_at, is_active, prompt_hash, prompt_id
                    FROM prompt_versions
                    WHERE name = %s
                    ORDER BY version_number DESC
                """
                cur.execute(
                    query,
                    (name,)
                )
                rows = cur.fetchall()

            versions = [
                {
                    "version_number": row[0],
                    "metadata": row[1],
                    "created_at": row[2],
                    "is_active": row[3],
                    "prompt_hash": row[4],
                    "prompt_id": row[5]
                }
                for row in rows
            ]
            return versions
        except Exception as e:
            raise Exception(f"Failed to get all prompt versions")
        finally:
            self.return_connection(conn)

    def get_prompt_version(self, name: str, version_number: int) -> List[Dict]:
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT prompt_id, s3_url, agent_id, prompt_hash, content_preview, metadata, parent_version_id
                    FROM prompt_versions
                    WHERE name = %s
                    AND version_number = %s
                """
                cur.execute(
                    query,
                    (name, version_number,)
                )
                row = cur.fetchone()

            if not row:
                return None

            return {
                "prompt_id": row[0],
                "s3_url": row[1],
                "agent_id": row[2],
                "prompt_hash": row[3],
                "content_preview": row[4],
                "metadata": row[5],
                "parent_version_id": row[6],
            }

        except Exception as e:
            raise Exception(f"Failed to get prompt version")
        finally:
            self.return_connection(conn)

    def deactivate_version(self, name: str, version_number: int) -> bool:
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                query = """
                    UPDATE prompt_versions
                    SET is_active = False
                    WHERE name = %s
                    AND version_number = %s
                """
                cur.execute(
                    query,
                    (name, version_number)
                )
            return "sucessful"
        except Exception as e:
            raise Exception(f"Failed to get all prompt versions")
        finally:
            self.return_connection(conn)

    def get_prompt_analytics(self, prompt_name: str) -> List[Dict[str, Any]]:
        """
        Get consolidated analytics for all versions of a prompt family.
        Returns trace count, avg cost, avg latency, and error rate per version.
        """
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT
                        pv.prompt_id,
                        pv.name,
                        pv.version_number,
                        COUNT(DISTINCT s.trace_id) AS trace_count,
                        COALESCE(AVG(s.cost), 0) AS avg_cost,
                        COALESCE(AVG(s.duration) / 1000.0, 0) AS avg_latency,
                        COUNT(DISTINCT CASE WHEN s.error_message IS NOT NULL THEN s.trace_id END) AS error_traces,
                        ROUND(
                            COUNT(DISTINCT CASE WHEN s.error_message IS NOT NULL THEN s.trace_id END)::NUMERIC
                            / NULLIF(COUNT(DISTINCT s.trace_id), 0) * 100, 2
                        ) AS error_rate_pct
                    FROM prompt_versions pv
                    LEFT JOIN spans s ON s.prompt_id = pv.prompt_id
                    WHERE pv.name = %s
                    GROUP BY pv.prompt_id, pv.name, pv.version_number
                    ORDER BY pv.version_number DESC;
                """
                cur.execute(query, (prompt_name,))
                rows = cur.fetchall()

                # Convert rows to dicts using cursor description
                col_names = [desc[0] for desc in cur.description]
                return [dict(zip(col_names, row)) for row in rows]
        except Exception as e:
            raise Exception(f"Failed to get prompt analytics: {e}")
        finally:
            self.return_connection(conn)

    def get_content_by_promptid(self, prompt_id: str) -> tuple | None:
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT s3_url
                    FROM prompt_versions
                    WHERE prompt_id = %s
                """
                cur.execute(query, (prompt_id,))
                row = cur.fetchone()

            return row
        except Exception as e:
            raise Exception(f"Failed to get prompt analytics: {e}")
        finally:
            self.return_connection(conn)

    # gets analytics for two versions of a prompt
    def get_prompt_analytics_for_prompt_ids(self, prompt_id1: str, prompt_id2: str) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT
                        pv.prompt_id,
                        pv.name,
                        pv.version_number,
                        COUNT(DISTINCT s.trace_id) AS trace_count,
                        COALESCE(AVG(s.cost), 0) AS avg_cost,
                        COALESCE(AVG(s.duration) / 1000.0, 0) AS avg_latency,
                        COUNT(DISTINCT CASE WHEN s.error_message IS NOT NULL THEN s.trace_id END) AS error_traces,
                        ROUND(
                            COUNT(DISTINCT CASE WHEN s.error_message IS NOT NULL THEN s.trace_id END)::NUMERIC
                            / NULLIF(COUNT(DISTINCT s.trace_id), 0) * 100, 2
                        ) AS error_rate_pct
                    FROM prompt_versions pv
                    LEFT JOIN spans s ON s.prompt_id = pv.prompt_id
                    WHERE pv.prompt_id IN (%s, %s)
                    GROUP BY pv.prompt_id, pv.name, pv.version_number
                    ORDER BY pv.version_number DESC;
                """
                cur.execute(query, (prompt_id1, prompt_id2))
                rows = cur.fetchall()

            # Convert rows to dicts using cursor description
            col_names = [desc[0] for desc in cur.description]
            return [dict(zip(col_names, row)) for row in rows]
        except Exception as e:
            raise Exception(f"Failed to get prompt analytics: {e}")
        finally:
            self.return_connection(conn)

    def get_output_preview(self, prompt_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT output_preview, output_blob_url, cost, duration, error_message
                    FROM spans
                    WHERE prompt_id = %s
                    AND output_preview IS NOT NULL
                    ORDER BY start_time DESC
                    LIMIT %s
                """
                cur.execute(query, (prompt_id, limit))
                rows = cur.fetchall()

            col_names = [desc[0] for desc in cur.description]
            return [dict(zip(col_names, row)) for row in rows]
        except Exception as e:
            raise Exception(f"Failed to get prompt analytics: {e}")
        finally:
            self.return_connection(conn)
    
    def get_cost_summary_by_user(self, user_id: str, period: str) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        try:
            now = datetime.now(datetime.timezone.utc)
            start_date = None
            end_date = None

            if not period or period.lower() == "all":
                start_date = None
                end_date = None
            else:
                period = period.strip().lower()

                range_match = re.match(r"^(\d{4}-\d{2}-\d{2})\s*:\s*(\d{4}-\d{2}-\d{2})$", period)

                # calculates the start date
                if range_match:
                    s = datetime.fromisoformat(range_match.group(1)).replace(tzinfo=timezone.utc)
                    e = datetime.fromisoformat(range_match.group(2)).replace(tzinfo=timezone.utc)

                    start_date = s
                    end_date = e + timedelta(days=1)
                elif period.endswith("d") and period[:-1].isdigit():
                    days = int(period[:-1])
                    start_date = now - timedelta(days=days)
                    end_date = now + timedelta(seconds=1)
                elif period == "month":
                    start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                    end_date = now + timedelta(seconds=1)
                elif period == "year":
                    start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
                    end_date = now + timedelta(seconds=1)
                else:
                    raise ValueError(f"Unsupported period format: {period}")

            query = """
                SELECT
                    date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day,
                    COALESCE(model, 'unknown') AS model,
                    SUM(cost)::numeric(18,6) AS total_cost,
                    COUNT(*) AS call_count
                FROM prompts
                WHERE user_id = %s
            """
            params = [user_id]

            if start_date is not None:
                query += " AND created_at >= %s"
                params.append(start_date)
            if end_date is not None:
                query += " AND created_at < %s"
                params.append(end_date)
            
            query += """
                GROUP BY day, model
                ORDER BY day DESC, model
            """


            with conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()

                # gives column names in order
                columns = [col.name for col in cur.description] if hasattr(cur, "description") else ["day", "model", "total_cost", "call_count"]

                results: List[Dict[str, Any]] = []
                for row in rows:
                    row_dict = dict(zip(columns, row))
                    day_val = row_dict.get("day")
                    if isinstance(day_val, datetime):
                        day_str = day_val.date().isoformat()
                    else:
                        try:
                            day_str = day_val.isoformat()
                        except Exception:
                            day_str = str(day_val)

                    results.append({
                        "date": day_str,
                        "model": row_dict.get("model"),
                        "total_cost": float(row_dict.get("total_cost")) if row_dict.get("total_cost") is not None else 0.0,
                        "call_count": int(row_dict.get("call_count") or 0),
                    })
            return results


        except Exception as e:
            raise Exception(f"Failed to get prompt analytics: {e}")
        finally:
            self.return_connection(conn)

    def get_cost_by_agent_by_user(self, user_id: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        try:
            try:
                start_dt = datetime.fromisoformat(start_date).replace(
                    hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
                )
                end_dt = datetime.fromisoformat(end_date).replace(
                    hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
                )
            except ValueError:
                raise ValueError("start_date and end_date must be in YYYY-MM-DD format")

            if end_dt < start_dt:
                raise ValueError("end_date must be greater than or equal to start_date")

            end_dt_exclusive = end_dt + timedelta(days=1)

            query = """
                SELECT
                    COALESCE(a.agent_name, 'unknown') AS agent,
                    COALESCE(SUM(s.cost), 0)::numeric(18,6) AS total_cost,
                    COUNT(s.span_id) AS call_count
                FROM traces t
                LEFT JOIN agents a ON t.agent_id = a.agent_id
                LEFT JOIN spans s ON t.trace_id = s.trace_id
                WHERE t.user_id = %s
                AND t.start_time >= %s
                AND t.start_time < %s
                GROUP BY a.agent_name
                ORDER BY total_cost DESC
            """
            params = [user_id, start_dt, end_dt_exclusive]
            with conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()

                columns = [col.name for col in cur.description] if hasattr(cur, "description") else [
                    "agent", "total_cost", "call_count"
                ]

                results: List[Dict[str, Any]] = []
                for row in rows:
                    row_dict = dict(zip(columns, row))
                    results.append({
                        "agent": row_dict.get("agent"),
                        "total_cost": float(row_dict.get("total_cost") or 0.0),
                        "call_count": int(row_dict.get("call_count") or 0),
                    })

                return results
        except Exception as e:
            raise Exception(f"Failed to get cost by agent: {e}")
        finally:
            self.return_connection(conn)
    
    def get_cost_by_model(self, user_id: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        try:
            try:
                start_dt = datetime.fromisoformat(start_date).replace(
                    hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
                )
                end_dt = datetime.fromisoformat(end_date).replace(
                    hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
                )
            except ValueError:
                raise ValueError("start_date and end_date must be in YYYY-MM-DD format")

            if end_dt < start_dt:
                raise ValueError("end_date must be greater than or equal to start_date")

            end_dt_exclusive = end_dt + timedelta(days=1)

            query = """
                SELECT
                    COALESCE(s.llm_model, 'unknown') AS model,
                    COALESCE(SUM(s.cost), 0)::numeric(18,6) AS total_cost,
                    COUNT(s.span_id) AS call_count
                FROM traces t
                JOIN spans s ON t.trace_id = s.trace_id
                WHERE t.user_id = %s
                AND t.start_time >= %s
                AND t.start_time < %s
                GROUP BY s.llm_model
                ORDER BY total_cost DESC
            """
            params = [user_id, start_dt, end_dt_exclusive]
            with conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()

                columns = [col.name for col in cur.description] if hasattr(cur, "description") else [
                    "model", "total_cost", "call_count"
                ]

                results: List[Dict[str, Any]] = []
                for row in rows:
                    row_dict = dict(zip(columns, row))
                    results.append({
                        "model": row_dict.get("model"),
                        "total_cost": float(row_dict.get("total_cost") or 0.0),
                        "call_count": int(row_dict.get("call_count") or 0),
                    })

                return results
        except Exception as e:
            raise Exception(f"Failed to get cost by model: {e}")
        finally:
            self.return_connection(conn)


    def get_cost_trends(self, user_id: str, days: int) -> List[Dict[str, Any]]:
        if days is None or not isinstance(days, int) or days < 1:
            raise ValueError("`days` must be an integer >= 1")

        conn = self.get_connection()
        try:
            now = datetime.now(timezone.utc)

            start_dt = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)  # today's date at 00:00

            start_date_str = start_dt.date().isoformat()
            end_date_str = end_dt.date().isoformat()

            query = """
                WITH days AS (
                    SELECT generate_series(%s::date, %s::date, INTERVAL '1 day') AS day
                )
                SELECT
                    d.day::date AS day,
                    COALESCE(SUM(p.cost), 0)::numeric(18,6) AS total_cost,
                    COALESCE(COUNT(p.*), 0) AS call_count
                FROM days d
                LEFT JOIN prompts p
                ON p.user_id = %s
                AND (p.created_at AT TIME ZONE 'UTC')::date = d.day::date
                GROUP BY d.day
                ORDER BY d.day ASC
            """
            params = [start_date_str, end_date_str, user_id]

            with conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()

                columns = [col.name for col in cur.description] if hasattr(cur, "description") else ["day", "total_cost", "call_count"]

                results: List[Dict[str, Any]] = []
                for row in rows:
                    row_dict = dict(zip(columns, row))
                    day_val = row_dict.get("day")
                    # day_val should be a date object; convert to ISO string YYYY-MM-DD
                    try:
                        day_str = day_val.isoformat()
                    except Exception:
                        day_str = str(day_val)

                    total_cost = row_dict.get("total_cost")
                    call_count = row_dict.get("call_count")

                    results.append({
                        "date": day_str,
                        "total_cost": float(total_cost) if total_cost is not None else 0.0,
                        "call_count": int(call_count or 0),
                    })

            return results
        except Exception as e:
            raise Exception(f"Failed to get cost by model: {e}")
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
