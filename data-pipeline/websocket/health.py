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

# monitors WebSocket and Redis Pub/Sub health metrics
class WebSocketHealthMonitor:
    def __init__(self):
        self._start_time = time.time()
        self._message_count = 0
        self._last_message_at: Optional[float] = None
        self._message_timestamps: list[float] = []  # Rolling window for rate calc
        self._rate_window_seconds = 60  # Calculate rate over last 60 seconds

    # record a message that was received
    def record_message(self):
        now = time.time()
        self._message_count += 1
        self._last_message_at = now
        self._message_timestamps.append(now)

        # Clean up old timestamps outside the window
        cutoff = now - self._rate_window_seconds
        self._message_timestamps = [t for t in self._message_timestamps if t > cutoff]

    # calculate messages per second over the rate window
    def get_messages_per_second(self) -> float:
        if not self._message_timestamps:
            return 0.0

        now = time.time()
        cutoff = now - self._rate_window_seconds
        recent = [t for t in self._message_timestamps if t > cutoff]

        if len(recent) < 2:
            return 0.0

        time_span = recent[-1] - recent[0]
        if time_span <= 0:
            return 0.0

        return len(recent) / time_span

    # get monitor updates in seconds
    def get_uptime_seconds(self) -> float:
        return time.time() - self._start_time

    # get ISO timestamp of last message
    def get_last_message_at(self) -> Optional[str]:
        if self._last_message_at is None:
            return None
        return datetime.fromtimestamp(self._last_message_at, tz=timezone.utc).isoformat()

    # checks if Redis pub/sub is reachable
    async def check_redis_health(self, redis_url: str) -> tuple[bool, list[str]]:
        try:
            client = aioredis.from_url(redis_url, decode_responses=True)
            await client.ping()
            await client.close()
            return True, []
        except Exception as e:
            return False, [str(e)]

    # generate comprehensive health 
    async def get_health_status(
        self,
        connection_manager,
        redis_subscriber,
        redis_url: str,
    ) -> WebSocketHealthStatus:

        # Count connections by type
        trace_connections = sum(
            len(conns) for conns in connection_manager._trace_connections.values()
        )
        user_connections = sum(
            len(conns) for conns in connection_manager._user_connections.values()
        )
        total_connections = trace_connections + user_connections

        # Check Redis pub/sub
        redis_connected, redis_errors = await self.check_redis_health(redis_url)

        # Check subscriber task
        subscriber_running = (
            redis_subscriber is not None
            and redis_subscriber._running
            and redis_subscriber._task is not None
            and not redis_subscriber._task.done()
        )

        # Get subscriptions if available
        subscriptions = []
        if redis_subscriber and redis_subscriber._pubsub:
            try:
                # Pattern subscriptions
                subscriptions = ["trace:*", "user:*:spans"]
            except Exception:
                pass

        # Determine overall status
        if redis_connected and subscriber_running and total_connections >= 0:
            status = "healthy"
        elif redis_connected or subscriber_running:
            status = "degraded"
        else:
            status = "unhealthy"

        return WebSocketHealthStatus(
            status=status,
            active_connections=total_connections,
            connections_by_type={
                "trace": trace_connections,
                "user": user_connections,
            },
            redis_pubsub_connected=redis_connected,
            redis_pubsub_subscriptions=subscriptions,
            subscriber_task_running=subscriber_running,
            messages_per_second=round(self.get_messages_per_second(), 2),
            total_messages_received=self._message_count,
            last_message_at=self.get_last_message_at(),
            uptime_seconds=round(self.get_uptime_seconds(), 2),
            timestamp=datetime.now(timezone.utc).isoformat(),
        )


# Singleton instance
health_monitor = WebSocketHealthMonitor()