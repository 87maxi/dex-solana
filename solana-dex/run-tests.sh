#!/bin/bash
set -euo pipefail

# Reset Surfpool state
rm -rf ~/.surfpool/data/*

# Start Surfnet
echo "Starting Surfnet..."
surfpool start &
sleep 10

# Wait for Surfnet to be ready
for i in {1..30}; do
    if curl -s -f "http://127.0.0.1:8899" > /dev/null; then
        echo "Surfnet is ready"
        break
    fi
    echo "Waiting for Surfnet... ($i/30)"
    sleep 2
.done

# Build the project
echo "Building project..."
anchor build

# Deploy the program
echo "Deploying program..."
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
anchor deploy

# Run tests
echo "Running tests..."
anchor test --provider.cluster http://127.0.0.1:8899

