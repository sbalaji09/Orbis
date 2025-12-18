"""
Enterprise Customer Support AI Agent - Production Scenario

Real-world use case: E-commerce company needs to track their AI support agent that:
- Handles customer inquiries about orders
- Processes refunds
- Updates CRM records
- Sends email notifications
- Escalates to human agents when needed

This is what a company would actually use to monitor their AI agent in production.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from observability_sdk import configure, instrument_all, observe, observe_tool, instrument_http
from observability_sdk.collector.collector import get_collector
import openai
import time
import json
from datetime import datetime, timedelta
import random

GROQ_API_KEY = "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"

try:
    import httpx
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("Install with: pip install httpx openai")
    sys.exit(1)

# Configure Orbis - This is what the company would use to track their agent
configure(
    api_key="test-tool-tracking-key-123",
    project_id="616d8f4e-8b03-4112-a40c-a61164977cb5",
    user_id="00000000-0000-0000-0000-000000000000",
    api_url="http://localhost:8080",
)

instrument_all()
instrument_http(httpx)

# Configure OpenAI client for Groq
client = openai.OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

# ============================================================================
# MOCK DATABASE - Simulates company's internal systems
# ============================================================================

# Mock customer database
CUSTOMERS_DB = {
    "CUST-12345": {
        "id": "CUST-12345",
        "name": "Sarah Johnson",
        "email": "sarah.j@email.com",
        "tier": "Premium",
        "lifetime_value": 5420.00,
        "satisfaction_score": 4.8,
        "total_orders": 28
    },
    "CUST-67890": {
        "id": "CUST-67890",
        "name": "Michael Chen",
        "email": "m.chen@company.com",
        "tier": "Standard",
        "lifetime_value": 890.00,
        "satisfaction_score": 4.2,
        "total_orders": 5
    }
}

# Mock orders database
ORDERS_DB = {
    "ORD-2024-001": {
        "order_id": "ORD-2024-001",
        "customer_id": "CUST-12345",
        "status": "delivered",
        "total": 159.99,
        "items": ["Wireless Headphones", "Phone Case"],
        "order_date": "2024-12-10",
        "delivery_date": "2024-12-14",
        "tracking_number": "1Z999AA10123456784"
    },
    "ORD-2024-002": {
        "order_id": "ORD-2024-002",
        "customer_id": "CUST-67890",
        "status": "shipped",
        "total": 89.99,
        "items": ["USB-C Cable"],
        "order_date": "2024-12-15",
        "delivery_date": None,
        "tracking_number": "1Z999AA10123456785"
    }
}

# ============================================================================
# CRM TOOLS - Customer Relationship Management
# ============================================================================

@observe_tool(name="get_customer_profile", category="database")
def get_customer_profile(customer_id: str) -> dict:
    """Fetch customer profile from CRM database"""
    print(f"   🔍 Looking up customer {customer_id} in CRM...")

    # Simulate database query latency
    time.sleep(0.1)

    customer = CUSTOMERS_DB.get(customer_id)
    if not customer:
        raise ValueError(f"Customer {customer_id} not found")

    print(f"   ✅ Found: {customer['name']} ({customer['tier']} tier)")
    return customer

@observe_tool(name="update_customer_notes", category="database")
def update_customer_notes(customer_id: str, note: str) -> dict:
    """Add a note to customer's CRM record"""
    print(f"   📝 Adding note to {customer_id} CRM record...")

    # Simulate database write
    time.sleep(0.05)

    timestamp = datetime.now().isoformat()
    print(f"   ✅ Note added at {timestamp}")

    return {
        "customer_id": customer_id,
        "note": note,
        "timestamp": timestamp,
        "added_by": "AI Support Agent"
    }

# ============================================================================
# ORDER MANAGEMENT TOOLS
# ============================================================================

@observe_tool(name="lookup_order_status", category="database")
def lookup_order_status(order_id: str) -> dict:
    """Check order status in order management system"""
    print(f"   📦 Looking up order {order_id}...")

    # Simulate database query
    time.sleep(0.1)

    order = ORDERS_DB.get(order_id)
    if not order:
        raise ValueError(f"Order {order_id} not found")

    print(f"   ✅ Status: {order['status'].upper()}")
    return order

