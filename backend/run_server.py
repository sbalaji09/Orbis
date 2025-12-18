#!/usr/bin/env python3
"""
Startup script for the Orbis Query API backend.
This script properly sets up the Python path before importing the application.
"""
import sys
import os

# Add parent directory to Python path to enable imports from shared/
backend_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(backend_dir)
sys.path.insert(0, parent_dir)
sys.path.insert(0, backend_dir)

# Now we can run the application
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "query_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
