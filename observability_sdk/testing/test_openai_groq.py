"""
Test prompt versioning functionality
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from observability_sdk import observe, get_prompt_registry, configure
import time

# Configure SDK
configure(
    api_key="sk_live_Vy41Kdajw0Nigty3A3HrJlCx0ZXGXSqovDHCre6zU3Y",
    api_url="http://localhost:8080",
    debug=True
)

print("=" * 70)
print("🧪 TESTING PROMPT VERSIONING")
print("=" * 70)

# ========================================
# TEST 1: Basic Prompt Versioning
# ========================================

@observe(
    name="summarize_v1",
    prompt_id="doc_summarizer",
    prompt_version="v1.0",
    prompt_template="You are a helpful assistant that summarizes documents concisely.",
    metadata={"author": "rahul", "purpose": "testing"}
)
def test_summarize_v1():
    print("\n📝 TEST 1: Basic Prompt Versioning (v1.0)")
    print("-" * 70)
    
    document = "This is a long document about AI observability and tracing systems..."
    result = f"Summary of: {document[:50]}..."
    
    print(f"✅ Function executed: {result}")
    return result

# ========================================
# TEST 2: Updated Prompt Version
# ========================================

@observe(
    name="summarize_v1.1",
    prompt_id="doc_summarizer",
    prompt_version="v1.1",
    prompt_template="You are a helpful assistant that summarizes documents. Be concise and accurate.",
    metadata={"author": "rahul", "purpose": "testing", "change": "added accuracy instruction"}
)
def test_summarize_v1_1():
    print("\n🔄 TEST 2: Updated Prompt Version (v1.1)")
    print("-" * 70)
    
    document = "This is a long document about AI observability and tracing systems..."
    result = f"Accurate summary: {document[:50]}..."
    
    print(f"✅ Function executed: {result}")
    return result

# ========================================
# TEST 3: Different Prompt Family
# ========================================

@observe(
    name="translate_text",
    prompt_id="translator",
    prompt_version="v1.0",
    prompt_template="Translate the following text to Spanish.",
    metadata={"author": "rahul", "target_language": "spanish"}
)
def test_translator():
    print("\n🌐 TEST 3: Different Prompt Family (translator)")
    print("-" * 70)
    
    text = "Hello world, this is a test"
    result = f"Translated: {text}"
    
    print(f"✅ Function executed: {result}")
    return result

# ========================================
# RUN TESTS
# ========================================

if __name__ == "__main__":
    # Test v1.0
    result1 = test_summarize_v1()
    time.sleep(1)
    
    # Test v1.1
    result2 = test_summarize_v1_1()
    time.sleep(1)
    
    # Test translator
    result3 = test_translator()
    time.sleep(1)
    
    # ========================================
    # Verify Registry
    # ========================================
    
    print("\n📊 PROMPT REGISTRY STATUS")
    print("=" * 70)
    
    registry = get_prompt_registry()
    
    # Check doc_summarizer versions
    doc_versions = registry.list_versions("doc_summarizer")
    print(f"\n✓ 'doc_summarizer' has {len(doc_versions)} version(s):")
    for v in doc_versions:
        print(f"  - {v.version}: hash={v.prompt_hash[:16]}... ({v.created_at.strftime('%H:%M:%S')})")
    
    # Check translator versions
    trans_versions = registry.list_versions("translator")
    print(f"\n✓ 'translator' has {len(trans_versions)} version(s):")
    for v in trans_versions:
        print(f"  - {v.version}: hash={v.prompt_hash[:16]}... ({v.created_at.strftime('%H:%M:%S')})")
    
    # Test change detection
    print("\n🔍 CHANGE DETECTION")
    print("-" * 70)
    latest = registry.get_latest_version("doc_summarizer")
    if latest:
        print(f"✓ Latest version: {latest.version}")
        
        # Test with changed text
        new_text = "COMPLETELY DIFFERENT PROMPT"
        changed = registry.detect_changes("doc_summarizer", new_text)
        print(f"✓ Different text detected as changed: {changed}")
        
        # Test with same text
        same = not registry.detect_changes("doc_summarizer", latest.prompt_text)
        print(f"✓ Same text detected as unchanged: {same}")
    
    # Summary
    all_prompts = registry.get_all_prompts()
    print(f"\n✓ Total prompt families registered: {len(all_prompts)}")
    
    print("\n" + "=" * 70)
    print("📊 EXPECTED IN DASHBOARD")
    print("=" * 70)
    print("You should see 3 traces with prompt versioning data:")
    print()
    print("Trace 1 - summarize_v1:")
    print("  • prompt_id: 'doc_summarizer'")
    print("  • prompt_version: 'v1.0'")
    print("  • prompt_hash: (SHA-256 of template)")
    print()
    print("Trace 2 - summarize_v1.1:")
    print("  • prompt_id: 'doc_summarizer'")
    print("  • prompt_version: 'v1.1'")
    print("  • prompt_hash: (different hash)")
    print()
    print("Trace 3 - translate_text:")
    print("  • prompt_id: 'translator'")
    print("  • prompt_version: 'v1.0'")
    print("  • prompt_hash: (SHA-256 of template)")
    print()
    print("✅ Check http://localhost:3000")
    print()