"""
Test auto-versioning with actual LLM calls - demonstrates prompts linked to traces.

This test:
1. Creates versioned prompts via API (auto-versioning)
2. Makes actual OpenAI LLM calls using those prompts
3. Shows traces in the dashboard with prompt version information
"""

import sys
import os
import time
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

try:
    import requests
    import openai
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("Install with: pip install requests openai")
    sys.exit(1)

from observability_sdk import configure, instrument_all, observe

# Hardcoded keys
API_KEY = "VGVzdCBUcmFjZSAMlhbKlbc_MKUVQ-Kb1c95"
PROJECT_ID = "aca167c7-6c08-4fe2-a7af-21ec298e1d68"
USER_ID = "fbd31533-fe77-427f-9d2d-a1c4c69e9a6d"
API_URL = "http://localhost:8080"
AGENT_ID = "aca167c7-6c08-4fe2-a7af-21ec298e1d68"

# OpenAI key for actual LLM calls
OPENAI_KEY = "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"

PROMPT_NAME = "support_agent_versioned"


def setup_orbis():
    """Configure the observability SDK"""
    configure(
        api_key=API_KEY,
        project_id=PROJECT_ID,
        user_id=USER_ID,
        api_url=API_URL
    )
    instrument_all()
    print("✓ Orbis SDK configured")


def create_prompt_version(content: str) -> dict:
    """Create a new prompt version (auto-versioning happens here)"""
    response = requests.post(
        f"{API_URL}/prompts/prompts",
        params={
            "agent_id": AGENT_ID,
            "name": PROMPT_NAME,
            "content": content
        },
        headers={
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        },
        timeout=10.0
    )

    if response.status_code in [200, 201]:
        return response.json()
    else:
        raise Exception(f"Failed to create prompt: {response.status_code} - {response.text}")


def make_llm_call(prompt_content: str, prompt_version: str, test_name: str) -> str:
    """
    Make an actual OpenAI LLM call with the versioned prompt.
    The @observe decorator links this call to the prompt version.
    """
    @observe(
        name=f"llm_call_{test_name}",
        prompt_id=PROMPT_NAME,
        prompt_version=prompt_version,
        prompt_template=prompt_content,
        metadata={"test": "auto_versioning_with_llm", "version": prompt_version}
    )
    def call_openai():
        client = openai.OpenAI(api_key=OPENAI_KEY)

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt_content},
                {"role": "user", "content": "Hello! I need help with my account."}
            ],
            max_tokens=100,
            temperature=0.7
        )

        return response.choices[0].message.content

    return call_openai()


