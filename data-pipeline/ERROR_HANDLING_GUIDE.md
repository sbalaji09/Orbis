# Error Handling & Logging Guide

## Overview

We've implemented a complete error handling and logging system with:
- **Structured Logging** - Track everything with context
- **Retry Logic** - Automatically retry failed tasks
- **Dead Letter Queue** - Store permanently failed tasks

---

## 🔧 Components

### 1. Structured Logging (`logger_config.py`)

**What it does:**
- Logs to console (human-readable) AND file (JSON format)
- Includes context (trace_id, model, cost, etc.)
- Different severity levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)

**Example:**
```python
logger.info("Processing span", extra={'extra_data': {
    'trace_id': '123',
    'model': 'gpt-4'
}})
```

**Output:**
```
Console: 2025-11-10 14:23:45 - worker - INFO - Processing span
File:    {"timestamp": "2025-11-10T14:23:45", "trace_id": "123", "model": "gpt-4"}
```

---

### 2. Retry Logic (`worker.py`)

**How it works:**
```
Task fails (attempt 1)
    ↓
Retry (attempt 2) - Re-queue with retry_count=1
    ↓
Retry (attempt 3) - Re-queue with retry_count=2
    ↓
Still failing? → Move to DLQ (give up after 3 attempts)
```

**Configuration** (`.env`):
```
MAX_RETRIES=3
```

**What gets tracked:**
- `retry_count` - How many times we've tried
- `last_error_at` - When it last failed
- Full error logs with stack traces

---

### 3. Dead Letter Queue (DLQ)

**What is it?**
A separate Redis queue for tasks that failed after all retries.

**Why?**
- Don't lose failed tasks
- Manual investigation possible
- Can retry specific tasks after fixing bugs

**DLQ Task Structure:**
```json
{
  "span": { ... },
  "retry_count": 3,
  "failed_at": "2025-11-10T14:23:45",
  "last_error_at": "2025-11-10T14:20:00",
  "error_message": "Failed after 3 retry attempts",
  "original_queue": "span_processing_queue"
}
```

---

## 📊 Monitoring

### View Logs

**Console logs:**
Just look at your terminal where worker is running.

**File logs (JSON):**
```bash
# View all logs
cat data-pipeline.log

# View only errors
cat data-pipeline.log | grep ERROR

# View logs for specific trace_id
cat data-pipeline.log | grep "abc-123"

# Pretty print (requires jq)
cat data-pipeline.log | jq
```

### Inspect DLQ

```bash
python inspect_dlq.py
```

**Features:**
- View all failed tasks
- See error messages and retry counts
- Retry specific tasks
- Clear entire DLQ

---

## 🎯 Complete Flow Example

### Scenario: Network timeout causes failures

**Attempt 1:**
```
Worker pulls task from queue
  ↓
Tries to save to Firebase
  ↓
Network timeout! ❌
  ↓
Logger: "Failed to process span task" (with stack trace)
  ↓
Worker: retry_count = 1, re-queue task
```

**Attempt 2:**
```
Worker pulls same task (now with retry_count=1)
  ↓
Tries to save to Firebase
  ↓
Network timeout! ❌
  ↓
Logger: "Task failed, retry 2/3"
  ↓
Worker: retry_count = 2, re-queue task
```

**Attempt 3:**
```
Worker pulls same task (now with retry_count=2)
  ↓
Tries to save to Firebase
  ↓
Network timeout! ❌
  ↓
Logger: "Task failed, retry 3/3"
  ↓
Worker: retry_count = 3, re-queue task
```

**Attempt 4:**
```
Worker pulls same task (now with retry_count=3)
  ↓
Tries to save to Firebase
  ↓
Network timeout! ❌
  ↓
Logger: "Task failed after 3 retries, moving to DLQ"
  ↓
Worker: Move to DLQ with error details
  ↓
Task now in DLQ for manual investigation
```

---

## 🔍 Debugging Failed Tasks

### Step 1: Check the logs
```bash
# Find errors
tail -100 data-pipeline.log | grep ERROR

# Look for specific trace_id
cat data-pipeline.log | grep "trace-id-here"
```

### Step 2: Inspect DLQ
```bash
python inspect_dlq.py
```

### Step 3: Fix the issue
- If it's a bug in your code → Fix and deploy
- If it's bad data → Manually fix the span data
- If it's a transient error → Just retry

### Step 4: Retry failed tasks
```bash
python inspect_dlq.py
# Choose option 1 to retry specific task
# Or fix the bug and retry all
```

---

## 🎨 Log Levels Guide

**DEBUG** - Detailed info (only during development)
```python
logger.debug("Processing span with 200-char preview")
```

**INFO** - Normal operations
```python
logger.info("Worker started successfully")
logger.info("Span processed successfully")
```

**WARNING** - Something unusual but not broken
```python
logger.warning("Task failed, retry 1/3")
logger.warning("S3 upload took 10 seconds")
```

**ERROR** - Something failed
```python
logger.error("Failed to save span to Firebase", exc_info=True)
```

**CRITICAL** - System is broken
```python
logger.critical("Cannot connect to Redis - worker shutting down")
```

---

## 📝 Best Practices

### 1. Always add context to logs
**Bad:**
```python
logger.error("Task failed")
```

**Good:**
```python
logger.error("Task failed", extra={'extra_data': {
    'trace_id': trace_id,
    'model': model,
    'retry_count': retry_count
}})
```

### 2. Include stack traces for errors
```python
logger.error("Failed to process", exc_info=True)  # ← This adds stack trace
```

### 3. Monitor DLQ regularly
```bash
# Set up a cron job to alert if DLQ grows
python -c "from redis_queue import RedisQueue; import os; from dotenv import load_dotenv; load_dotenv(); q = RedisQueue(queue_name=os.getenv('DEAD_LETTER_QUEUE_NAME')); print(f'DLQ length: {q.get_queue_length()}')"
```

### 4. Set appropriate retry counts
- **Transient errors** (network, rate limits) → MAX_RETRIES=3
- **Quick operations** → MAX_RETRIES=2
- **Expensive operations** → MAX_RETRIES=1

---

## 🚀 Quick Commands

```bash
# View recent errors
tail -50 data-pipeline.log | grep ERROR

# Monitor DLQ size
watch -n 5 'python -c "from redis_queue import RedisQueue; import os; q = RedisQueue(queue_name=\"span_processing_dlq\"); print(f\"DLQ: {q.get_queue_length()}\")"'

# Clear DLQ
python inspect_dlq.py  # Then choose option 2

# Test logging
python application_logging/logger_config.py
```

---

## 🎓 Summary

**What we built:**
1. ✅ Structured logging with JSON format
2. ✅ Automatic retry logic (3 attempts)
3. ✅ Dead Letter Queue for permanently failed tasks
4. ✅ Context-rich error tracking
5. ✅ DLQ inspection tool

**Benefits:**
- Never lose failed tasks
- Know exactly what went wrong and when
- Easy debugging with searchable logs
- Automatic recovery from transient errors
- Manual intervention possible for permanent errors
