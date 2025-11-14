from observability_sdk.core.span import Span
from observability_sdk.collector.collector import get_collector
from observability_sdk.collector.config import configure
import time

configure(
    debug=True, 
    api_url="http://localhost:8080",
    api_key="sk_live_6Ank6nzt39BE7pDnnM7iJ1d_aDKmSc5jqS-KHTEimDw"
)

trace_id = "5a1a5ecc-4de7-42f0-b5c4-1bed7115daaf"
user_id = "b4cbdac0-016b-4ea4-9207-b89beae02099"

collector = get_collector()

# Create and send parent span FIRST
parent_span = Span(
    name="parent_op_v2",
    user_id=user_id,
    trace_id=trace_id,
    agent_id=1,
    model="gpt-4",
    input_data="Parent input",
    output_data="Parent output",
    input_tokens=10,
    output_tokens=5,
    total_cost=0.0001
)
time.sleep(0.1)
parent_span.complete()

collector.collect(parent_span)
time.sleep(1)
collector.flush()

# Wait for parent to be processed
print("Waiting for parent to be processed...")
time.sleep(5)

# Now send child
child_span = Span(
    name="child_op_v2",
    user_id=user_id,
    trace_id=trace_id,
    parent_span_id=[parent_span.span_id],  # Reference parent
    agent_id=1,
    model="gpt-4",
    input_data="Child input",
    output_data="Child output",
    input_tokens=10,
    output_tokens=5,
    total_cost=0.0001
)
time.sleep(0.1)
child_span.complete()

collector.collect(child_span)
time.sleep(1)
collector.flush()
time.sleep(3)

print("✓ Check dashboard for connected spans!")