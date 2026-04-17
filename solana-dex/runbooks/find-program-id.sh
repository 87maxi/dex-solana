#!/bin/bash
# Script to find the actual deployed program ID in Surfnet
# This helps resolve DeclaredProgramIdMismatch errors (4100)

echo "🔍 Searching for deployed solana_dex program in Surfnet..."

# Try different methods to find the program

# Method 1: Check anchor deployments
if [ -f "../target/deploy/solana_dex.json" ]; then
    echo "Found program ID in deployment file:"
    cat "../target/deploy/solana_dex.json" | grep -o '"programId":"[^"]*' | cut -d'"' -f4
fi

# Method 2: Check for any deployed program with the name
echo ""
echo "Searching for programs on Surfnet (http://127.0.0.1:8899)..."
if curl -s http://127.0.0.1:8899 > /dev/null; then
    # Get recent transactions to find program deployments
    TXNS=$(curl -s -X POST http://127.0.0.1:8899 -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","id":1,"method":"getRecentBlockhash"}')

    # Try to get program accounts (this might not work but let's try)
    echo "Looking for programs with 'solana_dex' in the name..."
    if command -v solana &> /dev/null; then
        # Try using solana CLI with localhost
        solana program list --url http://127.0.0.1:8899 2>/dev/null | grep -i solana || echo "No programs found with 'solana' in name"
    fi
else
    echo "⚠️  Surfnet is not running on http://127.0.0.1:8899"
    echo "Please start Surfnet with: surfpool start"
    exit 1
fi

# Method 3: Check for common program IDs
echo ""
echo "Checking common program IDs from Anchor.toml..."
if [ -f "../Anchor.toml" ]; then
    grep "solana_dex" "../Anchor.toml" | grep -oP 'solana_dex = "\K[^"]+'
fi

# Method 4: Check for any program with the expected name
echo ""
echo "If you're still having issues, try these steps:"
echo "1. Check if program is deployed: anchor deploy --dry-run"
echo "2. List all programs: solana program list --url http://127.0.0.1:8899"
echo "3. Manually inspect program accounts using Surfpool Studio at http://localhost:3000"

echo ""
echo "For DeclaredProgramIdMismatch (Error 4100), you can:"
echo "✅ Option 1: Update lib.rs to use the deployed program ID"
echo "✅ Option 2: Clean deploy with: rm -rf ~/.surfpool/data/* && surfpool start && anchor deploy"
echo "✅ Option 3: Use the find-and-fix script in this directory"

exit 0
