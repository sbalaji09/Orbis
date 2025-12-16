"""
Test OpenAI instrumentation using Groq's free API with Prompt Versioning
Groq uses OpenAI-compatible API, so this tests the real instrumentation!
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from observability_sdk import configure, instrument_all, observe
import openai
import time

# Configure observability
configure(
    api_key="test-tool-tracking-key-123",
    project_id="616d8f4e-8b03-4112-a40c-a61164977cb5",
    user_id="00000000-0000-0000-0000-000000000000",
    api_url="http://localhost:8080",
)

instrument_all()

# Configure OpenAI client to use Groq
client = openai.OpenAI(
    api_key="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",
    base_url="https://api.groq.com/openai/v1"
)

print("=" * 70)
print("🧪 TESTING OPENAI + PROMPT VERSIONING WITH GROQ")
print("=" * 70)

# ========================================
# TEST 1: Streaming with Prompt Versioning v1.0
# ========================================

@observe(
    name="groq_streaming_storyteller_v1",
    prompt_id="robot_story_prompt",
    prompt_version="v1.0",
    prompt_template="Write a short 2-sentence story about a robot learning to code",
    metadata={"author": "rahul", "purpose": "testing", "model": "llama-3.3-70b"}
)
def test_streaming_v1():
    print("\n🚀 TEST 1: Streaming Response (Prompt v1.0)")
    print("-" * 70)
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": "Write a short 2-sentence story about a robot learning to code"}
        ],
        stream=True
    )
    
    print("📡 Streaming response:")
    full_text = ""
    for chunk in response:
        if chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            print(content, end="", flush=True)
            full_text += content
    
    print(f"\n✅ Complete! Length: {len(full_text)} chars")
    return full_text

# ========================================
# TEST 2: Streaming with Prompt Versioning v2.0 (Improved)
# ========================================

@observe(
    name="groq_streaming_storyteller_v2",
    prompt_id="robot_story_prompt",
    prompt_version="v2.0",
    prompt_template="Write a short, creative 2-sentence story about a robot learning to code. Make it inspiring and fun!",
    metadata={"author": "rahul", "purpose": "testing", "change": "added creative and inspiring instruction"}
)
def test_streaming_v2():
    print("\n🚀 TEST 2: Streaming Response (Prompt v2.0 - Improved)")
    print("-" * 70)
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": "Write a short, creative 2-sentence story about a robot learning to code. Make it inspiring and fun!"}
        ],
        stream=True
    )
    
    print("📡 Streaming response:")
    full_text = ""
    for chunk in response:
        if chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            print(content, end="", flush=True)
            full_text += content
    
    print(f"\n✅ Complete! Length: {len(full_text)} chars")
    return full_text

# ========================================
# TEST 3: Non-Streaming with Different Prompt Family
# ========================================

@observe(
    name="groq_ai_explainer",
    prompt_id="ai_story_prompt",
    prompt_version="v1.0",
    prompt_template="Write a short 2-sentence story about AI",
    metadata={"author": "rahul", "purpose": "testing", "category": "educational"}
)
def test_nonstreaming():
    print("\n🔄 TEST 3: Non-Streaming Response (Different Prompt)")
    print("-" * 70)
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": "Write a short 2-sentence story about AI"}
        ],
        stream=False
    )
    
    print("📝 Complete response:")
    print(response.choices[0].message.content)
    print("✅ Complete!")
    return response.choices[0].message.content

# ========================================
# TEST 4: Nested calls with Prompt Versioning
# ========================================

@observe(
    name="creative_writing_agent",
    prompt_id="agent_orchestrator",
    prompt_version="v1.0",
    prompt_template="Orchestrate creative writing by first generating, then improving the story",
    metadata={"author": "rahul", "type": "agent"}
)
def creative_writing_agent():
    print("\n🤖 TEST 4: Agent with Multiple Prompt Versions")
    print("-" * 70)
    
    # Generate initial story with v1.0
    print("\n📝 Step 1: Generate with v1.0...")
    story_v1 = test_streaming_v1()
    time.sleep(1)
    
    # Improve with v2.0
    print("\n✨ Step 2: Improve with v2.0...")
    story_v2 = test_streaming_v2()
    
    print("\n✅ Agent workflow complete!")
    return {"v1": story_v1, "v2": story_v2}

# ========================================
# RUN TESTS
# ========================================

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("Running Comprehensive Tests...")
    print("=" * 70)
    
    # Test 1: Streaming v1.0
    result1 = test_streaming_v1()
    time.sleep(2)
    
    # Test 2: Streaming v2.0
    result2 = test_streaming_v2()
    time.sleep(2)
    
    # Test 3: Non-streaming different prompt
    result3 = test_nonstreaming()
    time.sleep(2)
    
    # Test 4: Agent with nested calls
    result4 = creative_writing_agent()
    time.sleep(6)
    
    print("\n" + "=" * 70)
    print("📊 EXPECTED IN DASHBOARD")
    print("=" * 70)
    print("You should see 6 traces total:")
    print()
    print("1️⃣ Trace: groq_streaming_storyteller_v1")
    print("   • Parent span with prompt_id='robot_story_prompt' v1.0")
    print("   • Child span: openai.llama-3.3-70b-versatile (STREAMING)")
    print("   • TTFT: ~100-300ms, Speed: 300-500 tok/s")
    print()
    print("2️⃣ Trace: groq_streaming_storyteller_v2")
    print("   • Parent span with prompt_id='robot_story_prompt' v2.0")
    print("   • Child span: openai.llama-3.3-70b-versatile (STREAMING)")
    print("   • TTFT: ~100-300ms, Speed: 300-500 tok/s")
    print()
    print("3️⃣ Trace: groq_ai_explainer")
    print("   • Parent span with prompt_id='ai_story_prompt' v1.0")
    print("   • Child span: openai.llama-3.3-70b-versatile (NON-STREAMING)")
    print()
    print("4️⃣ Trace: creative_writing_agent (nested DAG)")
    print("   • Root: creative_writing_agent (agent_orchestrator v1.0)")
    print("   • ├── groq_streaming_storyteller_v1 (robot_story_prompt v1.0)")
    print("   • │   └── openai.llama-3.3-70b-versatile")
    print("   • └── groq_streaming_storyteller_v2 (robot_story_prompt v2.0)")
    print("   •     └── openai.llama-3.3-70b-versatile")
    print()
    print("📋 PROMPT VERSIONING TAB:")
    print("   • Prompt Family 'robot_story_prompt': 2 versions (v1.0, v2.0)")
    print("   • Prompt Family 'ai_story_prompt': 1 version (v1.0)")
    print("   • Prompt Family 'agent_orchestrator': 1 version (v1.0)")
    print()
    print("✅ Check http://localhost:3000")
    print("   - View traces with streaming badges")
    print("   - Check Prompt Versioning tab for all prompt families")
    print("   - Compare v1.0 vs v2.0 performance in the dashboard")
    print("=" * 70)