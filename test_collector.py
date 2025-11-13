"""
Test the collector and backend integration
"""

from observability_sdk import observe, configure
import time


# Configure SDK to point to Siddarth's backend
configure(
    api_url="http://localhost:8000",  # Make sure Siddarth's backend is running!
    api_key="sk_live_6Ank6nzt39BE7pDnnM7iJ1d_aDKmSc5jqS-KHTEimDw",
    batch_size=3,  # Small batch for testing
    flush_interval=2.0,  # Flush every 2 seconds
    debug=True  # See what's happening
)


@observe()
def test_function_1():
    """First test function"""
    time.sleep(0.1)
    return "Function 1 done"


@observe()
def test_function_2():
    """Second test function"""
    time.sleep(0.2)
    return "Function 2 done"


@observe()
def test_function_3():
    """Third test function"""
    time.sleep(0.15)
    return "Function 3 done"


@observe()
def failing_test():
    """Function that fails"""
    raise ValueError("Test error!")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("Testing Collector + Backend Integration")
    print("="*60)
    print("\nMake sure Siddarth's backend is running:")
    print("  cd data-pipeline")
    print("  uvicorn ingestion_api:app --reload --port 8000")
    print("\n" + "="*60 + "\n")
    
    # Run test functions
    print("[TEST] Running 3 functions (should trigger batch send):")
    test_function_1()
    test_function_2()
    test_function_3()
    
    print("\n[TEST] Running failing function:")
    try:
        failing_test()
    except ValueError:
        pass
    
    # Wait for flush interval
    print("\n[TEST] Waiting for flush interval (2 seconds)...")
    time.sleep(3)
    
    print("\n" + "="*60)
    print("Test complete!")
    print("Check Siddarth's backend logs to see if spans were received")
    print("="*60 + "\n")