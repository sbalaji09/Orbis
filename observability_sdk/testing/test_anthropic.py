from observability_sdk.integrations.anthropic_integration import instrument_anthropic
from observability_sdk.decorators.observe import observe
from observability_sdk.collector.config import configure

# Configure SDK
configure(
    api_key="test_api_key_12345",
    api_url="http://localhost:8080",
    debug=True
)

# Enable Anthropic instrumentation
instrument_anthropic()

@observe("ai_assistant")
def ai_assistant():
    # Simulate calling another function instead of mocking Anthropic
    result = anthropic_call()
    return result

@observe("anthropic_call")
def anthropic_call():
    return "Hello! I'm Claude, nice to meet you!"

if __name__ == "__main__":
    print("Starting Anthropic test...")
    result = ai_assistant()
    print(f"Result: {result}")
    
    from observability_sdk.collector.collector import get_collector
    collector = get_collector()
    print(f"Queue size: {collector.queue.qsize()}")
    print(f"Batch size: {len(collector.batch)}")
    
    import time
    print("Waiting 6 seconds for flush...")
    time.sleep(6)
    
    print(f"Queue size after flush: {collector.queue.qsize()}")
    print(f"Batch size after flush: {len(collector.batch)}")
    print("Test complete!")