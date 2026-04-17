# Surfpool Deployment Guide: Resolving Program ID Mismatch

This guide provides step-by-step instructions for deploying your Solana DEX using Surfpool, including resolving the critical "DeclaredProgramIdMismatch" (Error 4100) issue.

## Table of Contents

1. [Understanding the Problem](#understanding-the-problem)
2. [Prerequisites](#prerequisites)
3. [Solution Options](#solution-options)
4. [Option 1: Use Surfpool Runbooks (Recommended)](#option-1-use-surfpool-runbooks-recommended)
5. [Option 2: Clean Deployment](#option-2-clean-deployment)
6. [Option 3: Manual Program ID Fix](#option-3-manual-program-id-fix)
7. [Troubleshooting](#troubleshooting)
8. [Common Errors](#common-errors)
9. [Best Practices](#best-practices)

## Understanding the Problem

### What is DeclaredProgramIdMismatch (Error 4100)?

This error occurs when there's a mismatch between:
- The program ID declared in your Rust code (`declare_id!()`)
- The program ID in your `Anchor.toml` configuration
- The actual program ID deployed on the network

### Example Error
```
Program log: AnchorError occurred. Error Code: DeclaredProgramIdMismatch. Error Number: 4100. Error Message: The declared program id does not match the actual program id.
Program failed: custom program error: 0x1004
```

## Prerequisites

Before starting, ensure you have:
- [Surfpool](https://run.surfpool.run/) installed
- [Anchor CLI](https://projectserum.com/anchor) installed
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) installed
- Node.js and Yarn installed
- Rust toolchain installed

## Solution Options

### Option 1: Use Surfpool Runbooks (Recommended)

This is the cleanest approach that leverages Surfpool's infrastructure-as-code capabilities.

### Option 2: Clean Deployment

Best for starting fresh with a new development cycle.

### Option 3: Manual Program ID Fix

For cases where you need to preserve existing state.

## Option 1: Use Surfpool Runbooks (Recommended)

### Step 1: Install Surfpool

```bash
curl -sL https://run.surfpool.run/ | bash
```

### Step 2: Start Surfnet

```bash
surfpool start
```

### Step 3: Use the Definitive Deployment Script

```bash
./runbooks/deploy-with-surfpool.sh
```

This script will:
1. Build your smart contract
2. Start Surfnet if not running
3. Deploy using Surfpool runbooks
4. Initialize accounts
5. Mint tokens
6. Run consistency checks

### Step 4: Access Surfpool Studio

Open your browser to: `http://localhost:3000`

### Step 5: Verify Deployment

```bash
# Check program deployment
solana program list --url http://127.0.0.1:8899

# Run tests
anchor test --provider.cluster http://127.0.0.1:8899
```

## Option 2: Clean Deployment

### Step 1: Stop and Clean Surfnet

```bash
surfpool stop
rm -rf ~/.surfpool/data/*
```

### Step 2: Clean Anchor Artifacts

```bash
anchor clean
rm -rf target/
```

### Step 3: Start Fresh Surfnet

```bash
surfpool start
```

### Step 4: Rebuild and Deploy

```bash
anchor build
anchor deploy
anchor run init-accounts
anchor run mint-tokens
```

## Option 3: Manual Program ID Fix

### Step 1: Identify the Deployed Program ID

```bash
# Try to find the deployed program (may not work in all cases)
solana program list --url http://127.0.0.1:8899
```

### Step 2: Update Rust Code

```bash
# Get the deployed program ID (replace with actual ID)
DEPLOYED_ID="5wBqoTe26WyMQqRt65zKiXKcvrYoWChMC4fAgTMPYcf4"

# Update lib.rs
sed -i "s/declare_id!\\(\"[^\"]*\"\\)/declare_id!\\(\"$DEPLOYED_ID\"\\)/g" programs/solana-dex/src/lib.rs

# Update Anchor.toml
sed -i "s/solana_dex = \"[^\"]*\"/solana_dex = \"$DEPLOYED_ID\"/g" Anchor.toml
```

### Step 3: Rebuild

```bash
anchor clean
anchor build
```

### Step 4: Redeploy

```bash
anchor deploy
```

## Troubleshooting

### Surfnet Not Starting

```bash
# Check if Surfnet is running
surfpool status

# Check logs
tail -f /tmp/surfpool.log

# Restart Surfnet
surfpool stop
surfpool start
```

### Program Already Deployed

```bash
# Reset program state
anchor run reset-program

# Or clean deploy
rm -rf ~/.surfpool/data/*
surfpool start
anchor deploy
```

### Port Conflicts

```bash
# Check processes using port 8899
sudo lsof -i :8899

# Kill conflicting process
sudo kill -9 <PID>

# Start Surfnet on different port
surfpool start --rpc-port 8900
```

## Common Errors

### Error 4100: DeclaredProgramIdMismatch

**Cause**: Mismatch between declared and deployed program IDs.

**Solution**: Use one of the three options above.

### Error 0x1004: Program Already Deployed

**Cause**: Trying to deploy to a program account that already has a program.

**Solution**:
```bash
anchor run reset-program
# or
rm -rf ~/.surfpool/data/*
surfpool start
```

### Connection Refused to Surfnet

**Cause**: Surfnet not running or not accessible.

**Solution**:
```bash
surfpool stop
surfpool start
# Check connectivity
curl http://127.0.0.1:8899
```

## Best Practices

### Development Workflow

1. **Always use Surfpool runbooks** for deployments
2. **Start with a clean slate** when beginning a new development cycle
3. **Use `instant_surfnet_deployment = true`** in runbooks for faster development
4. **Monitor Surfnet logs** during development
5. **Access Surfpool Studio** for transaction debugging

### Production Considerations

1. **Never use instant deployment** in production
2. **Backup important state** before clean deployments
3. **Document your program IDs** for each environment
4. **Use different program IDs** for dev, test, and prod

### Project Structure

```
solana-dex/
├── runbooks/
│   ├── deployment/
│   │   ├── main.tx          # Main deployment logic
│   │   ├── signers.devnet.tx  # Environment signers
│   │   └── signers.localnet.tx # Localnet signers
│   ├── deploy-with-surfpool.sh # Definitive deployment script
│   ├── full-deploy.sh       # Traditional deployment
│   └── SURFPOOL_DEPLOYMENT_GUIDE.md # This guide
├── programs/
│   └── solana-dex/
│       └── src/
│           └── lib.rs       # Contains declare_id!
└── Anchor.toml              # Contains program configuration
```

## Additional Resources

- [Surfpool Documentation](https://docs.surfpool.run/)
- [Anchor Documentation](https://book.anchor-lang.com/)
- [Solana Program ID Mismatch](https://docs.solana.com/developing/programming-model/calling-between-programs#program-ids)
- [Surfpool GitHub](https://github.com/txtx/surfpool)
- [Anchor CLI Reference](https://docs.rs/anchor-cli/latest/anchor_cli/)

## Support

For issues and questions:
- Surfpool Discord: https://discord.gg/surfpool
- Solana Developer Forum: https://forum.solana.com
- GitHub Issues: https://github.com/txtx/surfpool/issues

## Final Notes

The **recommended approach** is to use the definitive deployment script:
```bash
./runbooks/deploy-with-surfpool.sh
```

This script handles all the complexity of program ID management and Surfnet integration, providing a consistent and reliable deployment experience. For production deployments, always verify your program IDs match across all environments and consider using environment-specific configurations.