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
    
    # this is the main loop which connects, listens, and reconnects on failure
    async def _run_forever(self) -> None:
        while self._running:
            try:
                if not await self._connect():
                    logger.warning(f"Reconnecting in {RECONNECT_DELAY}s...")
                    await asyncio.sleep(RECONNECT_DELAY)
                    continue

                await self._listen()
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Redis subscriber error: {e}", exc_info=True)
                await self._cleanup()
                if self._running:
                    logger.warning(f"Reconnecting in {RECONNECT_DELAY}s...")
                    await asyncio.sleep(RECONNECT_DELAY)
    
    # listens for Redis messages and routes them to the correct Websocket connection
    async def _listen(self) -> None:
        async for message in self._pubsub.listen():
            if not self._running:
                break

            if message["type"] != "pmessage":
                continue

            try:
                channel = message["channel"]
                data = json.loads(message["data"])

                await self._route_message(channel, data)

            except json.JSONDecodeError as e:
                logger.warning(f"Invalid JSON in Redis message: {e}")
            except Exception as e:
                logger.error(f"Error routing message: {e}", exc_info=True)
    
    async def _route_message(self, channel: str, data: dict) -> None:
        trace_match = re.match(r"^trace:([^:]+)$", channel)
        if trace_match:
            trace_id = trace_match.group(1)
            await self.connection_manager.send_to_trace_subscribers(trace_id, data)
            return
        
        user_match = re.match(r"^user:([^:]+):spans$", channel)
        if user_match:
            user_id = user_match.group(1)
            await self.connection_manager.broadcast_to_user()
            return

        logger.debug(f"Unhandled channel pattern: {channel}")

redis_subscriber: Optional[RedisSubscriber] = None

def get_redis_subscriber() -> Optional[RedisSubscriber]:
    return redis_subscriber

def init_redis_subscriber(connection_manager: ConnectionManager) -> RedisSubscriber:
    global redis_subscriber
    redis_subscriber = RedisSubscriber(connection_manager)
    return redis_subscriber