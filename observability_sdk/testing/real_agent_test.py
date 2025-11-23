"""
Real-World Customer Support Agent Test
Processes multiple support tickets with different complexity levels
"""

from observability_sdk import configure, instrument_all, observe
from google import genai
import os
import time
from datetime import datetime

# Configure Orbis
configure(
    api_key="test-key-123",
    api_url="http://localhost:8080",
    debug=True
)

# Enable instrumentation
instrument_all()

# Initialize Gemini
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Knowledge base for the support agent
KNOWLEDGE_BASE = """
Product: CloudSync Pro - Enterprise Cloud Storage Solution

Common Issues:
1. Sync Errors: Usually caused by network issues or file conflicts
2. Login Problems: Check MFA settings and password requirements
3. Storage Limits: Enterprise plan includes 10TB, can upgrade to unlimited
4. API Rate Limits: 1000 requests/hour on standard, 10000 on enterprise
5. Mobile App: Available on iOS 14+ and Android 10+

Pricing:
- Standard: $29/month (1TB)
- Professional: $99/month (5TB)
- Enterprise: $299/month (10TB + priority support)
"""

@observe("categorize_ticket")
def categorize_ticket(ticket):
    """Categorize support ticket by urgency and type"""
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=f"""Analyze this support ticket and categorize it:

Ticket: {ticket}

Respond in this format:
Priority: [high/medium/low]
Category: [technical/billing/general]
Sentiment: [frustrated/neutral/happy]
One-line summary: [brief summary]"""
    )
    return response.text

@observe("search_knowledge_base")
def search_knowledge_base(query):
    """Search knowledge base for relevant information"""
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=f"""Given this knowledge base:

{KNOWLEDGE_BASE}

User query: {query}

Find the most relevant information and return it in a concise format."""
    )
    return response.text

@observe("generate_response")
def generate_response(ticket, category_info, kb_info):
    """Generate professional support response"""
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=f"""You are a professional customer support agent for CloudSync Pro.

Ticket Analysis:
{category_info}

Relevant Information:
{kb_info}

Original Ticket:
{ticket}

Generate a helpful, empathetic support response that:
1. Acknowledges the customer's issue
2. Provides a clear solution or next steps
3. Is professional but friendly
4. Includes any relevant links or resources
5. Ends with an offer to help further"""
    )
    return response.text

@observe("quality_check")
def quality_check(response):
    """Check response quality before sending"""
    check = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=f"""Review this support response for quality:

{response}

Check for:
1. Professional tone
2. Clear solution provided
3. No technical jargon
4. Empathy and acknowledgment
5. Call to action

Respond with: APPROVED or NEEDS_REVISION: [reason]"""
    )
    return check.text

@observe("customer_support_agent")
def process_support_ticket(ticket_id, ticket_text):
    """Main agent workflow - process one support ticket"""
    print(f"\n{'='*60}")
    print(f"Processing Ticket #{ticket_id}")
    print(f"{'='*60}")
    
    # Step 1: Categorize the ticket
    print("📋 Categorizing ticket...")
    category_info = categorize_ticket(ticket_text)
    print(f"✓ Category: {category_info[:50]}...")
    
    # Step 2: Search knowledge base
    print("🔍 Searching knowledge base...")
    kb_info = search_knowledge_base(ticket_text)
    print(f"✓ Found relevant info")
    
    # Step 3: Generate response
    print("✍️  Generating response...")
    response = generate_response(ticket_text, category_info, kb_info)
    print(f"✓ Response generated")
    
    # Step 4: Quality check
    print("✅ Quality checking...")
    quality = quality_check(response)
    print(f"✓ Quality check: {quality[:30]}...")
    
    return {
        "ticket_id": ticket_id,
        "category": category_info,
        "response": response,
        "quality": quality,
        "timestamp": datetime.now().isoformat()
    }

@observe("batch_ticket_processor")
def process_ticket_batch(tickets):
    """Process multiple support tickets in batch"""
    results = []
    
    for ticket_id, ticket_text in tickets:
        try:
            result = process_support_ticket(ticket_id, ticket_text)
            results.append(result)
            print(f"✓ Ticket #{ticket_id} completed\n")
        except Exception as e:
            print(f"❌ Error processing ticket #{ticket_id}: {e}\n")
            results.append({
                "ticket_id": ticket_id,
                "error": str(e)
            })
    
    return results

if __name__ == "__main__":
    print("🤖 Customer Support AI Agent - Real-World Test")
    print("=" * 60)
    
    # Realistic support tickets
    tickets = [
        (
            "CS-1001",
            "Hi, I'm trying to sync my files but keep getting an error message saying 'Sync failed: Connection timeout'. This has been happening for the past 2 hours and I have an important presentation due tomorrow. Very frustrated! Can you help ASAP?"
        ),
        (
            "CS-1002", 
            "Hello, I'm on the Standard plan but running out of storage. What are my options to upgrade? Also, do you offer any discounts for annual billing?"
        ),
        (
            "CS-1003",
            "Can't log into my account. I've tried resetting my password twice but still getting 'Authentication failed'. I have MFA enabled. Is there an issue with your servers?"
        ),
        (
            "CS-1004",
            "Quick question - does your mobile app work on Android 9? I see the requirements say Android 10+ but wanted to check if there's a workaround."
        ),
        (
            "CS-1005",
            "We're hitting API rate limits during our peak hours. Our dev team is getting 429 errors. We're on the Enterprise plan - shouldn't we have higher limits? Need this resolved urgently as it's affecting our production system."
        ),
    ]
    
    # Process all tickets
    start_time = time.time()
    results = process_ticket_batch(tickets)
    end_time = time.time()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 BATCH PROCESSING SUMMARY")
    print("=" * 60)
    print(f"Total tickets processed: {len(results)}")
    print(f"Successful: {len([r for r in results if 'error' not in r])}")
    print(f"Failed: {len([r for r in results if 'error' in r])}")
    print(f"Total processing time: {end_time - start_time:.2f} seconds")
    print(f"Average time per ticket: {(end_time - start_time) / len(tickets):.2f} seconds")
    
    # Wait for flush
    print("\n⏳ Waiting for spans to flush...")
    time.sleep(6)
    
    print("\n✅ Done! Check dashboard at http://localhost:3000")
    print("\nExpected trace structure:")
    print("batch_ticket_processor (parent)")
    print("├── customer_support_agent (ticket 1)")
    print("│   ├── categorize_ticket")
    print("│   │   └── gemini.gemini-2.5-flash-lite")
    print("│   ├── search_knowledge_base")
    print("│   │   └── gemini.gemini-2.5-flash-lite")
    print("│   ├── generate_response")
    print("│   │   └── gemini.gemini-2.5-flash-lite")
    print("│   └── quality_check")
    print("│       └── gemini.gemini-2.5-flash-lite")
    print("├── customer_support_agent (ticket 2)")
    print("│   └── ... (same structure)")
    print("└── ... (tickets 3-5)")
