# Solana DEX Deployment Guide

This guide provides comprehensive instructions for deploying the Solana DEX smart contract using Surfpool, following best practices from both Surfpool and txtx documentation.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Overview](#deployment-overview)
3. [Deployment Methods](#deployment-methods)
4. [Method 1: Surfpool Runbooks (Recommended)](#method-1-surfpool-runbooks-recommended)
5. [Method 2: Shell Scripts](#method-2-shell-scripts)
6. [Method 3: Manual Deployment](#method-3-manual-deployment)
7. [Post-Deployment Steps](#post-deployment-steps)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [Environment Setup](#environment-setup)
11. [Program ID Management](#program-id-management)

## Prerequisites

### Required Software

1. **Surfpool** - Local Solana validator with runbook support
   ```bash
   curl -sL https://run.surfpool.run/ | bash
   ```

2. **Anchor CLI** - Smart contract development framework
   ```bash
   cargo install anchor-cli
   ```

3. **Solana CLI** - Solana command-line tools
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

4. **Rust Toolchain** - For compiling smart contracts
   ```bash
   curl --proto =https --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

5. **Node.js** - JavaScript runtime (v16+ recommended)
   ```bash
   # Using nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
   nvm install 16
   ```

### Project Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd dex-solana/solana-dex
   ```

2. Install dependencies:
   ```bash
   npm install
   cd programs/solana-dex
   npm install
   cd ../..
   ```

3. Build the project:
   ```bash
   anchor build
   ```

## Deployment Overview

The Solana DEX can be deployed using three different methods:

1. **Surfpool Runbooks** (Recommended) - Uses txtx DSL for infrastructure-as-code
2. **Shell Scripts** - Traditional deployment using bash scripts
3. **Manual Deployment** - Step-by-step manual deployment process

Each method has its advantages and is suitable for different scenarios.

## Deployment Methods

### Method 1: Surfpool Runbooks (Recommended)

This method leverages Surfpool's infrastructure-as-code capabilities for consistent, reproducible deployments.

#### Step 1: Start Surfnet

```bash
surfpool start
```

#### Step 2: Deploy Using Runbook

```bash
surfpool run deployment
```

#### Step 3: Verify Deployment

```bash
solana program show solana_dex --url http://127.0.0.1:8899
```

#### Complete Workflow

```bash
# Start Surfnet
surfpool start

# Deploy using runbook
surfpool run deployment

# Verify program ID
solana program show solana_dex --url http://127.0.0.1:8899

# Access Studio UI
open http://localhost:3000
```

#### Benefits

- Infrastructure-as-Code approach
- Version-controlled deployment logic
- Composable transaction sequences
- Better collaboration and review
- Integration with CI/CD pipelines

### Method 2: Shell Scripts

This method uses pre-built shell scripts for deployment.

#### Option A: Quick Deployment

```bash
./runbooks/build-deploy.sh
```

#### Option B: Full Deployment

```bash
./runbooks/full-deploy.sh
```

#### Option C: Surfpool-Specific Deployment

```bash
./runbooks/deploy-with-surfpool.sh
```

#### Available Scripts

| Script | Purpose | Best For |
|--------|---------|----------|
| `build-deploy.sh` | Quick build and deploy | Fast testing |
| `full-deploy.sh` | Complete deployment with validation | Production-like deployments |
| `deploy-with-surfpool.sh` | Definitive Surfpool deployment | Consistent deployments |

### Method 3: Manual Deployment

This method provides step-by-step instructions for manual deployment.

#### Step 1: Build the Smart Contract

```bash
anchor build
```

#### Step 2: Start Surfnet

```bash
surfpool start
```

#### Step 3: Deploy the Program

```bash
anchor deploy --url http://127.0.0.1:8899
```

#### Step 4: Initialize Accounts

```bash
anchor run init-accounts
```

#### Step 5: Mint Tokens

```bash
anchor run mint-tokens
```

#### Complete Manual Workflow

```bash
# Build the program
anchor build

# Start local network
surfpool start

# Deploy the program
anchor deploy --url http://127.0.0.1:8899

# Initialize accounts
anchor run init-accounts

# Mint test tokens
anchor run mint-tokens

# Verify deployment
solana program show solana_dex --url http://127.0.0.1:8899
```

## Post-Deployment Steps

### Run Tests

```bash
anchor test --url http://127.0.0.1:8899
```

### Update Frontend Configuration

```bash
# Get the deployed program ID
PROGRAM_ID=$(solana program show solana_dex --url http://127.0.0.1:8899 | grep -oP 'Program Id: \K[^ ]+')

# Update frontend .env.local
cd ../web
echo "NEXT_PUBLIC_DEX_ADDRESS=$PROGRAM_ID" >> .env.local
```

### Access Surfpool Studio

```bash
open http://localhost:3000
```

### View Transaction History

```bash
solana confirm --url http://127.0.0.1:8899
```

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Program ID Mismatch

**Symptoms**: Error 4100 (DeclaredProgramIdMismatch)

**Solution**:
```bash
# Use the definitive deployment script
./runbooks/deploy-with-surfpool.sh

# Or clean deployment
rm -rf ~/.surfpool/data/*
surfpool start
anchor deploy
```

#### Issue 2: Surfnet Not Starting

**Symptoms**: Connection refused to port 8899

**Solution**:
```bash
# Check if Surfnet is running
surfpool status

# Check logs
tail -f /tmp/surfpool.log

# Start Surfnet manually
surfpool stop
surfpool start
```

#### Issue 3: Build Failures

**Symptoms**: Compilation errors during `anchor build`

**Solution**:
```bash
# Clean and rebuild
anchor clean
rm -rf target/
anchor build
```

#### Issue 4: Deployment Failures

**Symptoms**: "Program already deployed" error

**Solution**:
```bash
# Reset program state
anchor run reset-program

# Or clean deploy
rm -rf ~/.surfpool/data/*
surfpool start
anchor deploy
```

#### Issue 5: Port Conflicts

**Symptoms**: Port 8899 already in use

**Solution**:
```bash
# Find conflicting process
sudo lsof -i :8899

# Kill conflicting process
sudo kill -9 <PID>

# Start Surfnet on different port
surfpool start --rpc-port 8900
```

### Debugging Commands

```bash
# Check program logs
solana logs --url http://127.0.0.1:8899

# Check account state
solana account <ACCOUNT_ADDRESS> --url http://127.0.0.1:8899

# Check transaction history
solana confirm --url http://127.0.0.1:8899

# List all programs
solana program list --url http://127.0.0.1:8899
```

## Best Practices

### Development Workflow

1. **Always use consistent build methods**
   - Don't mix `cargo build` and `anchor build`
   - Use `anchor build` for all deployments

2. **Start with a clean slate for new development cycles**
   ```bash
   rm -rf ~/.surfpool/data/*
   surfpool start
   anchor build
   ```

3. **Use watch mode for development**
   ```bash
   surfpool start --watch
   ```

4. **Monitor logs during development**
   ```bash
   tail -f /tmp/surfpool.log
   ```

### Production Considerations

1. **Never use instant deployment in production**
   - Set `instant_surfnet_deployment = false` in runbooks

2. **Document program IDs for each environment**
   - Development
   - Testing
   - Staging
   - Production

3. **Use different program IDs for different environments**

4. **Backup important state before clean deployments**

### Code Management

1. **Version control deployment logic**
   - Keep runbooks in version control
   - Document changes in commit messages

2. **Use environment-specific configurations**
   - Different signer configurations
   - Different network URLs
   - Different deployment strategies

3. **Implement CI/CD pipelines**
   - Automate testing
   - Automate deployment
   - Automate validation

## Environment Setup

### Configuration Files

#### `txtx.yml`

The main Surfpool configuration:
```yaml
---
name: solana-dex
id: solana-dex
runbooks:
  - name: deployment
    description: Deploy programs
    location: runbooks/deployment
environments:
  localnet:
      network_id: localnet
      rpc_api_url: http://127.0.0.1:8899
  devnet:
      network_id: devnet
      rpc_api_url: https://api.devnet.solana.com
      payer_keypair_json: ~/.config/solana/id.json
      authority_keypair_json: ~/.config/solana/id.json
```

#### `Anchor.toml`

Anchor configuration:
```toml
[provider]
cluster = "localnet"
wallet = "~/.config/solana/id.json"

[programs.localnet]
solana_dex = "5wBqoTe26WyMQqRt65zKiXKcvrYoWChMC4fAgTMPYcf4"
```

### Environment Variables

```bash
# Set for deployment
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899

# Set for testing
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899

# Set for production
export ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com
```

## Program ID Management

### Understanding Program IDs

The program ID is the unique identifier for your smart contract on the Solana blockchain. There are three places where the program ID must match:

1. **Source code** (`declare_id!()` in `lib.rs`)
2. **Anchor configuration** (`Anchor.toml`)
3. **Actually deployed program ID**

### Changing Program IDs

#### For New Deployments

1. Generate a new program ID:
   ```bash
   solana-keygen grind --starts-with solana:5p8 --filepath ~/.config/solana/solana-dex.json
   ```

2. Update configuration files:
   ```bash
   NEW_ID="5wBqoTe26WyMQqRt65zKiXKcvrYoWChMC4fAgTMPYcf4"
   sed -i "s/declare_id!.*/declare_id!(\"$NEW_ID\")/" programs/solana-dex/src/lib.rs
   sed -i "s/solana_dex = .*/solana_dex = \"$NEW_ID\"/" Anchor.toml
   ```

3. Rebuild and deploy:
   ```bash
   anchor build
   anchor deploy
   ```

#### For Existing Deployments

When the program ID changes, you must:
- Clean Surfnet data
- Rebuild the program
- Deploy with new ID
- Update all references

```bash
rm -rf ~/.surfpool/data/*
anchor clean
anchor build
anchor deploy
```

### Program ID Verification

```bash
# Get program ID from source
grep -A1 "declare_id!" programs/solana-dex/src/lib.rs | grep -oP '"\K[^"]+'

# Get program ID from Anchor.toml
grep -A1 "solana_dex = " Anchor.toml | grep -oP '"\K[^"]+'

# Get deployed program ID
solana program show solana_dex --url http://127.0.0.1:8899 | grep -oP 'Program Id: \K[^ ]+'
```

## Deployment Scenarios

### Scenario 1: First Time Deployment

```bash
# 1. Build the program
anchor build

# 2. Start Surfnet
surfpool start

# 3. Deploy using Surfpool runbook
surfpool run deployment

# 4. Initialize accounts
anchor run init-accounts

# 5. Mint tokens
anchor run mint-tokens

# 6. Run tests
anchor test --url http://127.0.0.1:8899
```

### Scenario 2: Update Existing Deployment

```bash
# 1. Make changes to the smart contract
#    (edit programs/solana-dex/src/lib.rs)

# 2. Rebuild
anchor build

# 3. Redeploy
anchor deploy

# 4. Rerun tests
anchor test --url http://127.0.0.1:8899
```

### Scenario 3: Clean Redeployment

```bash
# 1. Clean all data
rm -rf ~/.surfpool/data/*
anchor clean

# 2. Rebuild from scratch
anchor build

# 3. Restart Surfnet
surfpool stop
surfpool start

# 4. Deploy fresh
anchor deploy

# 5. Reinitialize
anchor run init-accounts
anchor run mint-tokens
```

## Advanced Topics

### Using Watch Mode

Watch mode automatically rebuilds and redeploys when source files change:

```bash
surfpool start --watch
```

### Multi-Program Deployments

For projects with multiple programs:

```bash
# Deploy all programs
for program in $(grep -h "^\[" Anchor.toml | cut -d'[' -f2 | cut -d']' -f1); do
    anchor deploy $program --provider.cluster http://127.0.0.1:8899
done
```

### Environment-Specific Deployments

```bash
# Localnet deployment
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
anchor deploy

# Devnet deployment
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
anchor deploy
```

## Support and Resources

### Official Documentation

- [Surfpool Documentation](https://docs.surfpool.run)
- [Anchor Documentation](https://book.anchor-lang.com)
- [Solana Documentation](https://docs.solana.com)

### Community Resources

- [Surfpool Discord](https://discord.gg/surfpool)
- [Solana Developer Forum](https://forum.solana.com)
- [Anchor Discord](https://discord.gg/anchor-lang)

### Troubleshooting Guides

- [Surfpool Troubleshooting](https://docs.surfpool.run/troubleshooting)
- [Anchor Troubleshooting](https://book.anchor-lang.com/anchor_troubleshooting/troubleshooting)
- [Solana Troubleshooting](https://docs.solana.com/troubleshooting)

## Final Notes

### Recommended Approach

For most development scenarios, use the definitive deployment script:
```bash
./runbooks/deploy-with-surfpool.sh
```

### For Production

- Use environment-specific configurations
- Document all program IDs
- Implement proper backup procedures
- Monitor deployments carefully

### Best Practice Checklist

- [ ] Use Surfpool runbooks for infrastructure-as-code
- [ ] Maintain consistent build processes
- [ ] Document program IDs for each environment
- [ ] Implement proper error handling
- [ ] Run tests after each deployment
- [ ] Monitor deployment logs
- [ ] Use version control for deployment logic

This guide provides everything you need to successfully deploy the Solana DEX using Surfpool. For additional help, consult the official documentation or community resources.