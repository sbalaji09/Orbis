import asyncio
import json
import logging
import os
import re
from typing import Optional

import redis.asyncio as aioredis

from websocket.connection_manager import ConnectionManager

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
RECONNECT_DELAY = 5  # seconds to wait before reconnecting

class RedisSubscriber:
    def __init__(self, connection_manager: ConnectionManager) -> None:
        self.connection_manager = connection_manager
        self._redis: Optional[aioredis.Redis] = None
        self._pubsub: Optional[aioredis.client.PubSub] = None
        self._running = False
        self._task: Optional[asyncio.Task] = None
    
    