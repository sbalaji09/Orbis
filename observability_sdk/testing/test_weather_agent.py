"""
Test SDK with a simple ReAct agent workflow.
This simulates a real AI agent with tool usage.
"""

from observability_sdk.decorators.observe import observe
from observability_sdk.collector.config import configure
import json

# Configure SDK
configure(
    api_key="test_api_key_12345",
    api_url="http://localhost:8080",
    debug=True
)

# Mock weather tool
@observe("get_weather_tool")
def get_weather(location: str, unit: str = "fahrenheit") -> dict:
    """Simulate calling a weather API"""
    weather_data = {
        "San Francisco, CA": {"temp": 72, "condition": "Sunny"},
        "New York, NY": {"temp": 65, "condition": "Cloudy"},
        "Seattle, WA": {"temp": 58, "condition": "Rainy"},
    }
    
    data = weather_data.get(location, {"temp": 70, "condition": "Unknown"})
    return {
        "location": location,
        "temperature": data["temp"],
        "unit": unit,
        "condition": data["condition"]
    }

# Mock LLM reasoning steps
@observe("llm_decide_action")
def llm_decide_action(user_query: str) -> dict:
    """Simulate LLM deciding what action to take"""
    print(f"  [LLM] Analyzing query: {user_query}")
    # LLM decides to call weather tool
    return {
        "action": "use_tool",
        "tool": "get_weather",
        "args": {"location": "San Francisco, CA", "unit": "fahrenheit"}
    }

@observe("llm_format_response")
def llm_format_response(tool_result: dict) -> str:
    """Simulate LLM formatting the final response"""
    print(f"  [LLM] Formatting response with data: {tool_result}")
    return f"The weather in {tool_result['location']} is {tool_result['temperature']}°{tool_result['unit'][0].upper()} and {tool_result['condition'].lower()}."

# Main agent workflow
@observe("weather_agent")
def weather_agent(user_query: str) -> str:
    """
    ReAct-style agent that:
    1. Reasons about what to do (LLM call)
    2. Executes a tool
    3. Formats final response (LLM call)
    """
    print(f"\n{'='*60}")
    print(f"User Query: {user_query}")
    print(f"{'='*60}\n")
    
    # Step 1: Agent decides what to do
    print("Step 1: Agent reasoning about action...")
    decision = llm_decide_action(user_query)
    
    # Step 2: Execute the tool
    print(f"Step 2: Executing tool: {decision['tool']}")
    tool_result = get_weather(**decision['args'])
    print(f"  Tool result: {tool_result}")
    
    # Step 3: Format final response
    print("Step 3: Agent formatting final response...")
    final_response = llm_format_response(tool_result)
    
    print(f"\nFinal Answer: {final_response}\n")
    return final_response

if __name__ == "__main__":
    print("\n" + "="*60)
    print("WEATHER AGENT TEST - Multi-Step Workflow")
    print("="*60)
    
    # Run the agent
    result = weather_agent("What's the weather like in San Francisco?")
    
    # Wait for flush
    import time
    print("\nWaiting for flush...")
    time.sleep(6)
    
    print("\n" + "="*60)
    print("Test Complete!")
    print("="*60)
    print("\nCheck your dashboard at http://localhost:3000")
    print("Expected DAG structure:")
    print("  weather_agent (parent)")
    print("  ├── llm_decide_action")
    print("  ├── get_weather_tool")
    print("  └── llm_format_response")
    print("="*60)