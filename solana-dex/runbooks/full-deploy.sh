#!/bin/bash
# Full Deployment Script for Solana DEX
# This script follows Surfpool and txtx best practices for comprehensive deployment

set -euo pipefail

echo "🚀 Starting full Solana DEX deployment with Surfpool..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
log() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log "$RED" "❌ $1 is not installed"
        return 1
    fi
    return 0
}

# Navigate to project root
PROJECT_ROOT=$(cd $(dirname "$0")/.. && pwd)
cd "$PROJECT_ROOT"

log "$BLUE" "Project root: $PROJECT_ROOT"
echo ""

# Step 1: Verify dependencies
log "$BLUE" "1. Verifying dependencies..."
check_command "solana" || exit 1
check_command "anchor" || exit 1
check_command "cargo" || exit 1
check_command "surfpool" || exit 1
log "$GREEN" "✅ All dependencies installed"
echo ""

# Step 2: Clean and build the smart contract
log "$BLUE" "2. Building smart contract..."
if [ -d "target" ]; then
    log "$YELLOW" "   Cleaning previous build artifacts..."
    anchor clean
fi

if anchor build; then
    log "$GREEN" "✅ Build successful"
else
    log "$RED" "❌ Build failed"
    exit 1
fi
echo ""

# Step 3: Start Surfpool
log "$BLUE" "3. Starting Surfpool..."
if ! surfpool status &> /dev/null; then
    log "$YELLOW" "   Surfpool not running, starting it..."
    surfpool start > /tmp/surfpool.log 2>&1 &
    sleep 10  # Wait for Surfnet to start
else
    log "$YELLOW" "   Surfpool is already running"
fi

# Verify Surfnet connectivity
if ! curl -s -f "http://127.0.0.1:8899" > /dev/null; then
    log "$RED" "❌ Surfnet is not accessible"
    log "$YELLOW" "   Check Surfpool logs: tail -f /tmp/surfpool.log"
    exit 1
fi
log "$GREEN" "✅ Surfnet is accessible"
echo ""

# Step 4: Check and handle existing deployment
log "$BLUE" "4. Checking existing deployment..."
if solana program show solana_dex --url http://127.0.0.1:8899 > /dev/null 2>&1; then
    log "$YELLOW" "   Existing program found"
    
    DEPLOYED_ID=$(solana program show solana_dex --url http://127.0.0.1:8899 | grep -oP 'Program Id: \K[^ ]+' || echo "Unknown")
    CODE_ID=$(grep -A1 "declare_id!" programs/solana-dex/src/lib.rs | grep -oP '"\K[^\"]+' || echo "Unknown")
    
    log "$BLUE" "   Deployed Program ID: $DEPLOYED_ID"
    log "$BLUE" "   Code Program ID: $CODE_ID"
    
    if [ "$DEPLOYED_ID" != "$CODE_ID" ]; then
        log "$YELLOW" "⚠️  Program IDs don't match!"
        read -p "   Do you want to reset and redeploy (y/n)? " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log "$YELLOW" "   Resetting program state..."
            if [ -n "$DEPLOYED_ID" ]; then
                anchor run reset-program --program-id "$DEPLOYED_ID"
            fi
        fi
    fi
fi
echo ""

# Step 5: Deploy using Surfpool runbooks
log "$BLUE" "5. Deploying using Surfpool runbooks..."
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899

if surfpool run deployment --network localnet; then
    log "$GREEN" "✅ Deployment successful via runbooks"
else
    log "$YELLOW" "   Runbook deployment failed, trying fallback..."
    if anchor deploy; then
        log "$GREEN" "✅ Deployment successful via anchor deploy"
    else
        log "$RED" "❌ Deployment failed"
        exit 1
    fi
fi
echo ""

# Step 6: Initialize accounts
log "$BLUE" "6. Initializing accounts..."
if anchor run init-accounts 2>&1 | grep -q "Error"; then
    log "$YELLOW" "⚠️  Account initialization had issues, continuing..."
else
    log "$GREEN" "✅ Accounts initialized"
fi
echo ""

# Step 7: Mint tokens
log "$BLUE" "7. Minting initial tokens..."
if anchor run mint-tokens 2>&1 | grep -q "Error"; then
    log "$YELLOW" "⚠️  Token minting had issues, continuing..."
else
    log "$GREEN" "✅ Tokens minted"
fi
echo ""

# Step 8: Run consistency check
log "$BLUE" "8. Running consistency check..."
if [ -f "runbooks/consistency-check.sh" ]; then
    ./runbooks/consistency-check.sh
else
    log "$YELLOW" "   Consistency check script not found"
fi
echo ""

# Step 9: Verify final deployment state
log "$BLUE" "9. Verifying final deployment..."
FINAL_ID=$(solana program show solana_dex --url http://127.0.0.1:8899 2>/dev/null | grep -oP 'Program Id: \K[^ ]+' || echo "Unknown")
log "$BLUE" "   Final Program ID: $FINAL_ID"
log "$BLUE" "   Network: http://127.0.0.1:8899"

echo ""
log "$GREEN" "🎉 Full deployment complete!"
log "$GREEN" ""
log "$GREEN" "📋 Next steps:"
log "$GREEN" "   - Access Surfpool Studio: http://localhost:3000"
log "$GREEN" "   - Run tests: anchor test --provider.cluster http://127.0.0.1:8899"
log "$GREEN" "   - For frontend integration, update web/.env.local"
log "$GREEN" ""
log "$GREEN" "✅ Your Solana DEX is ready with full Surfpool integration!"
echo ""

exit 0
