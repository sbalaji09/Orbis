"""
Test SDK with a simple LangChain chain.
This validates that LangChain execution is automatically captured.
"""

from observability_sdk import configure, instrument_all, get_langchain_callbacks
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableConfig
from langchain_core.output_parsers import StrOutputParser
from langchain_community.llms.fake import FakeListLLM

# Configure SDK
configure(
    api_key="test_api_key_12345",
    api_url="http://localhost:8080",
    debug=True
)

# Enable instrumentation
instrument_all()

print("\n" + "="*60)
print("LANGCHAIN TEST - Simple Chain with Callbacks")
print("="*60)

# Create a simple prompt template
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    ("user", "{input}")
])

# Use a fake LLM (no API key needed)
responses = [
    "AI observability is the practice of monitoring and understanding AI system behavior in production."
]
llm = FakeListLLM(responses=responses)

# Create a simple chain
chain = prompt | llm | StrOutputParser()

# Run the chain with callbacks
print("\n" + "-"*60)
print("Running chain with input: 'Explain AI observability'")
print("-"*60 + "\n")

result = chain.invoke(
    {"input": "Explain AI observability"},
    config=RunnableConfig(callbacks=get_langchain_callbacks())  # type: ignore
)

print("\n" + "="*60)
print(f"Chain Result: {result}")
print("="*60)

# Wait for flush
import time
print("\nWaiting for flush...")
time.sleep(6)

print("\n" + "="*60)
print("Test Complete!")
print("="*60)
print("\nCheck your dashboard at http://localhost:3000")
print("Expected spans:")
print("  - Chain execution")
print("  - LLM call")
print("="*60)