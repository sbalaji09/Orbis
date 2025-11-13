# Docker Setup for Orbis

This guide explains how to run the entire Orbis observability platform using Docker.

## Architecture

The Docker setup includes 6 services:

1. **PostgreSQL** - Database for traces and spans (port 5432)
2. **Redis** - Message queue for data pipeline (port 6379)
3. **Ingestion API** - Receives spans from SDK (port 8080)
4. **Worker** - Processes spans from queue and stores in DB
5. **Query API** - Backend API for frontend (port 8000)
6. **Frontend** - Next.js dashboard (port 3000)

## Quick Start

### 1. Environment Setup

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Edit `.env` and add your AWS credentials (if using S3 for span storage).

### 2. Start All Services

```bash
docker-compose up -d
```

This will:
- Build all Docker images
- Start all services in the background
- Initialize the database with the schema
- Set up networking between containers

### 3. Verify Services

Check all services are running:

```bash
docker-compose ps
```

View logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f query-api
docker-compose logs -f frontend
```

### 4. Access the Application

- **Frontend Dashboard**: http://localhost:3000
- **Query API**: http://localhost:8000
- **Ingestion API**: http://localhost:8080
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 5. Health Checks

```bash
# Query API health
curl http://localhost:8000/health

# Ingestion API health
curl http://localhost:8080/health
```

## Development Workflow

### Rebuild After Code Changes

```bash
# Rebuild all services
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build query-api
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v
```

### View Service Logs

```bash
# Follow logs for all services
docker-compose logs -f

# Follow logs for specific service
docker-compose logs -f worker
docker-compose logs -f ingestion-api
```

### Execute Commands in Containers

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d orbis

# Access Redis CLI
docker-compose exec redis redis-cli

# Shell into a container
docker-compose exec query-api sh
```

## Database Management

### Initialize/Reset Database

The database is automatically initialized on first run using `database/init.sql`.

To reset the database:

```bash
docker-compose down -v  # Remove volumes
docker-compose up -d    # Restart (will reinitialize)
```

### Run SQL Manually

```bash
docker-compose exec postgres psql -U postgres -d orbis -f /path/to/script.sql
```

## Troubleshooting

### Service Won't Start

1. Check logs: `docker-compose logs service-name`
2. Verify dependencies are healthy: `docker-compose ps`
3. Ensure ports aren't already in use

### Database Connection Issues

```bash
# Verify PostgreSQL is running
docker-compose exec postgres pg_isready

# Check if database exists
docker-compose exec postgres psql -U postgres -l
```

### Redis Connection Issues

```bash
# Verify Redis is running
docker-compose exec redis redis-cli ping
```

### Frontend Can't Connect to Backend

1. Check `NEXT_PUBLIC_API_URL` in `.env`
2. Verify query-api is running: `curl http://localhost:8000/health`
3. Check CORS configuration in `backend/query_api.py`

## Production Deployment

For production, you should:

1. **Update CORS**: Change `allow_origins=["*"]` to your frontend domain
2. **Use Secrets**: Don't commit `.env` file, use Docker secrets or environment variables
3. **Scale Workers**: Run multiple worker containers: `docker-compose up -d --scale worker=3`
4. **Use External Database**: Point to managed PostgreSQL (e.g., RDS, Supabase)
5. **Add SSL/TLS**: Put services behind reverse proxy (nginx, Traefik)
6. **Resource Limits**: Add memory and CPU limits to docker-compose.yml

Example scaling:

```bash
# Run 3 worker instances
docker-compose up -d --scale worker=3
```

## Service Endpoints

### Ingestion API (port 8080)
- `POST /ingest` - Receive spans from SDK
- `GET /health` - Health check

### Query API (port 8000)
- `GET /health` - Health check
- `GET /traces` - List traces
- `GET /traces/recent` - Recent traces
- `GET /traces/{trace_id}` - Get specific trace
- `GET /traces/{trace_id}/spans` - Get trace spans
- `GET /metrics/user` - User metrics
- `GET /search/traces` - Search traces

### Frontend (port 3000)
- Web dashboard for visualizing traces

## Monitoring

### Resource Usage

```bash
# View resource usage
docker stats

# View disk usage
docker system df
```

### Container Health

All services have health checks configured. View health status:

```bash
docker-compose ps
```

## Clean Up

Remove everything (containers, networks, volumes):

```bash
docker-compose down -v
docker system prune -a
```
