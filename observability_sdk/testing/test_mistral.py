"""
Test Mistral instrumentation using Mistral API with Prompt Versioning
Mistral uses OpenAI-compatible API, so this tests the real instrumentation!
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from observability_sdk import configure, instrument_all, observe
import openai

# Configure observability
configure(
    api_key="VGVzdCBBZ2VudAyqF8dhGI1mMuqLtMFmouY=",
    project_id="61d12c7c-e745-4a14-a039-60b7a5d1df62",
    user_id="fbd31533-fe77-427f-9d2d-a1c4c69e9a6d",
    api_url="http://localhost:8080",
)

instrument_all()

# Configure OpenAI client to use Mistral
client = openai.OpenAI(
    api_key=os.environ.get("MISTRAL_API_KEY", "your-mistral-api-key-here"),
    base_url="https://api.mistral.ai/v1"
)

print("=" * 70)
print("🧪 TESTING MISTRAL + PROMPT VERSIONING")
print("=" * 70)

# ========================================
# TEST 1: Streaming with Prompt Versioning v1.0
# ========================================

@observe(
    name="mistral_streaming_storyteller_v1",
    prompt_id="robot_story_prompt",
    prompt_version="v1.0",
    prompt_template="Write a short 2-sentence story about a robot learning to code",
    metadata={"author": "rahul", "purpose": "testing", "model": "mistral-large"}
)
def test_streaming_v1():
    print("\n🚀 TEST 1: Streaming Response (Prompt v1.0)")
    print("-" * 70)

    response = client.chat.completions.create(
        model="mistral-large-latest",
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
    name="mistral_streaming_storyteller_v2",
    prompt_id="robot_story_prompt",
    prompt_version="v2.0",
    prompt_template="Write a short, creative 2-sentence story about a robot learning to code. Make it inspiring and fun!",
    metadata={"author": "rahul", "purpose": "testing", "change": "added creative and inspiring instruction"}
)
def test_streaming_v2():
    print("\n🚀 TEST 2: Streaming Response (Prompt v2.0 - Improved)")
    print("-" * 70)

    response = client.chat.completions.create(
        model="mistral-large-latest",
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
    name="mistral_ai_explainer",
    prompt_id="ai_story_prompt",
    prompt_version="v1.0",
    prompt_template="Write a short 2-sentence story about AI",
    metadata={"author": "rahul", "purpose": "testing", "category": "educational"}
)
def test_nonstreaming():
    print("\n🔄 TEST 3: Non-Streaming Response (Different Prompt)")
    print("-" * 70)

    response = client.chat.completions.create(
        model="mistral-large-latest",
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
# TEST 4: Testing Mistral Small (cheaper model)
# ========================================

@observe(
    name="mistral_small_test",
    prompt_id="simple_question_prompt",
    prompt_version="v1.0",
    prompt_template="What is Python?",
    metadata={"author": "rahul", "purpose": "testing", "model": "mistral-small"}
)
def test_mistral_small():
    print("\n💡 TEST 4: Mistral Small Model (Cost-Effective)")
    print("-" * 70)

    response = client.chat.completions.create(
        model="mistral-small-latest",
        messages=[
            {"role": "user", "content": "What is Python?"}
        ],
        stream=False
    )

    print("📝 Complete response:")
    print(response.choices[0].message.content)
    print("✅ Complete!")
    return response.choices[0].message.content

# ========================================
# TEST 5: Nested calls with Prompt Versioning
# ========================================

@observe(
    name="creative_writing_agent",
    prompt_id="agent_orchestrator",
    prompt_version="v1.0",
    prompt_template="Orchestrate creative writing by first generating, then improving the story",
    metadata={"author": "rahul", "type": "agent"}
)
def creative_writing_agent():
    print("\n🤖 TEST 5: Agent with Multiple Prompt Versions")
    print("-" * 70)

    # Generate initial story with v1.0
    print("\n📝 Step 1: Generate with v1.0...")
    story_v1 = test_streaming_v1()

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
    print("Running Comprehensive Mistral Tests...")
    print("=" * 70)

    # Test 1: Streaming v1.0
    result1 = test_streaming_v1()

    # Test 2: Streaming v2.0
    result2 = test_streaming_v2()

    # Test 3: Non-streaming different prompt
    result3 = test_nonstreaming()

    # Test 4: Mistral Small model
    result4 = test_mistral_small()

    # Test 5: Agent with nested calls
    result5 = creative_writing_agent()

    print("\n" + "=" * 70)
    print("📊 EXPECTED IN DASHBOARD")
    print("=" * 70)
    print("You should see 7 traces total:")
    print()
    print("1️⃣ Trace: mistral_streaming_storyteller_v1")
    print("   • Parent span with prompt_id='robot_story_prompt' v1.0")
    print("   • Child span: mistral.mistral-large-latest (STREAMING)")
    print("   • Cost: ~$0.0005-$0.002 (Mistral Large pricing)")
    print()
    print("2️⃣ Trace: mistral_streaming_storyteller_v2")
    print("   • Parent span with prompt_id='robot_story_prompt' v2.0")
    print("   • Child span: mistral.mistral-large-latest (STREAMING)")
    print("   • Cost: ~$0.0005-$0.002")
    print()
    print("3️⃣ Trace: mistral_ai_explainer")
    print("   • Parent span with prompt_id='ai_story_prompt' v1.0")
    print("   • Child span: mistral.mistral-large-latest (NON-STREAMING)")
    print()
    print("4️⃣ Trace: mistral_small_test")
    print("   • Parent span with prompt_id='simple_question_prompt' v1.0")
    print("   • Child span: mistral.mistral-small-latest (NON-STREAMING)")
    print("   • Cost: ~$0.0001-$0.0003 (Cheaper than Large)")
    print()
    print("5️⃣ Trace: creative_writing_agent (nested DAG)")
    print("   • Root: creative_writing_agent (agent_orchestrator v1.0)")
    print("   • ├── mistral_streaming_storyteller_v1 (robot_story_prompt v1.0)")
    print("   • │   └── mistral.mistral-large-latest")
    print("   • └── mistral_streaming_storyteller_v2 (robot_story_prompt v2.0)")
    print("   •     └── mistral.mistral-large-latest")
    print()
    print("📋 PROMPT VERSIONING TAB:")
    print("   • Prompt Family 'robot_story_prompt': 2 versions (v1.0, v2.0)")
    print("   • Prompt Family 'ai_story_prompt': 1 version (v1.0)")
    print("   • Prompt Family 'simple_question_prompt': 1 version (v1.0)")
    print("   • Prompt Family 'agent_orchestrator': 1 version (v1.0)")
    print()
    print("💰 COST TRACKING:")
    print("   • Mistral Large: $0.50/M input, $1.50/M output")
    print("   • Mistral Small: $0.10/M input, $0.30/M output")
    print("   • Dashboard should show accurate costs for each model")
    print()
    print("✅ Check http://localhost:3000")
    print("   - View traces with streaming badges")
    print("   - Check Prompt Versioning tab for all prompt families")
    print("   - Compare v1.0 vs v2.0 performance in the dashboard")
    print("   - Verify cost calculations are accurate")
    print("=" * 70)
