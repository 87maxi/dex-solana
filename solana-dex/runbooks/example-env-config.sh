#!/bin/bash
# Example Environment Configuration for Solana DEX
# This script demonstrates the proper environment setup for Surfpool deployment

echo "🚀 Setting up Solana DEX environment..."

# Set environment variables
export SOLANA_RPC_URL="http://127.0.0.1:8899"
export DEX_PROGRAM_ID="5p8iy2yZWb4xjHj17AAoZwAFzFY4Zh4c2e3dV32uRRH3"
export TOKEN_A_MINT="TokenAMintAddress"
export TOKEN_B_MINT="TokenBMintAddress"

# Verify dependencies
echo "Checking dependencies..."
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
    exit 1
fi

# Create directory structure
mkdir -p ~/.solana-dex/{logs,config,deployments}

echo "✅ Environment configuration complete"
echo "Environment variables set:"
echo "  SOLANA_RPC_URL=$SOLANA_RPC_URL"
echo "  DEX_PROGRAM_ID=$DEX_PROGRAM_ID"
echo "  TOKEN_A_MINT=$TOKEN_A_MINT"
echo "  TOKEN_B_MINT=$TOKEN_B_MINT"
