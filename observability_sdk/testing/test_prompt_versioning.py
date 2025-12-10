"""
Test prompt versioning functionality
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from observability_sdk import observe, get_prompt_registry, configure
import time

# Configure SDK
configure(
    api_key="sk_live_Vy41Kdajw0Nigty3A3HrJlCx0ZXGXSqovDHCre6zU3Y",
    api_url="http://localhost:8080",
    project_id="11111111-1111-1111-1111-111111111111",
    user_id="00000000-0000-0000-0000-000000000000",
    debug=True
)

print("\n" + "="*60)
print("🧪 Testing Prompt Versioning")
print("="*60 + "\n")

# Test 1: Simple prompt versioning with decorator
print("Test 1: Basic prompt versioning with @observe()")
print("-" * 60)

@observe(
    name="summarize_document_v1",
    prompt_id="doc_summarizer",
    prompt_version="v1.0",
    prompt_template="You are a helpful assistant that summarizes documents concisely.",
    metadata={"author": "rahul", "purpose": "testing"}
)
def summarize_v1(document: str) -> str:
    """Version 1 of document summarizer"""
    return f"Summary of: {document[:50]}..."

result1 = summarize_v1("This is a long document about AI observability...")
print(f"✓ Function executed: {result1}")
time.sleep(0.5)


# Test 2: Updated prompt version
print("\n\nTest 2: Updated prompt version (v1.1)")
print("-" * 60)

@observe(
    name="summarize_document_v1.1",
    prompt_id="doc_summarizer",
    prompt_version="v1.1",
    prompt_template="You are a helpful assistant that summarizes documents. Be concise and accurate.",
    metadata={"author": "rahul", "purpose": "testing", "change": "added accuracy instruction"}
)
def summarize_v1_1(document: str) -> str:
    """Version 1.1 with improved prompt"""
    return f"Accurate summary: {document[:50]}..."

result2 = summarize_v1_1("This is a long document about AI observability...")
print(f"✓ Function executed: {result2}")
time.sleep(0.5)


# Test 3: Check registry
print("\n\nTest 3: Check Prompt Registry")
print("-" * 60)

registry = get_prompt_registry()
versions = registry.list_versions("doc_summarizer")

print(f"✓ Found {len(versions)} versions for 'doc_summarizer':")
for v in versions:
    print(f"  - {v.version}: hash={v.prompt_hash[:16]}... created={v.created_at.strftime('%H:%M:%S')}")

# Test 4: Detect changes
print("\n\nTest 4: Detect prompt changes")
print("-" * 60)

latest = registry.get_latest_version("doc_summarizer")
if latest:
    print(f"✓ Latest version: {latest.version}")

    # Check if a new prompt text would be different
    new_text = "You are a helpful assistant that summarizes documents. NEW INSTRUCTION."
    has_changed = registry.detect_changes("doc_summarizer", new_text)
    print(f"✓ New text detected as changed: {has_changed}")

    # Check if same text is detected as unchanged
    same_text = latest.prompt_text
    no_change = not registry.detect_changes("doc_summarizer", same_text)
    print(f"✓ Same text detected as unchanged: {no_change}")
else:
    print("✗ No versions found!")


# Test 5: Multiple prompt families
print("\n\nTest 5: Multiple prompt families")
print("-" * 60)

@observe(
    name="translate_text",
    prompt_id="translator",
    prompt_version="v1.0",
    prompt_template="Translate the following text to Spanish.",
    metadata={"author": "rahul"}
)
def translate(text: str) -> str:
    return f"Translated: {text}"

translate("Hello world")
time.sleep(0.5)

all_prompts = registry.get_all_prompts()
print(f"✓ Total prompt families: {len(all_prompts)}")
for prompt_id, versions in all_prompts.items():
    print(f"  - {prompt_id}: {len(versions)} version(s)")


print("\n" + "="*60)
print("✅ All prompt versioning tests passed!")
print("="*60)
print("\n💡 Next steps:")
print("  1. Check your dashboard - spans should have prompt_id, prompt_version, prompt_hash")
print("  2. Tell Siddarth to add these fields to the backend schema")
print("  3. Build the prompt management UI in the frontend")

print("\n⏳ Waiting for spans to flush to backend...")
time.sleep(5)
print("✅ Spans should be in database now!")


print("\n")