@observe_tool(name="process_refund", category="payment")
def process_refund(order_id: str, amount: float, reason: str) -> dict:
    """Process refund through payment gateway"""
    print(f"   💳 Processing ${amount:.2f} refund for {order_id}...")

    # Simulate payment gateway API call
    time.sleep(0.3)

    refund_id = f"REF-{random.randint(10000, 99999)}"

    print(f"   ✅ Refund {refund_id} approved")

    return {
        "refund_id": refund_id,
        "order_id": order_id,
        "amount": amount,
        "reason": reason,
        "status": "approved",
        "processed_at": datetime.now().isoformat()
    }

# ============================================================================
# SHIPPING & LOGISTICS TOOLS
# ============================================================================

@observe_tool(name="track_shipment", category="api")
def track_shipment(tracking_number: str) -> dict:
    """Query shipping carrier API for package tracking"""
    print(f"   🚚 Tracking package {tracking_number}...")

    # Simulate API latency (in production, this would be a real API call)
    time.sleep(0.2)

    # Simulate tracking data
    tracking_info = {
        "tracking_number": tracking_number,
        "status": "In Transit",
        "location": "Memphis, TN Distribution Center",
        "estimated_delivery": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d"),
        "last_update": datetime.now().isoformat(),
        "events": [
            {"time": "2024-12-17 08:30", "status": "Departed facility", "location": "Los Angeles, CA"},
            {"time": "2024-12-17 14:20", "status": "Arrived at sort facility", "location": "Memphis, TN"}
        ]
    }

    print(f"   ✅ Package location: {tracking_info['location']}")
    return tracking_info

# ============================================================================
# NOTIFICATION TOOLS
# ============================================================================

@observe_tool(name="send_email_notification", category="communication")
def send_email(recipient: str, subject: str, body: str) -> dict:
    """Send email via SendGrid/Mailgun"""
    print(f"   📧 Sending email to {recipient}...")

    # Simulate email API latency (in production, this would call SendGrid/Mailgun)
    time.sleep(0.15)

    message_id = f"MSG-{random.randint(100000, 999999)}"

    print(f"   ✅ Email sent (ID: {message_id})")

    return {
        "message_id": message_id,
        "recipient": recipient,
        "subject": subject,
        "status": "sent",
        "sent_at": datetime.now().isoformat()
    }

@observe_tool(name="send_sms_notification", category="communication")
def send_sms(phone: str, message: str) -> dict:
    """Send SMS via Twilio"""
    print(f"   📱 Sending SMS to {phone}...")

    # Simulate Twilio API latency (in production, this would call Twilio)
    time.sleep(0.2)

    sms_id = f"SM{random.randint(10000000, 99999999)}"

    print(f"   ✅ SMS sent (ID: {sms_id})")

    return {
        "sms_id": sms_id,
        "to": phone,
        "status": "delivered",
        "sent_at": datetime.now().isoformat()
    }

# ============================================================================
# TICKETING SYSTEM TOOLS
# ============================================================================

@observe_tool(name="create_support_ticket", category="ticketing")
def create_support_ticket(customer_id: str, subject: str, description: str, priority: str) -> dict:
    """Create ticket in Zendesk/Jira"""
    print(f"   🎫 Creating {priority} priority ticket...")

    # Simulate ticketing API
    time.sleep(0.2)

    ticket_id = f"TICKET-{random.randint(10000, 99999)}"

    print(f"   ✅ Ticket {ticket_id} created")

    return {
        "ticket_id": ticket_id,
        "customer_id": customer_id,
        "subject": subject,
        "description": description,
        "priority": priority,
        "status": "open",
        "assigned_to": None,
        "created_at": datetime.now().isoformat()
    }

