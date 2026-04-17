# solana-dex Runbooks

[![Surfpool](https://img.shields.io/badge/Operated%20with-Surfpool-green?labelColor=gray)](https://surfpool.run)
[![Anchor](https://img.shields.io/badge/Built%20with-Anchor-blue)](https://projectserum.com/anchor)
[![Solana](https://img.shields.io/badge/Solana-1.16%2B-orange)](https://solana.com)

## Available Runbooks

### deployment
Deploy programs with Surfpool integration

## Quickstart with Surfpool

### 1. Install Surfpool

```console
curl -sL https://run.surfpool.run/ | bash
```

### 2. Start Surfnet

```console
surfpool start
```

### 3. Deploy Using Runbook

```console
surfpool run deployment
```

### 4. Access Studio UI

```console
# Open in browser
open http://localhost:3000
```

## Traditional Shell Script Deployment

### Quick Build and Deploy

```console
./runbooks/build-deploy.sh
```

### Full Deployment with Validation

```console
./runbooks/full-deploy.sh
```

### Surfpool-Specific Deployment

```console
./runbooks/deploy-surfpool.sh
```

## Deployment Workflows

### Option 1: Surfpool Runbooks (Recommended)

```console
# Start Surfnet
surfpool start

# Deploy using runbook
surfpool run deployment

# Watch mode for development (auto-redeploy on changes)
surfpool start --watch
```

### Option 2: Shell Scripts

```console
# Build and deploy
./runbooks/build-deploy.sh

# Full deployment with consistency checks
./runbooks/full-deploy.sh
```

## Installation

### Surfpool

```console
# Install Surfpool
curl -sL https://run.surfpool.run/ | bash

# Verify installation
surfpool --version
```

### Anchor CLI

```console
cargo install anchor-cli
anchor --version
```

### Solana CLI

```console
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
solana --version
```

## Project Structure

```
solana-dex/
├── runbooks/                  # Deployment runbooks
│   ├── deployment/            # Surfpool runbooks
│   │   ├── main.tx            # Main deployment logic
│   │   ├── signers.devnet.tx  # Devnet signers
│   │   ├── signers.localnet.tx # Localnet signers
│   │   └── signers.mainnet.tx # Mainnet signers
│   ├── build-deploy.sh        # Quick build and deploy
│   ├── full-deploy.sh         # Complete deployment
│   ├── deploy-surfpool.sh     # Surfpool-specific deployment
│   ├── consistency-check.sh   # Validation checks
│   ├── SURFPOOL_INTEGRATION.md # Surfpool documentation
│   └── README.md              # This file
├── programs/
│   └── solana-dex/            # Smart contract
├── tests/                     # Integration tests
└── migrations/                # Deployment scripts
```

## Key Features

### Surfpool Integration
- **Surfnet**: Local Solana validator for development
- **Runbooks**: Infrastructure-as-Code deployment
- **Studio UI**: Web-based transaction debugging
- **Watch Mode**: Auto-redeploy on code changes

### Deployment Best Practices
- Consistent build process using `anchor build`
- Environment-aware configuration
- Comprehensive validation checks
- Surfpool and traditional deployment options

## Environment Configuration

### txtx.yml
The main Surfpool configuration file:
```yaml
name: solana-dex
runbooks:
  - name: deployment
    location: runbooks/deployment
environments:
  localnet:
      rpc_api_url: http://127.0.0.1:8899
      network_id: localnet
  devnet:
      rpc_api_url: https://api.devnet.solana.com
      network_id: devnet
```

## Troubleshooting

### Surfnet Not Starting
```console
# Check if Surfnet is running
surfpool status

# Start Surfnet manually
surfpool start

# Check logs
tail -f /tmp/surfpool.log
```

### Build Failures
```console
# Clean and rebuild
anchor clean
anchor build
```

### Deployment Issues
```console
# Check program status
solana program show solana_dex --url http://127.0.0.1:8899

# Reset program state
anchor run reset-program
```

## Resources

- [Surfpool Documentation](https://docs.surfpool.run)
- [Anchor Documentation](https://book.anchor-lang.com)
- [Solana Documentation](https://docs.solana.com)
- [Surfpool GitHub](https://github.com/txtx/surfpool)

## Support

For issues and questions:
- Surfpool Discord: https://discord.gg/surfpool
- Solana Developer Forum: https://forum.solana.com