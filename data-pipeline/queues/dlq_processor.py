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