# Health and Metrics Endpoints Guide

## Overview

The ingestion API now includes two monitoring endpoints:
- **`GET /health`** - Health check for service availability
- **`GET /metrics`** - Operational metrics for monitoring

---

## Endpoints

### 1. `GET /health`

**Purpose:** Check if all critical services are operational

**Response (200 OK - Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T10:23:45.123456+00:00",
  "services": {
    "redis": {
      "status": "healthy",
      "connected": true
    },
    "postgres": {
      "status": "healthy",
      "connected": true
    }
  },
  "queue": {
    "main_queue_length": 42,
    "dlq_length": 0,
    "queue_name": "span_processing_queue"
  }
}
```

**Response (503 Service Unavailable - Unhealthy):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-18T10:23:45.123456+00:00",
  "services": {
    "redis": {
      "status": "unhealthy",
      "connected": false,
      "error": "Connection refused"
    },
    "postgres": {
      "status": "healthy",
      "connected": true
    }
  },
  "warnings": [
    "Queue depth high: 1500 tasks",
    "DLQ has 3 failed tasks"
  ]
}
```

**Use Cases:**
- Kubernetes liveness/readiness probes
- Docker healthcheck
- Uptime monitoring (Datadog, New Relic, etc.)
- Load balancer health checks

---

### 2. `GET /metrics`

**Purpose:** Get operational metrics for monitoring and alerting

**Response (200 OK):**
```json
{
  "timestamp": "2025-11-18T10:23:45.123456+00:00",
  "queue": {
    "main_queue_depth": 42,
    "dlq_depth": 0,
    "total_pending": 42
  },
  "processing": {
    "spans_processed_current_hour": 12450,
    "spans_failed_current_hour": 3,
    "error_rate_percent": 0.02
  },
  "database": {
    "total_traces": 5420,
    "total_spans": 45320,
    "traces_last_hour": 1200,
    "spans_last_hour": 12453,
    "avg_trace_duration_seconds": 2.345,
    "avg_trace_cost_dollars": 0.000234
  }
}
```

**Use Cases:**
- Grafana/Prometheus dashboards
- Alert on high error rates
- Monitor queue depth for auto-scaling
- Track cost trends
- Performance monitoring

---

## Testing the Endpoints

### Option 1: Using the test script

```bash
cd data-pipeline
python3 test_health_metrics.py
```

### Option 2: Using curl (requires API to be running)

```bash
# Start the API first
cd data-pipeline
uvicorn ingestion_api:app --reload --port 8080

# In another terminal:
# Health check
curl http://localhost:8080/health | jq

# Metrics
curl http://localhost:8080/metrics | jq
```

### Option 3: Using Python requests

```python
import requests

# Health check
response = requests.get("http://localhost:8080/health")
print(response.json())

# Metrics
response = requests.get("http://localhost:8080/metrics")
print(response.json())
```

---

## Docker Compose Integration

Add healthcheck to your `docker-compose.yml`:

```yaml
services:
  ingestion-api:
    build:
      context: ./data-pipeline
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
```

---

## Kubernetes Integration

### Liveness and Readiness Probes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ingestion-api
spec:
  containers:
  - name: ingestion-api
    image: orbis/ingestion-api:latest
    ports:
    - containerPort: 8080
    livenessProbe:
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 30
      timeoutSeconds: 5
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 10
      timeoutSeconds: 3
      failureThreshold: 2
```

---

## Monitoring Setup Examples

### Prometheus Scraping

Create a Prometheus exporter endpoint (future enhancement):

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'orbis-ingestion'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
```

### Datadog APM

```python
# In your monitoring script
import requests
import time

while True:
    metrics = requests.get("http://localhost:8080/metrics").json()

    # Send to Datadog
    statsd.gauge('orbis.queue.depth', metrics['queue']['main_queue_depth'])
    statsd.gauge('orbis.dlq.depth', metrics['queue']['dlq_depth'])
    statsd.gauge('orbis.processing.error_rate', metrics['processing']['error_rate_percent'])

    time.sleep(60)
```

### Grafana Dashboard Query Examples

