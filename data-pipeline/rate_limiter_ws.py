import os
import time
import logging
from typing import Optional, Tuple
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

WS_MAX_CONNECTIONS_PER_USER = int(os.getenv("WS_MAX_CONNECTIONS_PER_USER", 10))
WS_CONNECTION_ATTEMPTS_PER_MINUTE = int(os.getenv("WS_CONNECTION_ATTEMPTS_PER_MINUTE", 30))

_redis_client: Optional[aioredis.Redis] = None
