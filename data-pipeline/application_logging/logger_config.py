import logging
import sys
from datetime import datetime
import json

# this is a formatter that outputs logs as JSON since it is the easiest to parse by log aggregation tools
# is also searchable and can include extra context in each log
class JSONFormatter(logging.Formatter):
    # format the data log as a JSON log
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }

        # add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # add any extra fields (this is considered to be "context")
        if hasattr(record, 'extra_data'):
            log_data.update(record.extra_data)

        return json.dumps(log_data)

# this sets up a logger with console and file output and returns the logger instance
# logger = setup_logger(__name__)
# logger.info("This is an info message")
# logger.error("This is an error", extra={'extra_data': {'span_id': '123'}})
def setup_logger(name: str, level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))

    # remove existing handlers to clear duplicate logs
    logger.handlers.clear()

    # console handler in human-format
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_format)

    # file handler with JSON
    try:
        file_handler = logging.FileHandler('data-pipeline.log')
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(JSONFormatter())
        logger.addHandler(file_handler)
    except Exception as e:
        print(f"Warning: Could not create log file: {e}")

    logger.addHandler(console_handler)

    return logger


# Example usage
if __name__ == "__main__":
    # Create a test logger
    logger = setup_logger(__name__)

    print("\n=== Testing Logger ===\n")

    # Different log levels
    logger.debug("This is a debug message")
    logger.info("This is an info message")
    logger.warning("This is a warning message")
    logger.error("This is an error message")

    # Log with extra context
    logger.info(
        "Processing span",
        extra={'extra_data': {
            'span_id': '123',
            'trace_id': '456',
            'model': 'gpt-4'
        }}
    )

    # Log an exception
    try:
        raise ValueError("This is a test exception")
    except Exception as e:
        logger.error("Error occurred", exc_info=True)

    print("\n=== Check data-pipeline.log for JSON formatted logs ===\n")
