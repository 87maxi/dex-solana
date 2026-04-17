#!/bin/bash
# Fix Program ID Mismatch Script
# This script resolves the DeclaredProgramIdMismatch (Error 4100) issue
# by either updating the code to match the deployed program ID or
# cleaning and redeploying with a fresh program ID

set -e

echo "🔧 Fix Program ID Mismatch Script"
echo "=================================="
echo ""

# Navigate to project root
cd $(dirname "$0")/..

# Function to get current program ID from code
get_declared_program_id() {
    grep -A1 "declare_id!" programs/solana-dex/src/lib.rs | grep -oP '"\K[^"]+'
}

# Function to get current program ID from Anchor.toml
get_anchor_program_id() {
    grep "solana_dex" Anchor.toml | grep -oP 'solana_dex = "\K[^"]+'
}

# Function to try and get deployed program ID
get_deployed_program_id() {
    # Try using solana CLI
    if command -v solana &> /dev/null && curl -s http://127.0.0.1:8899 > /dev/null; then
        # Check for any program with solana_dex name
        PROGRAM_LIST=$(solana program list --url http://127.0.0.1:8899 2>/dev/null || echo "")
        if echo "$PROGRAM_LIST" | grep -qi "solana"; then
            echo "$PROGRAM_LIST" | grep "solana" | head -1 | awk '{print $1}'
        fi
    fi
    return 1
}

echo "1. Analyzing current state..."
echo "   -------------------------"
DECLARE_ID=$(get_declared_program_id 2>/dev/null || echo "Not found")
ANCHOR_ID=$(get_anchor_program_id 2>/dev/null || echo "Not found")
DEPLOYED_ID=$(get_deployed_program_id 2>/dev/null || echo "Not found")

echo "   Declared Program ID (in lib.rs):  $DECLARE_ID"
echo "   Anchor.toml Program ID:           $ANCHOR_ID"
echo "   Deployed Program ID:              $DEPLOYED_ID"
echo ""

# Check if there's a mismatch
MISMATCH=false
if [ "$DECLARE_ID" != "$ANCHOR_ID" ]; then
    echo "❌ MISMATCH: Code and Anchor.toml have different IDs"
    MISMATCH=true
fi

if [ "$DECLARE_ID" != "$DEPLOYED_ID" ] && [ "$DEPLOYED_ID" != "Not found" ]; then
    echo "❌ MISMATCH: Code and deployed program have different IDs"
    MISMATCH=true
fi

if [ "$MISMATCH" = true ]; then
    echo ""
    echo "⚠️  Program ID mismatch detected!"
    echo "   This causes DeclaredProgramIdMismatch (Error 4100)"
    echo ""
else
    echo "✅ All Program IDs are consistent"
    echo ""
fi

# Main menu
echo "2. Resolution Options:"
echo "   --------------------"
echo "   [1] Update code to use deployed Program ID (if available)"
echo "   [2] Generate new Program ID and update all files"
echo "   [3] Clean deploy (remove Surfnet data and redeploy)"
echo "   [4] Exit without changes"
echo ""

read -p "   Select option [1-4]: " CHOICE

case $CHOICE in
    1)
        echo ""
        echo "🔄 Option 1: Update code to use deployed Program ID"
        echo "   ------------------------------------------------"
        if [ "$DEPLOYED_ID" = "Not found" ]; then
            echo "❌ No deployed program found. Cannot proceed with this option."
            echo "   Try option 2 or 3 instead."
            exit 1
        fi

        echo "   Updating programs/solana-dex/src/lib.rs..."
        sed -i "s/declare_id!\\(\"[^\"]*\"\\)/declare_id!\\(\"$DEPLOYED_ID\"\\)/g" programs/solana-dex/src/lib.rs
        echo "   ✅ Updated declared program ID to: $DEPLOYED_ID"

        echo "   Updating Anchor.toml..."
        sed -i "s/solana_dex = \"[^\"]*\"/solana_dex = \"$DEPLOYED_ID\"/g" Anchor.toml
        echo "   ✅ Updated Anchor.toml program ID to: $DEPLOYED_ID"

        echo ""
        echo "✅ Changes applied:"
        echo "   - Declared ID: $DECLARE_ID → $DEPLOYED_ID"
        echo "   - Anchor.toml ID: $ANCHOR_ID → $DEPLOYED_ID"
        echo ""
        echo "   Now you can rebuild and the mismatch should be resolved:"
        echo "   anchor clean && anchor build && anchor deploy"
        ;;
    2)
        echo ""
        echo "🔄 Option 2: Generate new Program ID and update all files"
        echo "   -------------------------------------------------------"
        if command -v solana &> /dev/null; then
            NEW_ID=$(solana-keygen pubkey /dev/urandom)
        else
            # Generate a random valid Solana pubkey as fallback
            NEW_ID="$(tr -dc 'A-HJ-NP-Za-km-z2-9' < /dev/urandom | head -c64)"
        fi

        echo "   New Program ID: $NEW_ID"
        read -p "   Do you want to use this ID? [y/N]: " CONFIRM
        if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
            echo "   Cancelled. No changes made."
            exit 0
        fi

        echo "   Updating programs/solana-dex/src/lib.rs..."
        sed -i "s/declare_id!\\(\"[^\"]*\"\\)/declare_id!\\(\"$NEW_ID\"\\)/g" programs/solana-dex/src/lib.rs
        echo "   ✅ Updated declared program ID to: $NEW_ID"

        echo "   Updating Anchor.toml..."
        sed -i "s/solana_dex = \"[^\"]*\"/solana_dex = \"$NEW_ID\"/g" Anchor.toml
        echo "   ✅ Updated Anchor.toml program ID to: $NEW_ID"

        echo ""
        echo "✅ Changes applied:"
        echo "   - Declared ID: $DECLARE_ID → $NEW_ID"
        echo "   - Anchor.toml ID: $ANCHOR_ID → $NEW_ID"
        echo ""
        echo "   WARNING: This is a NEW program ID. You will need to:"
        echo "   1. Clean previous deployments"
        echo "   2. Deploy the new program"
        echo "   3. Update all references to the old program ID"
        echo ""
        echo "   To clean and redeploy:"
        echo "   rm -rf ~/.surfpool/data/* && surfpool start && anchor clean && anchor build && anchor deploy"
        ;;
    3)
        echo ""
        echo "🔄 Option 3: Clean deploy (remove Surfnet data and redeploy)"
        echo "   --------------------------------------------------------"
        echo "   WARNING: This will DELETE all Surfnet data"
        echo "   - All deployed programs will be removed"
        echo "   - All accounts will be reset"
        echo "   - Ledger data will be cleared"
        echo ""

        read -p "   Are you sure you want to continue? [y/N]: " CONFIRM
        if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
            echo "   Cancelled. No changes made."
            exit 0
        fi

        # Stop Surfnet if running
        if command -v surfpool &> /dev/null && surfpool status &> /dev/null; then
            echo "   Stopping Surfnet..."
            surfpool stop
        fi

        # Remove Surfnet data
        echo "   Removing Surfnet data..."
        if [ -d ~/.surfpool ]; then
            rm -rf ~/.surfpool/data/*
            echo "   ✅ Surfnet data cleared"
        else
            echo "   ⚠️  Surfnet data directory not found"
        fi

        # Clean Anchor artifacts
        echo "   Cleaning Anchor artifacts..."
        if command -v anchor &> /dev/null; then
            anchor clean
            echo "   ✅ Anchor artifacts cleaned"
        else
            echo "   ⚠️  Anchor CLI not found"
        fi

        echo ""
        echo "✅ Clean deploy ready!"
        echo ""
        echo "   To complete the deployment, run:"
        echo "   1. surfpool start"
        echo "   2. anchor build"
        echo "   3. anchor deploy"
        echo "   4. anchor run init-accounts"
        echo "   5. anchor run mint-tokens"
        echo ""
        echo "   Or use the full deployment script:"
        echo "   ./runbooks/full-deploy.sh"
        ;;
    4)
        echo "   No changes made. Exiting."
        exit 0
        ;;
    *)
        echo "   Invalid option. Exiting."
        exit 1
        ;;
esac

echo ""
echo "✅ Script completed successfully"
echo ""

exit 0
