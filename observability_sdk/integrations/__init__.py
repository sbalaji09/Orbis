"""
LLM Provider Integrations
"""

from .openai_integration import instrument_openai, uninstrument_openai
from .anthropic_integration import instrument_anthropic, uninstrument_anthropic
from .gemini_integration import instrument_gemini, uninstrument_gemini
from .langchain_integration import instrument_langchain, uninstrument_langchain, get_langchain_callbacks
from .xai_integration import instrument_xai, uninstrument_xai
from .groq_integration import instrument_groq, uninstrument_groq
from .mistral_integration import instrument_mistral, uninstrument_mistral
from .deepseek_integration import instrument_deepseek, uninstrument_deepseek

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
    "instrument_xai",
    "uninstrument_xai",
    "instrument_groq",
    "uninstrument_groq",
    "instrument_mistral",
    "uninstrument_mistral",
    "instrument_deepseek",
    "uninstrument_deepseek",
    "instrument_all",
    "uninstrument_all",
]

def instrument_all():
    """Enable auto-instrumentation for all supported LLM providers"""
    instrument_openai()
    instrument_anthropic()
    instrument_gemini()
    instrument_langchain()
    instrument_xai()
    instrument_groq()
    instrument_mistral()
    instrument_deepseek()
    print("✓ All LLM providers instrumented")

def uninstrument_all():
    """Disable auto-instrumentation for all LLM providers"""
    uninstrument_openai()
    uninstrument_anthropic()
    uninstrument_gemini()
    uninstrument_langchain()
    uninstrument_xai()
    uninstrument_groq()
    uninstrument_mistral()
    uninstrument_deepseek()
    print("✓ All LLM providers uninstrumented")