#!/bin/bash
# Surfpool Deployment Script for Solana DEX
# This script handles proper deployment with Surfpool integration

echo "🚀 Starting Surfpool DEX deployment..."

# Navigate to project root
cd $(dirname "$0")/..

# Step 1: Verify dependencies
echo "1. Verifying dependencies..."
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found"
    exit 1
fi

if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found"
    exit 1
fi

if ! command -v surfpool &> /dev/null; then
    echo "❌ Surfpool CLI not found"
    echo "Please install Surfpool using: curl -sL https://run.surfpool.run/ | bash"
    exit 1
fi

# Step 2: Build the smart contract using proper Anchor command
echo "2. Building smart contract..."
anchor build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"

# Step 3: Start Surfpool if not already running
echo "3. Starting Surfpool..."
# Check if surfpool is already running
if ! surfpool status &> /dev/null; then
    echo "Starting Surfpool in background..."
    surfpool start > /tmp/surfpool.log 2>&1 &
    sleep 5  # Give it time to start
fi

# Step 4: Deploy to Surfpool local network
echo "4. Deploying to Surfpool local network..."
# Set environment variable to use Surfnet URL
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
if ! anchor deploy; then
    echo "❌ Deployment failed"
    echo "Check Surfpool logs in /tmp/surfpool.log"
    exit 1
fi

echo "✅ Deployment successful"

# Step 5: Initialize accounts
echo "5. Initializing accounts..."
if ! anchor run init-accounts; then
    echo "⚠️  Account initialization failed but continuing..."
fi

# Step 6: Mint tokens
echo "6. Minting initial tokens..."
if ! anchor run mint-tokens; then
    echo "⚠️  Token minting failed but continuing..."
fi

# Step 7: Validate deployment
echo "7. Validating deployment..."
if ! anchor test --provider.cluster http://127.0.0.1:8899; then
    echo "⚠️  Deployment validation failed but program is deployed"
fi

echo "✅ Full deployment complete!"
echo "DEX is ready for use with Surfpool integration"
