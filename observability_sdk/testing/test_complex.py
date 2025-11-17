from observability_sdk.decorators.observe import observe
from observability_sdk.collector.config import configure

# Configure SDK
configure(
    api_key="test_api_key_12345",
    api_url="http://localhost:8080",
    debug=True
)

@observe("complex_agent")
def complex_agent():
    # Simulate multiple steps
    step1_result = data_fetch()
    step2_result = process_data(step1_result)
    step3_result = generate_response(step2_result)
    return step3_result

@observe("data_fetch")
def data_fetch():
    return "raw_data"

@observe("process_data")
def process_data(data):
    cleaned = clean_data(data)
    return f"processed_{cleaned}"

@observe("clean_data")
def clean_data(data):
    return f"cleaned_{data}"

@observe("generate_response")
def generate_response(data):
    return f"final_response_from_{data}"

if __name__ == "__main__":
    print("Running complex agent...")
    result = complex_agent()
    print(f"Result: {result}")
    
    import time
    print("Waiting for flush...")
    time.sleep(6)
    print("Done!")