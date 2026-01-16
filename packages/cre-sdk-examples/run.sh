#!/bin/bash

# Kill any existing server on port 8800
lsof -ti:8800 | xargs kill -9 2>/dev/null || true

# 1) Run the python server in the background with the value 1
python3 min-broken-example-server/server.py 1 &
SERVER_PID=$!
sleep 1

# 2) Simulate the workflow
echo "Running workflow with server returning 1..."
cre workflow simulate ./src/workflows/min-broken-example

# Kill the server
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
sleep 1

# 3) Kill the server and run it returning 0
lsof -ti:8800 | xargs kill -9 2>/dev/null || true

# Run server with value 0
python3 min-broken-example-server/server.py 0 &
SERVER_PID=$!
sleep 1

# 4) Simulate again
echo "Running workflow with server returning 0..."
cre workflow simulate ./src/workflows/min-broken-example

# Clean up
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
