# DEX Deployment Runbook

## Overview
This runbook describes the complete deployment process for the Solana DEX project using Surfpool infrastructure.

## Prerequisites
- Node.js 18+
- Anchor CLI
- Solana CLI
- Surfpool CLI
- Rust toolchain
- Anvil or local Solana network running

## Deployment Steps

### 1. Environment Setup
```bash
# Install dependencies
cd solana-dex
npm install

# Install Anchor dependencies
cargo install anchor-cli
```

### 2. Build Smart Contract
```bash
# Build the program
cd solana-dex
anchor build

# Verify compilation
anchor build --verifiable
```

### 3. Deploy Program
```bash
# Deploy to local network
cd solana-dex
anchor deploy

# Alternative: Deploy with specific configuration
anchor deploy --url http://127.0.0.1:8899
```

### 4. Initialize Accounts
```bash
# Initialize the DEX program
anchor run init-dex

# Create token accounts
anchor run init-tokens
```

### 5. Mint Initial Tokens
```bash
# Mint tokens to test accounts
anchor run mint-tokens
```

### 6. Verify Deployment
```bash
# Check program status
solana program show 5p8iy2yZWb4xjHj17AAoZwAFzFY4Zh4c2e3dV32uRRH3

# Verify accounts
solana account <config_account_address>
solana account <pool_account_address>
```

## Testing
```bash
# Run comprehensive tests
anchor test

# Run specific tests
anchor test --test-name swap
```

## Environment Variables
Create `.env.local` file:
```env
NEXT_PUBLIC_SOLANA_RPC_URL=http://127.0.0.1:8899
NEXT_PUBLIC_DEX_PROGRAM_ID=5p8iy2yZWb4xjHj17AAoZwAFzFY4Zh4c2e3dV32uRRH3
NEXT_PUBLIC_SOLANA_TOKEN_A_MINT=TokenAMintAddress
NEXT_PUBLIC_SOLANA_TOKEN_B_MINT=TokenBMintAddress
```

## Surfpool Integration
```bash
# Initialize Surfpool
surfpool init

# Deploy to Surfpool network
surfpool deploy --network localnet

# Monitor deployment
surfpool status
```

## Monitoring
```bash
# Monitor program transactions
solana program log 5p8iy2yZWb4xjHj17AAoZwAFzFY4Zh4c2e3dV32uRRH3

# Watch events
anchor run watch-events
```

## Troubleshooting
### Common Issues:
1. **Account not found**: Ensure accounts are created before using them
2. **Program ID mismatch**: Verify program ID in config matches deployed ID
3. **Insufficient funds**: Fund wallet with SOL for transaction fees
4. **Token account issues**: Reinitialize token accounts with correct mint addresses

### Reset Process:
```bash
# Reset program state
anchor run reset-program

# Reinitialize all accounts
anchor run init-all
```
