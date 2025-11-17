from observability_sdk.integrations.openai_integration import instrument_openai
from observability_sdk.decorators.observe import observe
from observability_sdk.collector.config import configure

# Configure SDK
configure(
    api_key="test_api_key_12345",
    api_url="http://localhost:8080",
    debug=True
)

# Enable OpenAI instrumentation - we won't actually use it in this test
instrument_openai()

@observe("my_agent")
def my_agent():
    # Simulate calling a child function
    result = child_operation()
    return result

@observe("child_operation")
def child_operation():
    return "Hello there friend!"

if __name__ == "__main__":
    print("Starting test...")
    result = my_agent()
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