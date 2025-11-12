#!/bin/bash

# Start the backend server

cd "$(dirname "$0")/.."

if [ ! -f ".env" ]; then
    echo "Error: .env file not found. Please copy .env.example and configure it."
    exit 1
fi

echo "Starting backend server on http://localhost:7001"
echo "API docs available at http://localhost:7001/docs"
echo ""

uv run uvicorn backend.main:app --reload --port 7001
