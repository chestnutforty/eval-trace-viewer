#!/bin/bash

# Start the frontend development server

cd "$(dirname "$0")/../frontend"

if [ ! -f ".env" ]; then
    echo "Error: .env file not found. Please copy .env.example and configure it."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

echo "Starting frontend server on http://localhost:5173"
echo ""

npm run dev