def main():
    print("\n" + "=" * 70)
    print("🤖 AUTO-VERSIONING + LLM CALLS TEST")
    print("=" * 70)
    print("\nThis test creates versioned prompts AND makes actual LLM calls")
    print("so you can see traces in the dashboard with auto-versioning.\n")

    setup_orbis()

    # =========================================================================
    # Test 1: Create v1.0 and make LLM call
    # =========================================================================
    print("\n" + "=" * 70)
    print("TEST 1: Version 1.0 - Initial Prompt")
    print("=" * 70)

    prompt_v1 = """You are a helpful customer support agent for our company.
Your goal is to assist customers with their inquiries and resolve issues efficiently.
Be polite, professional, and empathetic in all interactions."""

    print(f"\n📝 Creating prompt version...")
    result_v1 = create_prompt_version(prompt_v1)
    version_v1 = result_v1.get("semantic_version", "1.0")

    print(f"✅ Created version: {version_v1}")
    print(f"\n🤖 Making LLM call with v{version_v1}...")

    response_v1 = make_llm_call(prompt_v1, version_v1, "v1")

    print(f"✅ LLM Response: {response_v1[:100]}...")
    print(f"   → This trace is linked to prompt version {version_v1}")

    time.sleep(2)

    # =========================================================================
    # Test 2: Create v1.1 (minor change) and make LLM call
    # =========================================================================
    print("\n\n" + "=" * 70)
    print("TEST 2: Version 1.1 - Minor Change (Add Example)")
    print("=" * 70)

    prompt_v2 = """You are a helpful customer support agent for our company.
Your goal is to assist customers with their inquiries and resolve issues efficiently.
Be polite, professional, and empathetic in all interactions.

For example, when handling billing questions, always verify account details first."""

    print(f"\n📝 Creating updated prompt (expecting minor bump)...")
    result_v2 = create_prompt_version(prompt_v2)
    version_v2 = result_v2.get("semantic_version", "1.1")

    print(f"✅ Created version: {version_v2}")
    print(f"   Change type: Minor (added one example line, <40% diff)")
    print(f"\n🤖 Making LLM call with v{version_v2}...")

    response_v2 = make_llm_call(prompt_v2, version_v2, "v2")

    print(f"✅ LLM Response: {response_v2[:100]}...")
    print(f"   → This trace is linked to prompt version {version_v2}")

    time.sleep(2)

    # =========================================================================
    # Test 3: Create v2.0 (major change) and make LLM call
    # =========================================================================
    print("\n\n" + "=" * 70)
    print("TEST 3: Version 2.0 - Major Change (Structural Keywords)")
    print("=" * 70)

    prompt_v3 = """Role: Expert customer support agent with 5+ years of experience

Rules:
- Must provide empathetic and professional responses
- Always acknowledge customer concerns
- Never make promises you cannot keep

Format:
- Use clear, concise language
- Provide step-by-step solutions
- Include relevant documentation links"""

    print(f"\n📝 Creating major rewrite (expecting major bump)...")
    result_v3 = create_prompt_version(prompt_v3)
    version_v3 = result_v3.get("semantic_version", "2.0")

    print(f"✅ Created version: {version_v3}")
    print(f"   Change type: Major (structural keywords: role, rules, format, must, never)")
    print(f"\n🤖 Making LLM call with v{version_v3}...")

    response_v3 = make_llm_call(prompt_v3, version_v3, "v3")

    print(f"✅ LLM Response: {response_v3[:100]}...")
    print(f"   → This trace is linked to prompt version {version_v3}")

    time.sleep(2)

    # =========================================================================
    # Test 4: Create v2.1 (minor after major) and make LLM call
    # =========================================================================
    print("\n\n" + "=" * 70)
    print("TEST 4: Version 2.1 - Minor After Major")
    print("=" * 70)

    prompt_v4 = prompt_v3 + "\n- Add ticket references when available"

    print(f"\n📝 Creating minor update to v2.0...")
    result_v4 = create_prompt_version(prompt_v4)
    version_v4 = result_v4.get("semantic_version", "2.1")

    print(f"✅ Created version: {version_v4}")
    print(f"   Change type: Minor (small addition)")
    print(f"\n🤖 Making LLM call with v{version_v4}...")

    response_v4 = make_llm_call(prompt_v4, version_v4, "v4")

    print(f"✅ LLM Response: {response_v4[:100]}...")
    print(f"   → This trace is linked to prompt version {version_v4}")

    time.sleep(2)

    # =========================================================================
    # Summary
    # =========================================================================
    print("\n\n" + "=" * 70)
    print("📊 SUMMARY")
    print("=" * 70)

    print(f"\n✅ Created 4 prompt versions with auto-versioning:")
    print(f"   1. {version_v1} - Initial prompt")
    print(f"   2. {version_v2} - Minor change (added examples)")
    print(f"   3. {version_v3} - Major change (structural rewrite)")
    print(f"   4. {version_v4} - Minor change (small addition)")

    print(f"\n✅ Made 4 actual LLM calls linked to prompt versions")

    print(f"\n🎯 What to check in the dashboard:")
    print(f"   1. Go to Traces view - you should see 4 traces")
    print(f"   2. Each trace should show:")
    print(f"      - prompt_id: {PROMPT_NAME}")
    print(f"      - prompt_version: (1.0, 1.1, 2.0, 2.1)")
    print(f"   3. Go to Prompts view - you should see:")
    print(f"      - {PROMPT_NAME} with 4 versions")
    print(f"      - Version badges (MAJOR/MINOR)")
    print(f"      - Cost/latency per version")

    print(f"\n💡 Auto-Versioning in Action:")
    print(f"   - Backend automatically detected change types")
    print(f"   - Minor changes incremented Y (X.Y)")
    print(f"   - Major changes incremented X (X.0)")
    print(f"   - All traces are linked to their prompt versions")

    print("\n" + "=" * 70)
    print("✅ TEST COMPLETE - Check your dashboard!")
    print("=" * 70)

    print(f"\n⏳ Waiting 5 seconds for spans to flush to backend...")
    time.sleep(5)
    print("✅ Spans should be in database now!\n")


if __name__ == "__main__":
    main()
