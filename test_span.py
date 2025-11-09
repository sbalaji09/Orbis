# testing span class

from observability_sdk.core import Span
import time

print("=== Testing Span Class ===\n")

# Test 1: Successful span
print("Test 1: Successful function")
span1 = Span(name="my_function")
print(f"Created: {span1}")

time.sleep(0.5)  # Simulate work

span1.complete(status="success")
print(f"Completed: {span1}")
print(f"Data: {span1.to_dict()}\n")


# Test 2: Failed span
print("Test 2: Failed function")
span2 = Span(name="failing_function")

try:
    time.sleep(0.2)
    raise ValueError("Something went wrong!")
except Exception as e:
    span2.set_error(e)
    span2.complete(status="error")

print(f"Failed: {span2}")
print(f"Data: {span2.to_dict()}\n")


# Test 3: Multiple spans
print("Test 3: Multiple spans")
for i in range(3):
    span = Span(name=f"function_{i}")
    time.sleep(0.1)
    span.complete()
    print(span)
