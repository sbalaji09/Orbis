"""
Test SDK with real Gemini API calls (FREE!)
"""

from observability_sdk.integrations.gemini_integration import instrument_gemini
from observability_sdk.decorators.observe import observe
from observability_sdk.collector.config import configure
from google import genai
import os

# Configure SDK
configure(
    api_key="test_api_key_12345",
    api_url="http://localhost:8080",
    debug=True
)

# Enable Gemini instrumentation
instrument_gemini()

# Configure Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

@observe("gemini_agent")
def gemini_agent(query: str) -> str:
    """Agent that uses Gemini for reasoning"""
    print(f"\n{'='*60}")
    print(f"Query: {query}")
    print(f"{'='*60}\n")
    
    print("Calling Gemini API...")
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=query
    )
    
    result = response.text or ""
    print(f"Response: {result[:200]}...")
    return result

if __name__ == "__main__":
    print("\n" + "="*60)
    print("GEMINI API TEST - Real LLM Calls (FREE!)")
    print("="*60)
    
    result = gemini_agent("Explain what AI observability is in one sentence.")
    
    import time
    print("\nWaiting for flush...")
    time.sleep(6)
    
    print("\n" + "="*60)
    print("Test Complete!")
    print("="*60)
    print("\nCheck dashboard for:")
    print("  - Token counts")
    print("  - Cost calculation ($0.00 for free tier)")
    print("  - Full prompt and completion")
    print("="*60)