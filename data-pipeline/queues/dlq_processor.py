import os
import json
import time
import logging
from datetime import datetime, timezone
from typing import Optional
from redis_queue import RedisQueue
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# config
DLQ_NAME = os.getenv("DEAD_LETTER_QUEUE_NAME", "span_processing_dlq")
MAIN_QUEUE_NAME = os.getenv("QUEUE_NAME", "span_processing_queue")
DLQ_RETRY_DELAY_HOURS = int(os.getenv("DLQ_RETRY_DELAY_HOURS", 1))
DLQ_MAX_AGE_HOURS = int(os.getenv("DLQ_MAX_AGE_HOURS", 72))
DLQ_ALERT_THRESHOLD = int(os.getenv("DLQ_ALERT_THRESHOLD", 10))

class DLQProcessor:
    def __init__(self):
        self.dlq = RedisQueue(queue_name=DLQ_NAME)
        self.main_queue = RedisQueue(queue_name=MAIN_QUEUE_NAME)
        self.metrics_key = "dlq:metrics"
    
    # get the dlq length
    def get_dlq_length(self) -> int:
        return self.dlq.get_queue_length()
    
    # get DLQ metrics using Redis
    def get_metrics(self) -> dict:
        redis = self.dlq.redis_client

        return {
            "dlq_length": self.get_dlq_length(),
            "total_retried": int(redis.get(f"{self.metrics_key}:total_retried") or 0),
            "total_expired": int(redis.get(f"{self.metrics_key}:total_expired") or 0),
            "total_alerts_sent": int(redis.get(f"{self.metrics_key}:alerts_sent") or 0),
            "last_processed_at": int(redis.get(f"{self.metrics_key}:last_processed_at") or 0),
        }