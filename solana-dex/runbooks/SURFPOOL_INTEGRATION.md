# Surfpool Integration for Solana DEX

This document provides comprehensive guidance on using Surfpool for deploying and managing the Solana DEX.

## Table of Contents

1. [Introduction to Surfpool](#introduction-to-surfpool)
2. [Setup and Installation](#setup-and-installation)
3. [Deployment Workflows](#deployment-workflows)
4. [Runbook System](#runbook-system)
5. [Common Issues and Solutions](#common-issues-and-solutions)
6. [Best Practices](#best-practices)
7. [FAQ](#faq)

## Introduction to Surfpool

Surfpool provides three major components that enhance Solana development:

### 1. Surfnet
- A local validator that runs on your machine
- Allows forking mainnet on the fly
- Provides access to latest chain data for testing
- Runs on port 8899 by default

### 2. Runbooks (Infrastructure as Code)
- Secure, reproducible deployment scripts
- Composable transaction files
- Version-controlled deployment logic
- Written in a declarative DSL

### 3. Surfpool Studio
- All-local web UI for transaction introspection
- Visual transaction debugging
- Account and program inspection

## Setup and Installation

### Prerequisites
- Node.js (v16+ recommended)
- Yarn or npm
- Rust (1.65+)
- Solana CLI (v1.16+)
- Anchor CLI (v0.29+)

### Install Surfpool

```bash
curl -sL https://run.surfpool.run/ | bash
```

### Install pre-built binaries (alternative)

```bash
# macOS (Homebrew)
brew install txtx/taps/surfpool

# Updating surfpool for Homebrew users
brew tap txtx/taps
brew reinstall surfpool
```

### Verify Installation

```bash
surfpool --version
anchor --version
solana --version
```

## Deployment Workflows

### Option 1: Using Shell Scripts (Quick Start)

```bash
# Build and deploy using Anchor
./runbooks/build-deploy.sh

# Full deployment with consistency checks
./runbooks/full-deploy.sh

# Surfpool-specific deployment
./runbooks/deploy-surfpool.sh
```

### Option 2: Using Surfpool Runbooks (Recommended)

```bash
# Start Surfnet
surfpool start

# Deploy using runbook
surfpool run deployment
```

### Option 3: Watch Mode (Development)

```bash
# Start Surfnet with auto-redeploy on changes
surfpool start --watch
```

## Runbook System

### Available Runbooks

```bash
surfpool ls
```

Expected output:
```
Name                                    Description
deployment                              Deploy programs
```

### Runbook Structure

```
runbooks/
└── deployment/
    ├── main.tx          # Main deployment logic
    ├── signers.devnet.tx    # Devnet signers
    ├── signers.localnet.tx # Localnet signers
    └── signers.mainnet.tx  # Mainnet signers
```

### Understanding `main.tx`

The main runbook file contains the deployment logic:

```txtx
action "deploy_solana_dex" "svm::deploy_program" {
    description = "Deploy solana_dex program"
    program = svm::get_program_from_anchor_project("solana_dex")
    authority = signer.authority
    payer = signer.payer
    # Optional: instant_surfnet_deployment = true
}
```

### Runbook Execution

```bash
# Execute deployment runbook
surfpool run deployment --network localnet

# Execute with specific environment
surfpool run deployment --env localnet

# Execute with debug output
surfpool run deployment -v
```

## Deployment Steps

### 1. Build the Program

```bash
anchor build
```

This command:
- Compiles the Rust smart contract
- Generates the `.so` file in `target/deploy/`
- Creates the IDL (Interface Description Language)
- Places artifacts in the correct locations for Surfpool

### 2. Start Surfnet

```bash
surfpool start
```

### 3. Deploy the Program

```bash
anchor deploy --url http://127.0.0.1:8899
```

### 4. Initialize Accounts

```bash
anchor run init-accounts
```

### 5. Mint Test Tokens

```bash
anchor run mint-tokens
```

### 6. Run Tests

```bash
anchor test --url http://127.0.0.1:8899
```

## Environment Configuration

### `txtx.yml` Structure

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

### Signer Configuration

The project uses different signer configurations for different environments:

- **Localnet**: Uses the default Solana keypair from `~/.config/solana/id.json`
- **Devnet**: Uses the default Solana keypair
- **Mainnet**: Would use different configurations (not currently implemented)

## Common Issues and Solutions

### Issue 1: Surfnet Not Running

**Symptoms**:
- Connection refused when trying to connect to localnet
- Port 8899 unavailable

**Solution**:
```bash
# Check if Surfnet is running
surfpool status

# Start Surfnet
surfpool start

# Check processes
ps aux | grep surfnet
```

### Issue 2: Build Failures

**Symptoms**:
- `anchor build` fails with compilation errors
- Missing dependencies in Cargo.toml

**Solution**:
```bash
# Clean and rebuild
anchor clean
anchor build

# Update dependencies
cargo update
```

### Issue 3: Deployment Failures

**Symptoms**:
- `anchor deploy` fails with program already exists
- Permission denied errors

**Solution**:
```bash
# Check existing programs
solana program show solana_dex --url http://127.0.0.1:8899

# Reset program (use with caution)
anchor run reset-program
```

### Issue 4: Surfpool CLI Not Found

**Symptoms**:
- Command not found when running `surfpool`
- Scripts fail because Surfpool is not installed

**Solution**:
```bash
# Reinstall Surfpool
curl -sL https://run.surfpool.run/ | bash

# Add to PATH if not automatically added
export PATH=$PATH:~/.surfpool/bin

# Add to shell config (~/.bashrc or ~/.zshrc)
echo 'export PATH=$PATH:~/.surfpool/bin' >> ~/.bashrc
source ~/.bashrc
```

### Issue 5: Port Conflicts

**Symptoms**:
- Surfnet can't bind to port 8899
- Another service is using the port

**Solution**:
```bash
# Find processes using port 8899
sudo lsof -i :8899

# Kill conflicting processes
sudo kill -9 <PID>

# Start Surfnet with different port (if needed)
surfpool start --rpc-port 8900
```

## Best Practices

### 1. Development Workflow

```bash
# Clean slate start
surfpool stop
surfpool clean
surfpool start

# Development with auto-reload
surfpool start --watch
```

### 2. Testing

```bash
# Run all tests
anchor test --url http://127.0.0.1:8899

# Run specific test
anchor test --test-name swap --url http://127.0.0.1:8899

# Run with verbose output
anchor test --url http://127.0.0.1:8899 -vvv
```

### 3. Debugging

```bash
# Check program logs
solana logs --url http://127.0.0.1:8899

# Check account state
solana account <PROGRAM_ID> --url http://127.0.0.1:8899

# Check transaction history
solana confirm --url http://127.0.0.1:8899
```

### 4. Migration from Traditional Deployment

If migrating from traditional Solana deployment:

```bash
# Remove old compiled artifacts
rm -rf target/
rm -rf programs/solana-dex/target/

# Rebuild with Anchor
anchor build

# Update deployment scripts to use Surfpool
# (Already done in the current implementation)
```

## Deployment Scripts Comparison

| Script | Purpose | Surfpool Integration | Build Method | Best For |
|--------|---------|----------------------|--------------|----------|
| `build-deploy.sh` | Quick build and deploy | Partial | `anchor build` | Fast testing |
| `full-deploy.sh` | Complete deployment with validation | Full | `anchor build` | Production-like deployments |
| `deploy-surfpool.sh` | Surfpool-specific deployment | Full | `anchor build` | Surfpool development |
| `deployment/main.tx` | Runbook-based deployment | Full | Automatic | CI/CD pipelines |

## Surfpool Studio

### Accessing the Studio

After starting Surfnet:

```bash
# Open in browser
open http://localhost:3000
```

### Studio Features

1. **Transaction Explorer**: View all transactions on the localnet
2. **Account Inspector**: Inspect account states and data
3. **Program Inspector**: Analyze deployed programs
4. **Logs Viewer**: Monitor program and validator logs
5. **Debugger**: Step through transaction execution

## FAQ

### Q: What's the difference between Surfnet and Anvil?

A: Surfnet is Surfpool's local Solana validator with additional features for development:
- Integrated with Surfpool's runbook system
- Better debugging tools
- Runbook execution capabilities
- Studio web interface

### Q: Can I use both Surfnet and Anvil?

A: Yes, but they would need to run on different ports. However, the scripts are currently configured to use Surfnet.

### Q: What are the benefits of using runbooks?

A: Runbooks provide:
- Infrastructure as Code for deployments
- Version-controlled deployment logic
- Composable transaction sequences
- Better collaboration and review process
- Integration with CI/CD pipelines

### Q: How do I add new deployment steps?

A: Edit the `runbooks/deployment/main.tx` file and add new actions:

```txtx
action "new_step" "svm::create_account" {
    description = "Create a new account"
    account = {
        key = "new_account"
        data = {
            space = 8
        }
    }
    payer = signer.payer
}
```

### Q: What happens when I use `surfpool start --watch`?

A: The `--watch` flag makes Surfnet automatically:
- Rebuild the program when source files change
- Redeploy the program
- Restart any related services
- Keep the development environment in sync

### Q: How do I clean up after development?

```bash
# Stop Surfnet
surfpool stop

# Clean up all data
surfpool clean

# Remove all deployed programs and accounts
solana program dump --all -u http://127.0.0.1:8899
```

## Troubleshooting Checklist

1. ✅ Surfpool installed and in PATH
2. ✅ Solana CLI configured with localnet
3. ✅ Anchor CLI installed and configured
4. ✅ Surfnet running on port 8899
5. ✅ Program built with `anchor build`
6. ✅ Correct signer configurations in place
7. ✅ Network URLs correct in configuration files
8. ✅ No port conflicts with other services
9. ✅ Sufficient disk space for build artifacts
10. ✅ Proper permissions on keypair files

## Support and Resources

### Official Documentation
- [Surfpool Documentation](https://docs.surfpool.run)
- [Surfpool GitHub](https://github.com/txtx/surfpool)
- [Anchor Documentation](https://book.anchor-lang.com/)

### Community
- [Surfpool Discord](https://discord.gg/surfpool)
- [Solana Developer Community](https://solana.com/developers)

### Common Commands Cheat Sheet

```bash
# Start Surfnet
surfpool start

# Stop Surfnet
surfpool stop

# Clean Surfnet data
surfpool clean

# List available runbooks
surfpool ls

# Run deployment
surfpool run deployment

# Start with auto-reload
surfpool start --watch

# Check status
surfpool status

# Build program
anchor build

# Deploy program
anchor deploy --url http://127.0.0.1:8899

# Run tests
anchor test --url http://127.0.0.1:8899

# Initialize accounts
anchor run init-accounts

# Mint tokens
anchor run mint-tokens
```

This documentation should provide you with everything you need to effectively use Surfpool for deploying and managing your Solana DEX project.