@observe_tool(name="escalate_to_human", category="ticketing")
def escalate_to_human(ticket_id: str, reason: str, department: str) -> dict:
    """Escalate issue to human agent"""
    print(f"   ⚠️ Escalating {ticket_id} to {department}...")

    # Simulate escalation workflow
    time.sleep(0.15)

    escalation_id = f"ESC-{random.randint(1000, 9999)}"

    print(f"   ✅ Escalated (ID: {escalation_id})")

    return {
        "escalation_id": escalation_id,
        "ticket_id": ticket_id,
        "department": department,
        "reason": reason,
        "escalated_at": datetime.now().isoformat(),
        "status": "pending_assignment"
    }

# ============================================================================
# MAIN AI AGENT - Customer Support Handler
# ============================================================================

@observe(
    name="customer_support_agent",
    prompt_id="support_agent_v2",
    prompt_version="2.1.0",
    prompt_template="Handle customer support inquiries with empathy and efficiency"
)
def handle_customer_inquiry(customer_id: str, inquiry_type: str, details: dict):
    """
    Main AI agent that handles customer support requests.

    This is what a real company would deploy to production and need to monitor:
    - Every customer interaction tracked
    - All LLM decisions visible
    - Tool usage audited
    - Performance metrics collected
    """

    print(f"\n{'='*80}")
    print(f"🤖 CUSTOMER SUPPORT AI AGENT")
    print(f"{'='*80}")
    print(f"📋 Customer ID: {customer_id}")
    print(f"📋 Inquiry Type: {inquiry_type}")
    print(f"{'='*80}\n")

    # ========================================================================
    # STEP 1: Retrieve Customer Profile
    # ========================================================================
    print("1️⃣ Retrieving customer profile from CRM...")
    customer = get_customer_profile(customer_id)
    print()

    # ========================================================================
    # STEP 2: AI analyzes customer context and plans response
    # ========================================================================
    print("2️⃣ AI analyzing customer context...")
    print("   💬 ", end="", flush=True)

    context_analysis = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a customer service analyst. Analyze customer context briefly."},
            {"role": "user", "content": f"""
Analyze this customer:
- Name: {customer['name']}
- Tier: {customer['tier']}
- Lifetime Value: ${customer['lifetime_value']:.2f}
- Satisfaction: {customer['satisfaction_score']}/5.0
- Total Orders: {customer['total_orders']}

Inquiry Type: {inquiry_type}

In 2 sentences, what should our approach be for this customer?
"""}
        ],
        max_tokens=150,
        temperature=0.7,
        stream=True
    )

    approach = ""
    for chunk in context_analysis:
        if chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            approach += content
            print(content, end="", flush=True)
    print("\n   ✅ Context analyzed\n")

    # ========================================================================
    # STEP 3: Handle specific inquiry type
    # ========================================================================
    result = {}

    if inquiry_type == "order_status":
        print("3️⃣ Handling ORDER STATUS inquiry...")
        order_id = details.get("order_id")

        # Look up order
        order = lookup_order_status(order_id)

        # Track shipment
        tracking = track_shipment(order["tracking_number"])

        # AI generates customer-friendly response
        print("\n   🧠 AI generating response...")
        print("   💬 ", end="", flush=True)

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful customer service agent. Be warm and informative."},
                {"role": "user", "content": f"""
Write a brief, friendly message to {customer['name']} about their order:

Order: {order['order_id']}
Status: {order['status']}
Items: {', '.join(order['items'])}
Current Location: {tracking['location']}
Estimated Delivery: {tracking['estimated_delivery']}

Keep it to 3 sentences.
"""}
            ],
            max_tokens=200,
            temperature=0.7,
            stream=True
        )

        customer_message = ""
        for chunk in response:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                customer_message += content
                print(content, end="", flush=True)
        print("\n")

        # Send email notification
        email_result = send_email(
            recipient=customer['email'],
            subject=f"Your Order {order_id} Update",
            body=customer_message
        )

        result = {
            "order": order,
            "tracking": tracking,
            "notification": email_result,
            "message": customer_message
        }

    elif inquiry_type == "refund_request":
        print("3️⃣ Handling REFUND REQUEST...")
        order_id = details.get("order_id")
        reason = details.get("reason")

        # Look up order
        order = lookup_order_status(order_id)

        # AI decides if refund should be approved
        print("\n   🧠 AI evaluating refund eligibility...")
        print("   💬 ", end="", flush=True)

        evaluation = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a refund policy expert. Respond with APPROVE or ESCALATE."},
                {"role": "user", "content": f"""
Customer: {customer['tier']} tier, {customer['satisfaction_score']}/5 rating
Order Value: ${order['total']:.2f}
Order Date: {order['order_date']}
Reason: {reason}

Should we APPROVE refund automatically or ESCALATE to human review? Respond with one word.
"""}
            ],
            max_tokens=10,
            temperature=0.3,
            stream=True
        )

        decision = ""
        for chunk in evaluation:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                decision += content
                print(content, end="", flush=True)
        decision = decision.strip().upper()
        print("\n")

        if "APPROVE" in decision:
            # Process refund
            refund = process_refund(
                order_id=order_id,
                amount=order['total'],
                reason=reason
            )

            # Send confirmation
            email_result = send_email(
                recipient=customer['email'],
                subject=f"Refund Approved - {order_id}",
                body=f"Your refund of ${order['total']:.2f} has been approved and will be processed within 3-5 business days."
            )

            result = {
                "decision": "approved",
                "refund": refund,
                "notification": email_result
            }
        else:
            # Escalate to human
            ticket = create_support_ticket(
                customer_id=customer_id,
                subject=f"Refund Request Review - {order_id}",
                description=f"Customer requesting refund. Reason: {reason}. Order total: ${order['total']:.2f}",
                priority="high" if customer['tier'] == "Premium" else "medium"
            )

            escalation = escalate_to_human(
                ticket_id=ticket['ticket_id'],
                reason="Refund requires manual review",
                department="Customer Success"
            )

            result = {
                "decision": "escalated",
                "ticket": ticket,
                "escalation": escalation
            }

    elif inquiry_type == "complaint":
        print("3️⃣ Handling CUSTOMER COMPLAINT...")
        complaint = details.get("complaint")

        # AI analyzes sentiment and urgency
        print("\n   🧠 AI analyzing complaint severity...")
        print("   💬 ", end="", flush=True)

        sentiment_analysis = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Rate complaint urgency as LOW, MEDIUM, HIGH, or CRITICAL."},
                {"role": "user", "content": f"""
Customer: {customer['tier']} tier
Complaint: {complaint}

Rate urgency in one word: LOW, MEDIUM, HIGH, or CRITICAL.
"""}
            ],
            max_tokens=10,
            temperature=0.3,
            stream=True
        )

        urgency = ""
        for chunk in sentiment_analysis:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                urgency += content
                print(content, end="", flush=True)
        urgency = urgency.strip().upper()
        print("\n")

        # Create ticket
        priority = "critical" if "CRITICAL" in urgency or "HIGH" in urgency else "medium"
        ticket = create_support_ticket(
            customer_id=customer_id,
            subject="Customer Complaint",
            description=complaint,
            priority=priority
        )

        # For high-value customers or critical issues, escalate immediately
        if customer['tier'] == "Premium" or "CRITICAL" in urgency:
            escalation = escalate_to_human(
                ticket_id=ticket['ticket_id'],
                reason=f"Premium customer / {urgency} urgency",
                department="Customer Success Manager"
            )
            result = {
                "ticket": ticket,
                "escalation": escalation,
                "urgency": urgency
            }
        else:
            # AI generates empathetic response
            print("\n   🧠 AI crafting response...")
            print("   💬 ", end="", flush=True)

            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "Write an empathetic customer service response."},
                    {"role": "user", "content": f"""
Write a 3-sentence empathetic response to this complaint:
{complaint}

Acknowledge their concern, apologize, and assure them we're investigating.
"""}
                ],
                max_tokens=200,
                temperature=0.7,
                stream=True
            )

            message = ""
            for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    message += content
                    print(content, end="", flush=True)
            print("\n")

            email_result = send_email(
                recipient=customer['email'],
                subject="We're Here to Help",
                body=message
            )

            result = {
                "ticket": ticket,
                "response": message,
                "notification": email_result,
                "urgency": urgency
            }

    # ========================================================================
    # STEP 4: Update CRM with interaction notes
    # ========================================================================
    print("\n4️⃣ Updating CRM record...")
    note = f"AI Agent handled {inquiry_type} inquiry. Result: {json.dumps(result, indent=2)}"
    crm_update = update_customer_notes(customer_id, note)
    print()

    # ========================================================================
    # DONE
    # ========================================================================
    print("=" * 80)
    print("✅ INQUIRY RESOLVED")
    print("=" * 80)

    return {
        "customer": customer,
        "inquiry_type": inquiry_type,
        "approach": approach,
        "result": result,
        "crm_update": crm_update,
        "timestamp": datetime.now().isoformat()
    }

