"""
LLM Provider Integrations
"""

from .openai_integration import instrument_openai, uninstrument_openai
from .anthropic_integration import instrument_anthropic, uninstrument_anthropic
from .gemini_integration import instrument_gemini, uninstrument_gemini
from .langchain_integration import instrument_langchain, uninstrument_langchain, get_langchain_callbacks

__all__ = [
    "instrument_openai",
    "uninstrument_openai",
    "instrument_anthropic",
    "uninstrument_anthropic",
    "instrument_gemini",
    "uninstrument_gemini",
    "instrument_langchain",
    "uninstrument_langchain",
    "get_langchain_callbacks",
    "instrument_all",
    "uninstrument_all",
]

def instrument_all():
    """Enable auto-instrumentation for all supported LLM providers"""
    instrument_openai()
    instrument_anthropic()
    instrument_gemini()
    instrument_langchain()
    print("✓ All LLM providers instrumented")

def uninstrument_all():
    """Disable auto-instrumentation for all LLM providers"""
    uninstrument_openai()
    uninstrument_anthropic()
    uninstrument_gemini()
    uninstrument_langchain()
    print("✓ All LLM providers uninstrumented")