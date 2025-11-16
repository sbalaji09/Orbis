"""
Test the @observe() decorator
"""

from observability_sdk import observe
import time


# Test 1: Basic function
@observe()
def simple_function():
    """A simple function that succeeds"""
    time.sleep(0.5)
    return "Success!"


# Test 2: Custom name
@observe(name="my_custom_operation")
def function_with_custom_name():
    """Function with a custom span name"""
    time.sleep(0.3)
    return "Done"


# Test 3: Function that fails
@observe()
def failing_function():
    """A function that raises an error"""
    time.sleep(0.2)
    raise ValueError("Something went wrong!")


# Test 4: Nested functions (will show parent-child in Week 5)
@observe()
def parent_function():
    """Parent function that calls child"""
    time.sleep(0.1)
    result = child_function()
    return f"Parent got: {result}"


@observe()
def child_function():
    """Child function"""
    time.sleep(0.2)
    return "Child result"


if __name__ == "__main__":
    print("\n" + "="*60)
    print("Testing @observe() Decorator")
    print("="*60)
    
    # Test 1
    print("\n[TEST 1] Simple function:")
    result1 = simple_function()
    print(f"Result: {result1}")
    
    # Test 2
    print("\n[TEST 2] Custom name:")
    result2 = function_with_custom_name()
    print(f"Result: {result2}")
    
    # Test 3
    print("\n[TEST 3] Failing function:")
    try:
        failing_function()
    except ValueError as e:
        print(f"Caught exception: {e}")
    
    # Test 4
    print("\n[TEST 4] Nested functions:")
    result4 = parent_function()
    print(f"Result: {result4}")
    
    print("\n" + "="*60)
    print("All tests complete!")
    print("="*60 + "\n")