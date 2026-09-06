#!/bin/bash
set -e

echo "Starting C++ Matching Engine in background..."
./engine_server &

echo "Waiting for C++ Engine to be ready on port 50051..."
sleep 2

echo "Starting Go Backend..."
# Engine is on IPv4 localhost
export ENGINE_ADDR="127.0.0.1:50051"
exec ./backend_server
