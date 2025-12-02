#!/bin/bash
# Script to run the backend with proper concurrent processing support

echo "Starting Document Intelligence Platform Backend with Concurrent Processing..."
echo "============================================================"

# Run with Gunicorn + Uvicorn workers for true concurrent processing
# This allows multiple requests to be processed in parallel

gunicorn main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8080 \
    --timeout 300 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile - \
    --log-level info

# Alternative: Run with Uvicorn directly (simpler but less scalable)
# uvicorn main:app --host 0.0.0.0 --port 8080 --workers 4 --log-level info
