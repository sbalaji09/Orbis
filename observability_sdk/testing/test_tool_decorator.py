"""
Test custom tool decorator (@observe_tool)
This test verifies that custom tools are tracked as spans
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from observability_sdk import observe, observe_tool
from observability_sdk.collector.config import configure

# Configure Orbis
configure(
    api_key="test-api-key-tool",
    project_id="test-project-tool",
    user_id="test-user-tool",
    api_url="http://localhost:8080"
)

# Define custom tools using @observe_tool decorator

@observe_tool(name="calculator_add", category="calculator")
def add_numbers(a: float, b: float) -> float:
    """A simple calculator tool"""
    return a + b

@observe_tool(name="calculator_multiply", category="calculator")
def multiply_numbers(a: float, b: float) -> float:
    """Multiply two numbers"""
    return a * b

@observe_tool(name="text_processor", category="text")
def process_text(text: str) -> str:
    """Process text by converting to uppercase"""
    return text.upper()

@observe_tool(name="data_analyzer", category="analytics")
def analyze_data(numbers: list) -> dict:
    """Analyze a list of numbers"""
    return {
        "count": len(numbers),
        "sum": sum(numbers),
        "average": sum(numbers) / len(numbers) if numbers else 0,
        "min": min(numbers) if numbers else None,
        "max": max(numbers) if numbers else None
    }

@observe(name="test_custom_tools")
def test_tool_usage():
    """
    Test function that uses multiple custom tools.
    Each tool call should be tracked as a separate span.
    """
    print("\n🔧 Using custom tools...\n")

    # Test 1: Calculator tools
    print("1. Calculator: Add 10 + 5")
    result1 = add_numbers(10, 5)
    print(f"   ✓ Result: {result1}")

    print("\n2. Calculator: Multiply 7 * 8")
    result2 = multiply_numbers(7, 8)
    print(f"   ✓ Result: {result2}")

    # Test 2: Text processing tool
    print("\n3. Text Processor: Convert to uppercase")
    result3 = process_text("hello orbis!")
    print(f"   ✓ Result: {result3}")

    # Test 3: Data analysis tool
    print("\n4. Data Analyzer: Analyze numbers")
    numbers = [10, 20, 30, 40, 50]
    result4 = analyze_data(numbers)
    print(f"   ✓ Analysis: {result4}")

    return "All tool tests completed!"

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 Custom Tool Decorator Test")
    print("=" * 60)

    result = test_tool_usage()

    print("\n" + "=" * 60)
    print("✅ Test completed!")
    print("=" * 60)
    print("\n📊 Expected results in Orbis dashboard:")
    print("   - 1 trace: 'test_custom_tools'")
    print("   - 5 spans total:")
    print("     1. test_custom_tools (parent, type: function)")
    print("     2. calculator_add (type: tool, category: calculator)")
    print("     3. calculator_multiply (type: tool, category: calculator)")
    print("     4. text_processor (type: tool, category: text)")
    print("     5. data_analyzer (type: tool, category: analytics)")
    print("\n💡 Check your Orbis dashboard to see the trace!")