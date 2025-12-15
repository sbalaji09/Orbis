"""
CLI command tracking utilities
Track shell command execution as spans
"""

import subprocess
from typing import Optional, List, Union
from ..core.span import Span
from ..collector.collector import get_collector
from ..collector.config import get_config
from ..core.context import get_current_span, set_current_span


def run_tracked_command(
    command: Union[str, List[str]],
    shell: bool = True,
    capture_output: bool = True,
    text: bool = True,
    timeout: Optional[float] = None,
    **kwargs
):
    """
    Run a CLI command and track it as a span.
    
    Usage:
        from orbis import run_tracked_command
        
        # Run git status and track it
        output = run_tracked_command("git status")
        
        # Run with list (safer)
        output = run_tracked_command(["git", "log", "--oneline", "-5"])
    
    Args:
        command: Command to run (string or list of args)
        shell: Whether to run in shell (default True)
        capture_output: Whether to capture stdout/stderr (default True)
        text: Return output as text (default True)
        timeout: Command timeout in seconds
        **kwargs: Additional arguments to pass to subprocess.run()
    
    Returns:
        subprocess.CompletedProcess object with stdout, stderr, returncode
    """
    parent_span = get_current_span()
    config = get_config()
    
    # Format command for display
    cmd_str = command if isinstance(command, str) else " ".join(command)
    software_name = command.split()[0] if isinstance(command, str) else command[0]
    
    # Create span
    span = Span(
        name=f"cli.{software_name}",
        span_type="cli",
        agent_id=config.project_id,
        user_id=config.user_id,
        trace_id=parent_span.trace_id if parent_span else Span.__dataclass_fields__['trace_id'].default_factory(),
        software_name=software_name,
        software_type="cli_tool",
        cli_command=cmd_str,
        input_data=cmd_str
    )
    
    if parent_span:
        span.parent_span_id = [parent_span.span_id]
    
    previous_span = get_current_span()
    set_current_span(span)
    
    try:
        # Run the command
        result = subprocess.run(
            command,
            shell=shell,
            capture_output=capture_output,
            text=text,
            timeout=timeout,
            **kwargs
        )
        
        # Capture output
        span.cli_exit_code = result.returncode
        span.cli_stdout = result.stdout[:1000] if result.stdout else None  # Truncate to 1000 chars
        span.cli_stderr = result.stderr[:1000] if result.stderr else None
        span.output_data = f"Exit code: {result.returncode}"
        
        # Mark as success if exit code is 0
        status = "success" if result.returncode == 0 else "error"
        span.complete(status=status)
        
        return result
        
    except subprocess.TimeoutExpired as e:
        span.set_error(e)
        span.complete(status="error")
        raise
    except Exception as e:
        span.set_error(e)
        span.complete(status="error")
        raise
    finally:
        set_current_span(previous_span)
        get_collector().collect(span)
