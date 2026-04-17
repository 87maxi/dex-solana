#!/bin/bash
# Build and Deploy Script for Solana DEX
# This script follows Surfpool and Anchor best practices

set -euo pipefail

echo "🚀 Starting Solana DEX build and deployment..."

# Navigate to project root
PROJECT_ROOT=$(cd $(dirname "$0")/.. && pwd)
cd "$PROJECT_ROOT"

echo "Project root: $PROJECT_ROOT"
echo ""

# Function to check if command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ $1 is not installed"
        return 1
    fi
    return 0
}

# Step 1: Verify dependencies
echo "1. Verifying dependencies..."
check_command "solana" || exit 1
check_command "anchor" || exit 1
check_command "cargo" || exit 1
echo "✅ All dependencies installed"
echo ""

# Step 2: Build the smart contract
echo "2. Building smart contract..."
if [ -f "target/deploy/solana_dex.so" ]; then
    echo "   .so file exists, checking if rebuild is needed..."
    if ! cargo build-sbf --manifest-path programs/solana-dex/Cargo.toml 2>&1 | grep -q "Finished"; then
        echo "❌ Build failed"
        exit 1
    fi
else
    anchor build || {
        echo "❌ Build failed"
        exit 1
    }
fi
echo "✅ Build successful"
echo ""

# Step 3: Deploy to local network
echo "3. Deploying to local network..."
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899

echo "   Setting up deployment environment..."
echo "   RPC URL: http://127.0.0.1:8899"

# Check if Surfnet is accessible
if ! curl -s -f "http://127.0.0.1:8899" > /dev/null; then
    echo "⚠️  Warning: Surfnet not accessible, trying to start it..."
    if command -v surfpool &> /dev/null; then
        echo "   Starting Surfnet..."
        surfpool start > /tmp/surfpool.log 2>&1 &
        sleep 10
    fi
fi

# Deploy using anchor
if ! anchor deploy; then
    echo "❌ Deployment failed"
    exit 1
fi
echo "✅ Deployment successful"
echo ""

# Step 4: Verify deployment
echo "4. Verifying deployment..."
PROGRAM_ID=$(grep -A1 "declare_id!" programs/solana-dex/src/lib.rs | grep -oP '"\K[^\"]+' || echo "Unknown")
echo "   Program ID: $PROGRAM_ID"
echo "   Network: http://127.0.0.1:8899"

# Try to get deployed program ID
DEPLOYED_ID=$(solana program show solana_dex --url http://127.0.0.1:8899 2>/dev/null | grep -oP 'Program Id: \K[^ ]+' || echo "Not verified")
echo "   Deployed ID: $DEPLOYED_ID"
echo ""

echo "🎉 Build and deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   - Run tests: anchor test --url http://127.0.0.1:8899"
echo "   - Access Surfpool Studio: http://localhost:3000"
echo "   - For full validation: ./runbooks/consistency-check.sh"
echo ""

exit 0