```sql
-- Queue depth over time
SELECT
    time_bucket('1 minute', timestamp) AS time,
    AVG(main_queue_depth) as avg_queue_depth
FROM metrics_snapshots
WHERE time > NOW() - INTERVAL '1 hour'
GROUP BY time
ORDER BY time;

-- Error rate percentage
SELECT
    time_bucket('5 minutes', timestamp) AS time,
    (SUM(spans_failed) / NULLIF(SUM(spans_processed + spans_failed), 0)) * 100 as error_rate
FROM metrics_snapshots
WHERE time > NOW() - INTERVAL '24 hours'
GROUP BY time
ORDER BY time;
```

---

## Alerting Rules

### Alert on High Error Rate

```yaml
# alertmanager.yml
groups:
  - name: orbis_ingestion_alerts
    interval: 1m
    rules:
      - alert: HighErrorRate
        expr: error_rate_percent > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in span processing"
          description: "Error rate is {{ $value }}% for the last hour"

      - alert: QueueBackup
        expr: main_queue_depth > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Queue is backing up"
          description: "{{ $value }} tasks pending in queue"

      - alert: DLQHasItems
        expr: dlq_depth > 0
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "Failed tasks in DLQ"
          description: "{{ $value }} tasks failed permanently"
```

---

## Metrics Tracking in Worker (BONUS)

To populate the processing metrics, add this to `worker.py`:

### After successful span processing (line ~176):

```python
# Track successful processing
current_hour = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H")
self.queue.redis_client.incr(f"metrics:spans_processed:{current_hour}")
self.queue.redis_client.expire(f"metrics:spans_processed:{current_hour}", 86400)  # 24 hours
```

### After failed span processing (line ~190):

```python
# Track failed processing
current_hour = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H")
self.queue.redis_client.incr(f"metrics:spans_failed:{current_hour}")
self.queue.redis_client.expire(f"metrics:spans_failed:{current_hour}", 86400)
```

---

## What Each Metric Means

| Metric | Description | Good Value | Warning Value |
|--------|-------------|------------|---------------|
| `main_queue_depth` | Tasks waiting to be processed | < 100 | > 1000 |
| `dlq_depth` | Permanently failed tasks | 0 | > 0 |
| `error_rate_percent` | Percentage of failed spans | < 1% | > 5% |
| `spans_processed_current_hour` | Successfully processed spans | Varies | Sudden drop |
| `avg_trace_duration_seconds` | Average trace duration | Varies by use case | Sudden spike |
| `avg_trace_cost_dollars` | Average cost per trace | Varies by use case | Unexpected increase |

---

## Troubleshooting

### Health endpoint returns 503

**Problem:** One or more services are down

**Solutions:**
1. Check if Redis is running: `redis-cli ping`
2. Check if PostgreSQL is running: `psql <connection_string>`
3. Check logs for connection errors
4. Verify environment variables in `.env`

### Metrics show 0 for processing stats

**Problem:** Worker hasn't been updated to track metrics

**Solution:** Add the bonus metric tracking code to `worker.py` (see above)

### High queue depth

**Problem:** Worker can't keep up with incoming spans

**Solutions:**
1. Scale workers horizontally (run multiple worker processes)
2. Check worker logs for errors
3. Optimize worker processing (batch inserts, connection pooling)
4. Check database performance

### High error rate

**Problem:** Spans are failing to process

**Solutions:**
1. Check DLQ: `python3 inspect_dlq.py`
2. Review worker logs: `cat data-pipeline.log | grep ERROR`
3. Verify database schema is up to date
4. Check S3 credentials if using blob storage

---

## Next Steps

After implementing health and metrics:

1. **Set up monitoring dashboard** (Grafana/Datadog)
2. **Configure alerting** (PagerDuty/Slack)
3. **Add custom metrics** for your specific use case
4. **Implement auto-scaling** based on queue depth
5. **Create SLO/SLA dashboards** for uptime tracking

---

## Quick Reference

```bash
# Test locally
python3 test_health_metrics.py

# Health check
curl http://localhost:8080/health

# Metrics
curl http://localhost:8080/metrics

# Pretty print with jq
curl http://localhost:8080/metrics | jq '.database'

# Watch metrics in real-time
watch -n 5 'curl -s http://localhost:8080/metrics | jq .queue'
```

---

**Summary:** You now have production-ready health and metrics endpoints that give you full visibility into your data pipeline's operational status! 🎉
