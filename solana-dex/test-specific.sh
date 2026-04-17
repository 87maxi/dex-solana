#!/bin/bash
set -euo pipefail

# This script tests just the double initialization scenario

cd /home/maxi/Documentos/source/codecrypto/rust/eth-projects/dex-solana/solana-dex

# Wait for Surfnet
echo "Waiting for Surfnet..."
for i in {1..10}; do
    if curl -s -f "http://127.0.0.1:8899" > /dev/null; then
        echo "Surfnet is ready"
        break
    fi
    sleep 2
done

# Set up environment
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json

# Run just the specific test
npx ts-mocha -p ./tsconfig.json -t 1000000 'tests/solana-dex.ts' --grep "Should fail to initialize twice"

