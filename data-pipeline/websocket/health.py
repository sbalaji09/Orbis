import asyncio
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional

import redis.asyncio as aioredis

# health status for a WebSocket infrastructure
@dataclass
class WebSocketHealthStatus:
    status: str  # "healthy", "degraded", "unhealthy"
    active_connections: int
    connections_by_type: dict  # {"trace": N, "user": N}
    redis_pubsub_connected: bool
    redis_pubsub_subscriptions: list[str]
    subscriber_task_running: bool
    messages_per_second: float
    total_messages_received: int
    last_message_at: Optional[str]
    uptime_seconds: float
    timestamp: str