# ============================================================================
# TEST SCENARIOS
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*80)
    print("🏢 ENTERPRISE CUSTOMER SUPPORT AI AGENT - PRODUCTION MONITORING")
    print("="*80)
    print("\nThis simulates a real company's AI agent handling customer support.")
    print("Every action is tracked in Orbis for compliance and quality assurance.\n")

    # Scenario 1: Order Status Check
    print("\n📦 SCENARIO 1: Customer checking order status")
    print("-" * 80)
    result1 = handle_customer_inquiry(
        customer_id="CUST-12345",
        inquiry_type="order_status",
        details={"order_id": "ORD-2024-001"}
    )

    time.sleep(2)

    # Scenario 2: Refund Request
    print("\n\n💰 SCENARIO 2: Customer requesting refund")
    print("-" * 80)
    result2 = handle_customer_inquiry(
        customer_id="CUST-67890",
        inquiry_type="refund_request",
        details={
            "order_id": "ORD-2024-002",
            "reason": "Product arrived damaged"
        }
    )

    time.sleep(2)

    # Scenario 3: Complaint
    print("\n\n😠 SCENARIO 3: Customer complaint")
    print("-" * 80)
    result3 = handle_customer_inquiry(
        customer_id="CUST-12345",
        inquiry_type="complaint",
        details={
            "complaint": "I've been waiting 3 days for a response to my email about a missing item in my order. This is unacceptable for a Premium customer!"
        }
    )

    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("\n\n" + "="*80)
    print("📊 WHAT YOU'LL SEE IN ORBIS DASHBOARD")
    print("="*80)

    print("\n🎯 Real Business Value:")
    print("   • Track every customer interaction")
    print("   • Monitor AI decision quality")
    print("   • Audit refund approvals")
    print("   • Measure response times")
    print("   • Identify escalation patterns")
    print("   • Ensure compliance")

    print("\n🌲 Trace Structure (per scenario):")
    print("   customer_support_agent (root)")
    print("   ├─ get_customer_profile (database query)")
    print("   ├─ openai.llama-3.3-70b-versatile (context analysis)")
    print("   ├─ lookup_order_status (database query)")
    print("   ├─ track_shipment (HTTP API call)")
    print("   ├─ openai.llama-3.3-70b-versatile (response generation)")
    print("   ├─ send_email_notification (HTTP API call)")
    print("   └─ update_customer_notes (database write)")

    print("\n📈 Metrics to Monitor:")
    print("   • Average resolution time per inquiry type")
    print("   • LLM decision accuracy (approve vs escalate)")
    print("   • API failure rates (email, SMS, tracking)")
    print("   • Customer tier vs escalation rate")
    print("   • Cost per customer interaction")

    print("\n💼 Production Use Cases:")
    print("   1. Quality Assurance: Review AI responses before going live")
    print("   2. Compliance: Audit all refund decisions")
    print("   3. Cost Control: Track LLM token usage per customer")
    print("   4. Performance: Identify slow API calls")
    print("   5. Training: Analyze when AI escalates vs handles autonomously")

    print("\n🚀 Check your dashboard at http://localhost:3000")
    print("\n💡 TIP: Filter by customer_id or inquiry_type to see patterns\n")

    # Flush to Orbis
    print("📤 Sending all traces to Orbis...")
    get_collector().flush()
    time.sleep(3)
    print("✅ All customer interactions logged!\n")
