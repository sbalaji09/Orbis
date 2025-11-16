from observability_sdk.integrations.openai_integration import instrument_openai
from observability_sdk.decorators.observe import observe
from observability_sdk.collector.config import configure
from observability_sdk.collector.collector import get_collector
from unittest.mock import Mock, patch

from observability_sdk.core.span import Span
test_span = Span(name="test", user_id="test_user")
test_span.complete()
print(test_span.to_dict())

# Configure SDK with debug enabled
configure(
    api_key="test_api_key_12345",
    api_url="http://localhost:8080",
    debug=True  # Enable debug output!
)

# Enable OpenAI instrumentation
instrument_openai()

# Create a mock OpenAI response
def create_mock_response():
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message = Mock()
    mock_response.choices[0].message.content = "Hello there friend!"
    mock_response.usage = Mock()
    mock_response.usage.prompt_tokens = 15
    mock_response.usage.completion_tokens = 8
    return mock_response

@observe("my_agent")
@patch('openai.resources.chat.completions.Completions.create')
def my_agent(mock_create):
    mock_create.return_value = create_mock_response()
    
    import openai
    client = openai.OpenAI()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Say hello in 3 words"}]
    )
    return response.choices[0].message.content

if __name__ == "__main__":
    print("Starting test...")
    result = my_agent()
    print(f"Result: {result}")
    
    # Check collector status
    collector = get_collector()
    print(f"Queue size: {collector.queue.qsize()}")
    print(f"Batch size: {len(collector.batch)}")
    
    import time
    print("Waiting 6 seconds for flush...")
    time.sleep(6)
    
    print(f"Queue size after flush: {collector.queue.qsize()}")
    print(f"Batch size after flush: {len(collector.batch)}")
    print("Test complete!")