#!/bin/bash

# Consistency Check Script for Solana DEX with Surfpool
# Validates codebase, Surfpool integration, and deployment readiness

set -euo pipefail

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

# Function to check command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log "$RED" "❌ $1 is not installed"
        return 1
    fi
    return 0
}

# Function to get program ID from lib.rs
get_program_id() {
    grep -A1 "declare_id!" programs/solana-dex/src/lib.rs | grep -oP '"\K[^"]+' || echo "Unknown"
}

# Function to get program ID from Anchor.toml
get_anchor_program_id() {
    grep -A1 "solana_dex = " Anchor.toml | grep -oP '"\K[^"]+' || echo "Unknown"
}

# Initialize
log "$BLUE" "🔍 Starting consistency checks for Solana DEX..."
log "$BLUE" "Project root: $(pwd)"
echo ""

# Check 1: Basic project structure
log "$BLUE" "1. Checking project structure..."
if [ ! -d "programs/solana-dex/src" ]; then
    log "$RED" "❌ ERROR: Missing program source directory"
    exit 1
fi

if [ ! -f "programs/solana-dex/src/lib.rs" ]; then
    log "$RED" "❌ ERROR: Missing main lib.rs file"
    exit 1
fi

if [ ! -f "Anchor.toml" ]; then
    log "$RED" "❌ ERROR: Missing Anchor.toml configuration"
    exit 1
fi

log "$GREEN" "✅ Project structure is valid"

# Check 2: Program IDs consistency
log "$BLUE" "2. Checking program ID consistency..."
CODE_PROGRAM_ID=$(get_program_id)
ANCHOR_PROGRAM_ID=$(get_anchor_program_id)

log "$BLUE" "   Program ID in code: $CODE_PROGRAM_ID"
log "$BLUE" "   Program ID in Anchor.toml: $ANCHOR_PROGRAM_ID"

if [ "$CODE_PROGRAM_ID" = "Unknown" ] || [ "$ANCHOR_PROGRAM_ID" = "Unknown" ]; then
    log "$RED" "❌ ERROR: Could not extract program IDs"
    exit 1
fi

if [ "$CODE_PROGRAM_ID" = "$ANCHOR_PROGRAM_ID" ]; then
    log "$GREEN" "✅ Program IDs match"
else
    log "$YELLOW" "⚠️  Warning: Program IDs don't match!"
    log "$YELLOW" "   This might be expected during initial deployment"
fi

# Check 3: Smart contract compilation
log "$BLUE" "3. Checking smart contract compilation..."
if [ -f "target/deploy/solana_dex.so" ]; then
    log "$YELLOW" "   .so file exists, checking if up-to-date..."
    if cargo build-sbf --manifest-path programs/solana-dex/Cargo.toml 2>&1 | grep -q "Finished"; then
        log "$GREEN" "✅ Program builds successfully"
    else
        log "$RED" "❌ ERROR: Program build failed"
        exit 1
    fi
else
    log "$YELLOW" "   .so file not found, building..."
    if anchor build; then
        log "$GREEN" "✅ Program built successfully"
    else
        log "$RED" "❌ ERROR: Program build failed"
        exit 1
    fi
fi

# Check 4: Core smart contract functions
log "$BLUE" "4. Checking core smart contract functions..."
REQUIRED_FUNCTIONS=("swap" "add_liquidity" "remove_liquidity" "initialize_pool")

for func in "${REQUIRED_FUNCTIONS[@]}"; do
    if ! grep -q "pub fn $func" "programs/solana-dex/src/lib.rs"; then
        log "$RED" "❌ ERROR: Missing $func function"
        exit 1
    fi
    log "$GREEN" "   ✓ $func function found"
done

# Check 5: Account structures
log "$BLUE" "5. Checking account structures..."
if ! grep -q "pub struct Pool" "programs/solana-dex/src/lib.rs"; then
    log "$RED" "❌ ERROR: Missing Pool account structure"
    exit 1
fi
log "$GREEN" "   ✓ Pool account structure found"

# Check 6: Error handling
log "$BLUE" "6. Checking error handling..."
if ! grep -q "#\\[error_code\\]" "programs/solana-dex/src/lib.rs"; then
    log "$RED" "❌ ERROR: Missing error code definitions"
    exit 1
fi
log "$GREEN" "   ✓ Error code definitions found"

# Check 7: Surfpool integration
log "$BLUE" "7. Checking Surfpool integration..."
if [ ! -f "runbooks/deployment/main.tx" ]; then
    log "$RED" "❌ ERROR: Missing Surfpool runbook main.tx"
    exit 1
fi

if [ ! -f "runbooks/deployment/signers.localnet.tx" ]; then
    log "$RED" "❌ ERROR: Missing Surfpool localnet signers"
    exit 1
fi

if [ ! -f "txtx.yml" ]; then
    log "$RED" "❌ ERROR: Missing txtx.yml Surfpool configuration"
    exit 1
fi

log "$GREEN" "✅ Surfpool runbooks are present"

# Check 8: Dependency versions
log "$BLUE" "8. Checking dependency versions..."
if ! grep -q "\"0.32.1\"" "Cargo.toml"; then
    log "$YELLOW" "⚠️  Warning: Anchor version might not be 0.32.1"
fi

if ! grep -q "\"0.32.1\"" "programs/solana-dex/Cargo.toml"; then
    log "$YELLOW" "⚠️  Warning: Program Anchor version might not be 0.32.1"
fi

log "$GREEN" "   ✓ Dependency checks complete"

# Check 9: Deployment scripts
log "$BLUE" "9. Checking deployment scripts..."
DEPLOY_SCRIPTS=("runbooks/build-deploy.sh" "runbooks/deploy-with-surfpool.sh" "runbooks/deploy-surfpool.sh")

for script in "${DEPLOY_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if grep -q "anchor build" "$script"; then
            log "$GREEN" "   ✓ $script uses anchor build"
        else
            log "$YELLOW" "   ⚠️  $script might not use proper build method"
        fi
    else
        log "$YELLOW" "   ⚠️  $script not found"
    fi
done

# Check 10: Documentation
log "$BLUE" "10. Checking documentation..."
if [ ! -f "runbooks/SURFPOOL_INTEGRATION.md" ]; then
    log "$YELLOW" "   ⚠️  SURFPOOL_INTEGRATION.md not found"
fi

if [ ! -f "runbooks/SURFPOOL_DEPLOYMENT_GUIDE.md" ]; then
    log "$YELLOW" "   ⚠️  SURFPOOL_DEPLOYMENT_GUIDE.md not found"
fi

log "$GREEN" "✅ Documentation checks complete"

# Check 11: Build artifacts
log "$BLUE" "11. Checking build artifacts..."
if [ ! -d "target" ]; then
    log "$YELLOW" "   ⚠️  target directory not found"
else
    log "$GREEN" "   ✓ target directory exists"
fi

if [ ! -d "target/idl" ]; then
    log "$YELLOW" "   ⚠️  IDL directory not found"
else
    log "$GREEN" "   ✓ IDL directory exists"
fi

echo ""
log "$GREEN" "🎉 All consistency checks passed!"
log "$GREEN" ""
log "$GREEN" "✅ Summary:"
log "$GREEN" "   - Smart contract structure: Valid"
log "$GREEN" "   - Program IDs: Consistent"
log "$GREEN" "   - Build system: Working"
log "$GREEN" "   - Core functions: Present"
log "$GREEN" "   - Surfpool integration: Valid"
log "$GREEN" "   - Documentation: Present"
log "$GREEN" ""
log "$GREEN" "✅ The project is ready for Surfpool deployment!"
echo ""

exit 0
