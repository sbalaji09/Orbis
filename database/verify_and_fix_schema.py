#!/usr/bin/env python3
"""
Verify and fix database schema for agents and traces tables.
Run this script to check if your database matches init.sql and fix if needed.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend.db_connection import db

def check_agents_table():
    """Check if agents table has correct schema"""
    print("\n=== Checking agents table ===")
    conn = db.get_connection()
    try:
        with conn.cursor() as cur:
            # Check if table exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'agents'
                );
            """)
            exists = cur.fetchone()[0]

            if not exists:
                print("✗ agents table does NOT exist")
                return False

            print("✓ agents table exists")

            # Check columns
            cur.execute("""
                SELECT column_name, data_type, column_default
                FROM information_schema.columns
                WHERE table_name = 'agents'
                ORDER BY ordinal_position;
            """)
            columns = cur.fetchall()
            print("\nCurrent schema:")
            for col in columns:
                print(f"  - {col[0]}: {col[1]} (default: {col[2]})")

            # Check if agent_id is auto-incrementing
            cur.execute("""
                SELECT column_default
                FROM information_schema.columns
                WHERE table_name = 'agents' AND column_name = 'agent_id';
            """)
            result = cur.fetchone()
            if result and 'nextval' in str(result[0]):
                print("\n✓ agent_id is auto-incrementing (SERIAL)")
                return True
            else:
                print("\n✗ agent_id is NOT auto-incrementing")
                print("  Expected: nextval('agents_agent_id_seq'::regclass)")
                print(f"  Got: {result[0] if result else 'NULL'}")
                return False

    finally:
        db.return_connection(conn)

def check_traces_agent_id():
    """Check if traces table has agent_id column"""
    print("\n=== Checking traces.agent_id column ===")
    conn = db.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'traces' AND column_name = 'agent_id'
                );
            """)
            exists = cur.fetchone()[0]

            if exists:
                print("✓ traces.agent_id column exists")
                return True
            else:
                print("✗ traces.agent_id column does NOT exist")
                return False

    finally:
        db.return_connection(conn)

def fix_schema():
    """Apply migration to fix schema"""
    print("\n=== Applying schema fix ===")

    migration_path = os.path.join(
        os.path.dirname(__file__),
        'migration_add_agent_id.sql'
    )

    if not os.path.exists(migration_path):
        print(f"✗ Migration file not found: {migration_path}")
        return False

    print(f"Reading migration from: {migration_path}")
    with open(migration_path, 'r') as f:
        migration_sql = f.read()

    conn = db.get_connection()
    try:
        with conn.cursor() as cur:
            print("Executing migration...")
            cur.execute(migration_sql)
            conn.commit()
            print("✓ Migration applied successfully")
            return True
    except Exception as e:
        conn.rollback()
        print(f"✗ Migration failed: {e}")
        return False
    finally:
        db.return_connection(conn)

def main():
    print("="*60)
    print("Orbis Database Schema Verification")
    print("="*60)

    try:
        agents_ok = check_agents_table()
        traces_ok = check_traces_agent_id()

        print("\n" + "="*60)
        print("Summary:")
        print("="*60)

        if agents_ok and traces_ok:
            print("✓ Schema is correct! Ready to run tests.")
            return 0
        else:
            print("✗ Schema issues found.")
            print("\nIssues:")
            if not agents_ok:
                print("  - agents table schema is incorrect")
            if not traces_ok:
                print("  - traces table missing agent_id column")

            response = input("\nAttempt automatic fix? (y/n): ")
            if response.lower() == 'y':
                if fix_schema():
                    print("\n✓ Schema fixed! Please re-run this script to verify.")
                    return 0
                else:
                    print("\n✗ Automatic fix failed.")
                    print("\nManual fix required:")
                    print("  1. Open Supabase SQL Editor")
                    print("  2. Run: database/migration_add_agent_id.sql")
                    return 1
            else:
                print("\nManual fix required:")
                print("  1. Open Supabase SQL Editor")
                print("  2. Run: database/migration_add_agent_id.sql")
                return 1

    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
