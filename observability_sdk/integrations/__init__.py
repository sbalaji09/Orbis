"""
LLM Provider Integrations
"""

def _noop_instrumentor(provider: str):
    def instrument():
        print(f"⚠️  Skipping {provider} instrumentation (optional dependency not installed)")

    def uninstrument():
        return

    return instrument, uninstrument


try:
    from .openai_integration import instrument_openai, uninstrument_openai
except ImportError:
    instrument_openai, uninstrument_openai = _noop_instrumentor("openai")

try:
    from .anthropic_integration import instrument_anthropic, uninstrument_anthropic
except ImportError:
    instrument_anthropic, uninstrument_anthropic = _noop_instrumentor("anthropic")

try:
    from .gemini_integration import instrument_gemini, uninstrument_gemini
except ImportError:
    instrument_gemini, uninstrument_gemini = _noop_instrumentor("gemini")

try:
    from .langchain_integration import instrument_langchain, uninstrument_langchain, get_langchain_callbacks
except ImportError:
    instrument_langchain, uninstrument_langchain = _noop_instrumentor("langchain")

    def get_langchain_callbacks(*args, **kwargs):
        return None

try:
    from .xai_integration import instrument_xai, uninstrument_xai
except ImportError:
    instrument_xai, uninstrument_xai = _noop_instrumentor("xai")

try:
    from .groq_integration import instrument_groq, uninstrument_groq
except ImportError:
    instrument_groq, uninstrument_groq = _noop_instrumentor("groq")

try:
    from .mistral_integration import instrument_mistral, uninstrument_mistral
except ImportError:
    instrument_mistral, uninstrument_mistral = _noop_instrumentor("mistral")

try:
    from .deepseek_integration import instrument_deepseek, uninstrument_deepseek
except ImportError:
    instrument_deepseek, uninstrument_deepseek = _noop_instrumentor("deepseek")

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
