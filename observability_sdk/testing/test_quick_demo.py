"""
Quick Demo Test - No OpenAI Required
A simple test that demonstrates all tool tracking features without needing LLM API keys
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from observability_sdk import observe, observe_tool, instrument_http, run_tracked_command
from observability_sdk.collector.config import configure
from observability_sdk.collector.collector import get_collector
import time

# Check dependencies
try:
    import httpx
except ImportError:
    print("❌ httpx not installed. Install with: pip install httpx")
    sys.exit(1)

# Configure Orbis
configure(
    api_key="test-tool-tracking-key-123",
    project_id="616d8f4e-8b03-4112-a40c-a61164977cb5",
    user_id="00000000-0000-0000-0000-000000000000",
    api_url="http://localhost:8080",
)

# Enable HTTP instrumentation
instrument_http(httpx)

# Custom tools
@observe_tool(name="weather_lookup", category="api")
def get_weather(city: str) -> dict:
    """Mock weather lookup tool"""
    # In reality, you'd call a weather API
    return {
        "city": city,
        "temperature": 72,
        "condition": "Sunny",
        "humidity": 45
    }

@observe_tool(name="temperature_converter", category="calculator")
def fahrenheit_to_celsius(fahrenheit: float) -> float:
    """Convert Fahrenheit to Celsius"""
    return (fahrenheit - 32) * 5/9

@observe_tool(name="recommendation_engine", category="ai")
def recommend_activity(weather: dict) -> str:
    """Recommend activity based on weather"""
    temp = weather["temperature"]
    condition = weather["condition"]

    if temp > 80:
        return f"It's {condition} and hot! Perfect for swimming!"
    elif temp > 60:
        return f"It's {condition} and nice! Great for a walk!"
    else:
        return f"It's {condition} and cool. Maybe stay inside?"

@observe(name="weather_assistant_workflow")
def weather_assistant(city: str):
    """
    A simple workflow that:
    1. Gets weather data (tool)
    2. Checks a real API (HTTP)
    3. Converts temperature (tool)
    4. Checks system info (CLI)
    5. Recommends activity (tool)
    """
    print(f"\n🌤️  Weather Assistant for {city}\n")

    # Step 1: Get weather (custom tool)
    print("1. Fetching weather data...")
    weather = get_weather(city)
    print(f"   ✓ Weather: {weather['temperature']}°F, {weather['condition']}")

    # Step 2: Call a real API (HTTP)
    print("\n2. Calling public API...")
    api_response = httpx.get("https://api.github.com/zen")
    zen_quote = api_response.text
    print(f"   ✓ GitHub Zen: {zen_quote}")

    # Step 3: Convert temperature (custom tool)
    print("\n3. Converting temperature...")
    celsius = fahrenheit_to_celsius(weather['temperature'])
    print(f"   ✓ Temperature: {celsius:.1f}°C")

    # Step 4: Check system info (CLI)
    print("\n4. Checking system info...")
    date_result = run_tracked_command("date")
    print(f"   ✓ System date: {date_result.stdout.strip()}")

    # Step 5: Get recommendation (custom tool)
    print("\n5. Generating recommendation...")
    recommendation = recommend_activity(weather)
    print(f"   ✓ Recommendation: {recommendation}")

    return {
        "city": city,
        "weather": weather,
        "celsius": celsius,
        "zen_quote": zen_quote,
        "recommendation": recommendation
    }

if __name__ == "__main__":
    print("=" * 70)
    print("🧪 Quick Demo Test - All Tool Tracking Features")
    print("=" * 70)

    result = weather_assistant("San Francisco")

    print("\n" + "=" * 70)
    print("✅ Demo completed!")
    print("=" * 70)

    print("\n📊 Expected results in Orbis dashboard:")
    print("   - 1 trace: 'weather_assistant_workflow'")
    print("   - 7 spans total:")
    print("\n   Span Hierarchy:")
    print("   └─ weather_assistant_workflow (type: function)")
    print("      ├─ weather_lookup (type: tool)")
    print("      ├─ httpx.GET worldtimeapi.org (type: http)")
    print("      ├─ temperature_converter (type: tool)")
    print("      ├─ cli.date (type: cli)")
    print("      └─ recommendation_engine (type: tool)")
    print("\n   Span Types Demonstrated:")
    print("   ✓ function (parent workflow)")
    print("   ✓ tool (3 custom tools)")
    print("   ✓ http (1 API call)")
    print("   ✓ cli (1 shell command)")
    print("\n💡 This test requires NO OpenAI API key!")
    print("💡 Check your Orbis dashboard to see the trace!")

    # Flush spans to ensure they're sent before program exits
    print("\n📤 Flushing spans to backend...")
    get_collector().flush()
    time.sleep(2)  # Give time for HTTP requests to complete
    print("✅ Spans sent!")