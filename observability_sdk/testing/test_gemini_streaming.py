"""
Test Gemini Streaming Support
Compares streaming vs non-streaming responses
"""

from observability_sdk import configure, instrument_all, observe
from google import genai
from google.genai import types
import os
import time

# Configure
configure(
    api_key="test-key-123",
    api_url="http://localhost:8080",
    debug=True
)

instrument_all()
client = genai.Client(api_key="AIzaSyDpCZjw1EOekyFPbVieh2fZUXvdOsZ04-M")

# ========================================
# TEST 1: STREAMING Response
# ========================================

@observe("streaming_story_generator")
def streaming_story_generator():
    """
    Generate a story with STREAMING enabled
    Should capture time_to_first_token and tokens_per_second
    """
    print("\n🚀 TEST 1: Streaming Response")
    print("-" * 70)
    
    # Use generate_content_stream for streaming
    response = client.models.generate_content_stream(
        model="gemini-2.5-flash-lite",
        contents="Write a short 3-sentence story about a robot learning to cook",
        config=types.GenerateContentConfig(
            temperature=0.7,
        ),
    )
    
    full_response = ""
    chunk_count = 0
    
    print("📡 Streaming chunks:")
    for chunk in response:
        if chunk.text:
            print(chunk.text, end="", flush=True)
            full_response += chunk.text
            chunk_count += 1
    
    print(f"\n\n✅ Received {chunk_count} chunks")
    print(f"📊 Total length: {len(full_response)} characters")
    
    return full_response

# ========================================
# TEST 2: NON-STREAMING Response (for comparison)
# ========================================

@observe("non_streaming_story_generator")
def non_streaming_story_generator():
    """
    Generate a story WITHOUT streaming
    Should NOT have time_to_first_token or tokens_per_second
    """
    print("\n🔄 TEST 2: Non-Streaming Response")
    print("-" * 70)
    
    # Use generate_content for non-streaming
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents="Write a short 3-sentence story about a cat learning to paint",
        config=types.GenerateContentConfig(
            temperature=0.7,
        ),
    )
    
    print("📝 Complete response:")
    print(response.text)
    print("\n✅ Non-streaming complete")
    
    return response.text

# ========================================
# TEST 3: STREAMING Multi-Step Workflow
# ========================================

@observe("analyze_topic")
def analyze_topic(topic):
    """Analyze a topic with streaming"""
    print(f"\n  📊 Analyzing: {topic}")
    
    response = client.models.generate_content_stream(
        model="gemini-2.5-flash-lite",
        contents=f"In 2 sentences, explain what {topic} is",
    )
    
    result = ""
    for chunk in response:
        if chunk.text:
            print(chunk.text, end="", flush=True)
            result += chunk.text
    
    print()
    return result

@observe("generate_questions")
def generate_questions(topic):
    """Generate questions with streaming"""
    print(f"\n  ❓ Generating questions about: {topic}")
    
    response = client.models.generate_content_stream(
        model="gemini-2.5-flash-lite",
        contents=f"Generate 2 interesting questions about {topic}",
    )
    
    result = ""
    for chunk in response:
        if chunk.text:
            print(chunk.text, end="", flush=True)
            result += chunk.text
    
    print()
    return result

@observe("streaming_research_pipeline")
def streaming_research_pipeline(topic):
    """
    Multi-step workflow with streaming at each step
    Should create a DAG with multiple streaming spans
    """
    print(f"\n🔬 TEST 3: Multi-Step Streaming Pipeline")
    print("-" * 70)
    print(f"Researching: {topic}")
    
    # Both of these use streaming
    analysis = analyze_topic(topic)
    questions = generate_questions(topic)
    
    return {
        "topic": topic,
        "analysis": analysis,
        "questions": questions
    }

# ========================================
# MAIN: Run All Tests
# ========================================

if __name__ == "__main__":
    print("=" * 70)
    print("🧪 GEMINI STREAMING SUPPORT TEST")
    print("=" * 70)
    
    # Test 1: Simple streaming
    result1 = streaming_story_generator()
    
    time.sleep(2)
    
    # Test 2: Non-streaming for comparison
    result2 = non_streaming_story_generator()
    
    time.sleep(2)
    
    # Test 3: Multi-step streaming workflow
    result3 = streaming_research_pipeline("quantum computing")
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    print("Expected in dashboard: 3 traces")
    print()
    print("TRACE 1: streaming_story_generator")
    print("└── gemini.gemini-2.5-flash-lite")
    print("    ✅ is_streaming: true")
    print("    ✅ time_to_first_token: ~200-500ms")
    print("    ✅ tokens_per_second: ~50-200")
    print()
    print("TRACE 2: non_streaming_story_generator")
    print("└── gemini.gemini-2.5-flash-lite")
    print("    ✅ is_streaming: false")
    print("    ❌ time_to_first_token: null")
    print("    ❌ tokens_per_second: null")
    print()
    print("TRACE 3: streaming_research_pipeline")
    print("├── analyze_topic")
    print("│   └── gemini.gemini-2.5-flash-lite")
    print("│       ✅ is_streaming: true")
    print("└── generate_questions")
    print("    └── gemini.gemini-2.5-flash-lite")
    print("        ✅ is_streaming: true")
    
    # Wait for flush
    print("\n⏳ Waiting for spans to flush...")
    time.sleep(6)
    
    print("\n✅ Done! Check http://localhost:3000")
    print("\n🔍 What to verify in dashboard:")
    print("  1. Streaming spans have is_streaming=true")
    print("  2. time_to_first_token is populated (milliseconds)")
    print("  3. tokens_per_second is populated")
    print("  4. Non-streaming span has is_streaming=false")
    print("  5. All spans have complete output captured")