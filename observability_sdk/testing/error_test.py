"""
Test error handling - force an error to see if it propagates
"""

from observability_sdk import configure, instrument_all, observe
import time

configure(
    api_key="test-key-123",
    api_url="http://localhost:8080",
    debug=True
)

instrument_all()

@observe("failing_function")
def failing_function():
    """This will definitely fail"""
    raise ValueError("Intentional error for testing!")

@observe("parent_function")
def parent_function():
    """Parent that calls failing child"""
    print("Starting parent...")
    result = failing_function()
    return result

@observe("top_level")
def top_level():
    """Top level"""
    print("Starting top level...")
    result = parent_function()
    return result

if __name__ == "__main__":
    print("🧪 Error Test - Forcing an Error\n")
    
    try:
        result = top_level()
    except Exception as e:
        print(f"\n✅ Error caught: {e}")
    
    print("\n⏳ Waiting for spans to flush...")
    time.sleep(6)
    
    print("\n✅ Check dashboard - trace should show ERROR status")
    print("All 3 spans should have status='error'")