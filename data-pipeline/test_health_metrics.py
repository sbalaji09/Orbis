#!/usr/bin/env python3
"""
Test script for health and metrics endpoints
Run this after starting Redis and PostgreSQL
"""
import json
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

def test_endpoints():
    print("="*60)
    print("Testing Health and Metrics Endpoints")
    print("="*60)
    print()

    # Import after env is loaded
    from ingestion_api import get_health, get_metrics

    # Test health endpoint
    print("1. Testing get_health()...")
    print("-" * 60)
    try:
        health = get_health()
        print(json.dumps(health, indent=2))

        if health["status"] == "healthy":
            print("\n✓ Health check PASSED - all services healthy")
        else:
            print("\n⚠ Health check WARNING - some services unhealthy")
    except Exception as e:
        print(f"✗ Health check FAILED: {e}")
        import traceback
        traceback.print_exc()

    print()
    print("="*60)
    print()

    # Test metrics endpoint
    print("2. Testing get_metrics()...")
    print("-" * 60)
    try:
        metrics = get_metrics()
        print(json.dumps(metrics, indent=2))
        print("\n✓ Metrics endpoint PASSED")
    except Exception as e:
        print(f"✗ Metrics endpoint FAILED: {e}")
        import traceback
        traceback.print_exc()

    print()
    print("="*60)
    print("Tests complete!")
    print("="*60)

if __name__ == "__main__":
    test_endpoints()
