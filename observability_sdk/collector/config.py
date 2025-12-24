import os
from dataclasses import dataclass
from typing import Optional

# configuration for the observability SDK
@dataclass
class SDKConfig:

    # backend API settings
    api_url: str = "http://localhost:8080" # ingestion API
    api_key: Optional[str] = None
    project_id: Optional[str] = None
    user_id: Optional[str] = None

    # batching settings
    batch_size: int = 10 
    flush_interval: float = 5.0

    # retry settings
    max_retries: int = 3
    retry_delay: float = 1.0

    # enable/disable
    enabled: bool = True
    debug: bool = False

    # auto-flush when root span completes (no parent span)
    auto_flush_on_root_span: bool = True

    # time to wait after auto-flush to ensure HTTP requests complete (in seconds)
    auto_flush_wait_time: float = 2.0

    # gzip compression for requests (reduces bandwidth, especially for large prompts)
    compress_requests: bool = True
    compression_min_size: int = 512  # only compress payloads larger than this (bytes)

    # load configuration from env variables
    @classmethod
    def from_env(cls) -> "SDKConfig":
        return cls(
            api_url=os.getenv("OBSERVABILITY_API_URL", "http://localhost:8080"),
            api_key=os.getenv("OBSERVABILITY_API_KEY"),
            project_id=os.getenv("OBSERVABILITY_PROJECT_ID"),
            user_id=os.getenv("OBSERVABILITY_USER_ID"),
            batch_size=int(os.getenv("OBSERVABILITY_BATCH_SIZE", "10")),
            flush_interval=float(os.getenv("OBSERVABILITY_FLUSH_INTERVAL", "5.0")),
            enabled=os.getenv("OBSERVABILITY_ENABLED", "true").lower() == "true",
            debug=os.getenv("OBSERVABILITY_DEBUG", "false").lower() == "true",
            auto_flush_on_root_span=os.getenv("OBSERVABILITY_AUTO_FLUSH_ROOT", "true").lower() == "true",
            auto_flush_wait_time=float(os.getenv("OBSERVABILITY_AUTO_FLUSH_WAIT", "2.0")),
            compress_requests=os.getenv("OBSERVABILITY_COMPRESS_REQUESTS", "true").lower() == "true",
            compression_min_size=int(os.getenv("OBSERVABILITY_COMPRESSION_MIN_SIZE", "512")),
        )

_config = SDKConfig.from_env()

# get the current SDK config
def get_config() -> SDKConfig:
    return _config

def configure(
    api_url: Optional[str] = None,
    api_key: Optional[str] = None,
    project_id: Optional[str] = None,
    user_id: Optional[str] = None,
    batch_size: Optional[int] = None,
    flush_interval: Optional[float] = None,
    enabled: Optional[bool] = None,
    debug: Optional[bool] = None,
    auto_flush_on_root_span: Optional[bool] = None,
    auto_flush_wait_time: Optional[float] = None,
    compress_requests: Optional[bool] = None,
    compression_min_size: Optional[int] = None,
) -> None:
    # update SDK config
    global _config

    if api_url is not None:
        _config.api_url = api_url
    if api_key is not None:
        _config.api_key = api_key
    if project_id is not None:
        _config.project_id = project_id
    if user_id is not None:
        _config.user_id = user_id
    if batch_size is not None:
        _config.batch_size = batch_size
    if flush_interval is not None:
        _config.flush_interval = flush_interval
    if enabled is not None:
        _config.enabled = enabled
    if debug is not None:
        _config.debug = debug
    if auto_flush_on_root_span is not None:
        _config.auto_flush_on_root_span = auto_flush_on_root_span
    if auto_flush_wait_time is not None:
        _config.auto_flush_wait_time = auto_flush_wait_time
    if compress_requests is not None:
        _config.compress_requests = compress_requests
    if compression_min_size is not None:
        _config.compression_min_size = compression_min_size