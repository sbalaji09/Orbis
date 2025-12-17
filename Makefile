run:
	(cd data-pipeline && uvicorn websocket_server:app --host 0.0.0.0 --port 8080 --reload) &
	(cd data-pipeline && python3.12 worker.py) &
	(cd backend && python3.12 query_api.py) &
	(cd frontend && npm run dev)