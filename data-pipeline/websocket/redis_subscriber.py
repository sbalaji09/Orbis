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
    
    # start the Redis subscriber running as a background task
    async def start(self) -> None:
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._run_forever())
        logger.info("Redis subscriber started")
    
    # stop the Redis subscriber and cleanup
    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        
        await self._cleanup()
        logger.info("Redis subscriber stopped")

    # cleanup the Redis connection after you stop it
    async def _cleanup(self) -> None:
        if self._pubsub:
            try:
                await self._pubsub.punsubscribe("trace:*")
                await self._pubsub.punsubscribe("user:*:spans")
            except Exception as e:
                logger.warning(f"Error closing pubsub: {e}")
        
        if self._redis:
            try:
                await self._redis.close()
            except Exception as e:
                logger.warning(f"Error closing redis: {e}")
            self._redis = None
    
    # establish Redis connection and subscribe to patterns
    async def _connect(self) -> bool:
        try:
            self._redis = aioredis.from_url(REDIS_URL, decode_responses=True)
            self._pubsub = self._redis.pubsub()

            await self._pubsub.psubscribe("trace:*")
            await self._pubsub.psubscribe("user:*:spans")

            logger.info("Redis subscriber connected and subscribed to patterns")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            await self._cleanup()
            return False
        


    
    
