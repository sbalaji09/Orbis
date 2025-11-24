"""
Auto-instrument for LangChain.
Uses LangChain's callback system to automatically capture agent execution.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID
from langchain_core.callbacks import BaseCallbackHandler as LangChainBaseCallBack
from langchain_core.outputs import LLMResult
from ..core.span import Span
from ..collector.collector import get_collector
from ..core.context import get_current_span, set_current_span
import time

# langchain callback handler that creates spans for chains, LLMs, and tools
class OrbisCallbackHandler(LangChainBaseCallBack):
    
    def __init__(self):
        super().__init__()
        self.active_spans: Dict[str, Span] = {}
        self.span_stack: List[str] = []

    # chain callbacks
    def on_chain_start(
        self,
        serialized: Dict[str, Any],
        inputs: Dict[str, Any],
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        """Called when a chain starts running"""
        try:
            chain_name = serialized.get("name", "unknown_chain") if serialized else "unknown_chain"
            
            # Get parent context
            parent_span = get_current_span()
            
            # Extract input - handle different input formats
            input_str = ""
            if inputs is not None:
                if isinstance(inputs, dict):
                    # Try different dict keys that LangChain might use
                    input_str = str(inputs.get("input") or inputs.get("question") or inputs)
                else:
                    input_str = str(inputs)
            
            # Create span for this chain
            span = Span(
                name=f"langchain.{chain_name}",
                user_id="00000000-0000-0000-0000-000000000000",
                agent_id="af913dc2-732e-42a6-a113-a80c694d71bf",
                prompt=input_str,
            )
            
            # Inherit trace context if parent exists
            if parent_span:
                span.trace_id = parent_span.trace_id
                span.parent_span_id = [parent_span.span_id]
            
            # Store span and set as active
            self.active_spans[str(run_id)] = span
            self.span_stack.append(str(run_id))
            set_current_span(span)
            
            print(f"DEBUG: Chain span {span.span_id} created with trace {span.trace_id}")
            
        except Exception as e:
            print(f"Error in on_chain_start: {e}")
            import traceback
            traceback.print_exc()

    def on_chain_end(
        self,
        outputs: Dict[str, Any],
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Called when a chain finishes running"""
        span = self.active_spans.get(str(run_id))
        if not span:
            return
        
        # Extract output - handle different output formats
        output_str = ""
        if outputs:
            if isinstance(outputs, dict):
                output_str = str(outputs.get("output", outputs))
            else:
                output_str = str(outputs)
        
        # Set output
        span.output = output_str
        
        # Complete span
        span.complete(status="success")
        
        # Send to collector
        collector = get_collector()
        collector.collect(span)
        
        # Clean up
        self.active_spans.pop(str(run_id), None)
        if str(run_id) in self.span_stack:
            self.span_stack.remove(str(run_id))
        
        # Restore previous span context
        if self.span_stack:
            parent_id = self.span_stack[-1]
            set_current_span(self.active_spans.get(parent_id))
        else:
            set_current_span(None)
        
    def on_chain_error(
        self,
        error: Exception,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Called when a chain encounters an error"""
        span = self.active_spans.get(str(run_id))
        if span:
            span.set_error(error)
            span.complete(status="error")
            
            collector = get_collector()
            collector.collect(span)
            
            self.active_spans.pop(str(run_id), None)
    
    # LLM callbacks
    def on_llm_start(
        self,
        serialized: Dict[str, Any],
        prompts: List[str],
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        """Called when an LLM starts generating"""
        model_name = serialized.get("name", "unknown_llm")
        
        # Get parent context - try multiple approaches
        parent_span = None
        
        # First, try to get parent from parent_run_id
        if parent_run_id:
            parent_span = self.active_spans.get(str(parent_run_id))
        
        # If not found, try current context
        if not parent_span:
            parent_span = get_current_span()
        
        # Create span for this LLM call
        span = Span(
            name=f"langchain.llm.{model_name}",
            user_id="00000000-0000-0000-0000-000000000000",
            agent_id="af913dc2-732e-42a6-a113-a80c694d71bf",
            model=model_name,
            prompt="\n".join(prompts),
        )
        
        # Inherit trace context
        if parent_span:
            span.trace_id = parent_span.trace_id
            span.parent_span_id = [parent_span.span_id]
            print(f"DEBUG: LLM span inheriting from parent {parent_span.span_id}")  # Debug
        else:
            print(f"DEBUG: LLM span has no parent!")  # Debug
        
        # Store span
        self.active_spans[str(run_id)] = span
    
    def on_llm_end(
        self,
        response: LLMResult,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Called when an LLM finishes generating"""
        span = self.active_spans.get(str(run_id))
        if not span:
            return
        
        # Extract output
        if response.generations:
            outputs = [gen[0].text for gen in response.generations if gen]
            span.output = "\n".join(outputs)
        
        # Extract token usage if available
        if hasattr(response, "llm_output") and response.llm_output:
            token_usage = response.llm_output.get("token_usage", {})
            span.input_tokens = token_usage.get("prompt_tokens", 0)
            span.output_tokens = token_usage.get("completion_tokens", 0)
            # Note: Cost calculation would need model-specific pricing
        
        # Complete span
        span.complete(status="success")
        
        # Send to collector
        collector = get_collector()
        collector.collect(span)
        
        # Clean up
        self.active_spans.pop(str(run_id), None)
    
    def on_llm_error(
        self,
        error: Exception,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Called when an LLM encounters an error"""
        span = self.active_spans.get(str(run_id))
        if span:
            span.set_error(error)
            span.complete(status="error")
            
            collector = get_collector()
            collector.collect(span)
            
            self.active_spans.pop(str(run_id), None)
    
    # Tool callbacks
    def on_tool_start(
        self,
        serialized: Dict[str, Any],
        input_str: str,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        """Called when a tool starts running"""
        tool_name = serialized.get("name", "unknown_tool")
        
        # Get parent context
        parent_span = None
        if parent_run_id and str(parent_run_id) in self.active_spans:
            parent_span = self.active_spans[str(parent_run_id)]
        elif self.span_stack:
            parent_span = self.active_spans.get(self.span_stack[-1])
        
        # Create span for this tool
        span = Span(
            name=f"langchain.tool.{tool_name}",
            user_id="00000000-0000-0000-0000-000000000000",
            agent_id="af913dc2-732e-42a6-a113-a80c694d71bf",
            prompt=input_str,
        )
        
        # Inherit trace context
        if parent_span:
            span.trace_id = parent_span.trace_id
            span.parent_span_id = [parent_span.span_id]
        
        # Store span
        self.active_spans[str(run_id)] = span
    
    def on_tool_end(
        self,
        output: str,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Called when a tool finishes running"""
        span = self.active_spans.get(str(run_id))
        if not span:
            return
        
        # Set output
        span.output = str(output)
        
        # Complete span
        span.complete(status="success")
        
        # Send to collector
        collector = get_collector()
        collector.collect(span)
        
        # Clean up
        self.active_spans.pop(str(run_id), None)
    
    def on_tool_error(
        self,
        error: Exception,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        """Called when a tool encounters an error"""
        span = self.active_spans.get(str(run_id))
        if span:
            span.set_error(error)
            span.complete(status="error")
            
            collector = get_collector()
            collector.collect(span)
            
            self.active_spans.pop(str(run_id), None)


# Global callback handler instance
_callback_handler = OrbisCallbackHandler()


def get_langchain_callbacks():
    """
    Get the LangChain callback handler for instrumentation.
    Add this to your LangChain agent/chain config.
    """
    return [_callback_handler]


def instrument_langchain():
    """Enable automatic LangChain instrumentation"""
    print("✓ LangChain instrumentation enabled (use callbacks in your chains)")


def uninstrument_langchain():
    """Disable automatic LangChain instrumentation"""
    print("✓ LangChain instrumentation disabled")

        