"""
Test Multiple Independent DAGs
Shows how one agent can create separate, unrelated traces
"""

from observability_sdk import configure, instrument_all, observe
from google import genai
import os
import time
from datetime import datetime

# Configure
configure(
    api_key="test-key-123",
    api_url="http://localhost:8080",
    debug=True
)

instrument_all()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ========================================
# WORKFLOW 1: Content Moderation Pipeline
# ========================================

@observe("check_toxicity")
def check_toxicity(text):
    """Check if content is toxic"""
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=f"""Rate this text for toxicity on scale 1-10:

Text: {text}

Respond with just a number."""
    )
    return (response.text or "").strip()

@observe("check_spam")
def check_spam(text):
    """Check if content is spam"""
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=f"""Is this spam? Answer yes or no:

Text: {text}"""
    )
    return (response.text or "").strip()

@observe("moderate_content")
def moderate_content(content_id, text):
    """
    Complete moderation pipeline
    This creates its own independent trace
    """
    print(f"\n🛡️  Moderating content: {content_id}")
    
    toxicity = check_toxicity(text)
    is_spam = check_spam(text)
    
    decision = "APPROVED" if toxicity < 5 and is_spam == "no" else "REJECTED"
    
    return {
        "content_id": content_id,
        "toxicity_score": toxicity,
        "is_spam": is_spam,
        "decision": decision
    }

# ========================================
# WORKFLOW 2: Translation Pipeline
# ========================================

@observe("detect_language")
def detect_language(text):
    """Detect language of text"""
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=f"""What language is this? Answer with just the language name:

Text: {text}"""
    )
    return (response.text or "").strip()

@observe("translate_text")
def translate_text(text, target_language):
    """Translate text to target language"""
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=f"""Translate this to {target_language}:

{text}"""
    )
    return (response.text or "").strip()

@observe("translation_pipeline")
def translation_pipeline(task_id, text, target_lang="Spanish"):
    """
    Complete translation pipeline
    This creates its own independent trace
    """
    print(f"\n🌍 Translating task: {task_id}")
    
    source_lang = detect_language(text)
    translated = translate_text(text, target_lang)
    
    return {
        "task_id": task_id,
        "source_language": source_lang,
        "target_language": target_lang,
        "translation": translated
    }

# ========================================
# WORKFLOW 3: Summarization Pipeline
# ========================================

@observe("extract_key_points")
def extract_key_points(text):
    """Extract key points from text"""
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=f"""List 3 key points from this text:

{text}

Format as bullet points."""
    )
    return response.text

@observe("generate_summary")
def generate_summary(text, key_points):
    """Generate summary from key points"""
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=f"""Write a 1-sentence summary based on these key points:

{key_points}"""
    )
    return (response.text or "").strip()

@observe("summarization_pipeline")
def summarization_pipeline(doc_id, text):
    """
    Complete summarization pipeline
    This creates its own independent trace
    """
    print(f"\n📄 Summarizing document: {doc_id}")
    
    key_points = extract_key_points(text)
    summary = generate_summary(text, key_points)
    
    return {
        "doc_id": doc_id,
        "key_points": key_points,
        "summary": summary
    }

# ========================================
# MAIN: Run Multiple Independent Workflows
# ========================================

if __name__ == "__main__":
    print("🚀 Multi-DAG Test: Multiple Independent Workflows")
    print("=" * 70)
    
    # Each of these creates a SEPARATE trace/DAG
    
    # DAG 1: Moderation
    result1 = moderate_content(
        "POST-001",
        "Hey everyone! Check out this amazing product at www.spam-link.com"
    )
    print(f"✓ Moderation result: {result1['decision']}")
    
    time.sleep(1)  # Small delay between workflows
    
    # DAG 2: Translation
    result2 = translation_pipeline(
        "TRANS-001",
        "Hello, how are you today?",
        "French"
    )
    print(f"✓ Translation: {result2['translation']}")
    
    time.sleep(1)
    
    # DAG 3: Summarization
    result3 = summarization_pipeline(
        "DOC-001",
        "Artificial intelligence is transforming healthcare through improved diagnostics, "
        "personalized treatment plans, and drug discovery. Machine learning models can "
        "analyze medical imaging data to detect diseases early. AI-powered systems assist "
        "doctors in making more accurate diagnoses and treatment decisions."
    )
    print(f"✓ Summary: {result3['summary']}")
    
    time.sleep(1)
    
    # DAG 4: Another moderation (separate trace)
    result4 = moderate_content(
        "POST-002",
        "This is a friendly message to say hello!"
    )
    print(f"✓ Moderation result: {result4['decision']}")
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 MULTI-DAG TEST SUMMARY")
    print("=" * 70)
    print("Expected in dashboard: 4 SEPARATE traces/DAGs")
    print()
    print("DAG 1: moderate_content (POST-001)")
    print("├── check_toxicity")
    print("│   └── gemini")
    print("└── check_spam")
    print("    └── gemini")
    print()
    print("DAG 2: translation_pipeline (TRANS-001)")
    print("├── detect_language")
    print("│   └── gemini")
    print("└── translate_text")
    print("    └── gemini")
    print()
    print("DAG 3: summarization_pipeline (DOC-001)")
    print("├── extract_key_points")
    print("│   └── gemini")
    print("└── generate_summary")
    print("    └── gemini")
    print()
    print("DAG 4: moderate_content (POST-002)")
    print("├── check_toxicity")
    print("│   └── gemini")
    print("└── check_spam")
    print("    └── gemini")
    
    # Wait for flush
    print("\n⏳ Waiting for spans to flush...")
    time.sleep(6)
    
    print("\n✅ Done! Check http://localhost:3000")
    print("You should see 4 separate traces in the trace list!")