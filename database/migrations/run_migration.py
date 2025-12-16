#!/usr/bin/env python3
"""
Run database migration for tool tracking columns
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Run the tool tracking migration"""

    # Get database connection string
    connection_string = os.getenv('DIRECT_CONNECTION')

    if not connection_string:
        print("❌ Error: DIRECT_CONNECTION not found in environment variables")
        print("Make sure you have a .env file with DIRECT_CONNECTION set")
        sys.exit(1)

    # Read migration SQL
    migration_file = os.path.join(
        os.path.dirname(__file__),
        '001_add_tool_tracking_columns.sql'
    )

    print(f"📂 Reading migration file: {migration_file}")

    with open(migration_file, 'r') as f:
        migration_sql = f.read()

    # Connect to database
    print(f"🔌 Connecting to database...")

    try:
        conn = psycopg2.connect(connection_string)
        cursor = conn.cursor()

        print("✓ Connected to database")

        # Run migration
        print("🚀 Running migration...")
        cursor.execute(migration_sql)
        conn.commit()

        print("✅ Migration completed successfully!")

        # Verify migration
        print("\n🔍 Verifying migration...")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'spans'
              AND column_name IN ('span_type', 'http_url', 'cli_command', 'tool_name', 'tool_metadata')
            ORDER BY column_name;
        """)

        columns = cursor.fetchall()

        if len(columns) >= 5:
            print(f"✓ Found {len(columns)} new columns:")
            for col_name, col_type in columns:
                print(f"  - {col_name}: {col_type}")
        else:
            print(f"⚠️  Warning: Only found {len(columns)} columns (expected 5+)")

        # Check indexes
        cursor.execute("""
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = 'spans'
              AND indexname LIKE 'idx_spans_%'
            ORDER BY indexname;
        """)

        indexes = cursor.fetchall()
        print(f"\n✓ Created {len(indexes)} indexes")

        cursor.close()
        conn.close()

        print("\n" + "="*60)
        print("✅ Migration successful!")
        print("="*60)
        print("\n📝 Next steps:")
        print("1. Update backend/db_connection.py to use new columns")
        print("2. Re-run SDK tests to verify spans are persisted")
        print("3. Check database with queries from migrations/README.md")

    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("="*60)
    print("🗄️  Orbis Database Migration")
    print("Migration: Add Tool Tracking Columns")
    print("="*60)
    print()

    run_migration()