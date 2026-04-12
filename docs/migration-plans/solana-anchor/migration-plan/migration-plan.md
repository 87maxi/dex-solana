# 📋 Plan de Migración: DEX de Solidity/Foundry a Solana/Anchor

## 📌 Tabla de Contenidos
1. [Mapping de Arquitectura Completa](#mapping-de-arquitectura-completa)
2. [Equivalencias de Estado, Eventos y Modificadores de Acceso](#equivalencias-de-estado-eventos-y-modificadores-de-acceso)
3. [Plan de Implementación por Etapas](#plan-de-implementación-por-etapas)
4. [Especificaciones Técnicas](#especificaciones-técnicas)
5. [Análisis de Severidad de Hallazgos](#análisis-de-severidad-de-hallazgos)

---

## 1. Mapping de Arquitectura Completa

### 1.1 Estructura del Sistema Original (Solidity/Foundry)

#### Contratos Principales:
```
ERC20.sol (Base Contract)
├── State Variables
│   ├── name: string
│   ├── symbol: string
│   ├── decimals: uint8
│   ├── totalSupply: uint256
│   ├── balanceOf: mapping(address => uint256)
│   └── allowance: mapping(address => mapping(address => uint256))
│
├── Events
│   ├── Transfer(address indexed from, address indexed to, uint256 value)
│   └── Approval(address indexed owner, address indexed spender, uint256 value)
│
└── Functions
    ├── constructor(string, string, uint8)
    ├── approve(address, uint256)
    ├── transfer(address, uint256)
    ├── transferFrom(address, address, uint256)
    ├── _transfer(address, address, uint256)
    ├── _mint(address, uint256)
    └── _burn(address, uint256)
```

```
TokenA.sol (ERC20 Extension)
├── Inherits ERC20
└── Additional Function
    └── mint(address, uint256)
```

```
TokenB.sol (ERC20 Extension)
├── Inherits ERC20
└── Additional Function
    └── mint(address, uint256)
```

```
DEX.sol (Main Exchange Contract)
├── Inherits ERC20
├── State Variables
│   ├── tokenA: ERC20
│   ├── tokenB: ERC20
│   ├── owner: address
│   ├── TOTAL_FEE: uint256 (30 = 0.3%)
│   ├── PROTOCOL_FEE: uint256 (10 = 0.1%)
│   ├── LP_FEE: uint256 (20 = 0.2%)
│   ├── FEE_DENOMINATOR: uint256 (10000)
│   ├── reserveA: uint256
│   ├── reserveB: uint256
│   ├── protocolFeeA: uint256
│   └── protocolFeeB: uint256
│
├── Events
│   ├── Swap(address indexed user, address indexed tokenIn, uint256 amountIn, uint256 amountOut)
│   ├── AddLiquidity(address indexed user, uint256 amountA, uint256 amountB, uint256 lpMinted)
│   └── RemoveLiquidity(address indexed user, uint256 lpBurned, uint256 amountA, uint256 amountB)
│
├── Functions
│   ├── constructor(address, address)
│   ├── addLiquidity(uint256, uint256) → uint256
│   ├── removeLiquidity(uint256) → (uint256, uint256)
│   ├── swap(address, uint256) → uint256
│   ├── getAmountOut(address, uint256) → uint256
│   ├── withdrawProtocolFees()
│   └── sqrt(uint256) → uint256
```

### 1.2 Estructura del Sistema Migrado (Solana/Anchor)

#### Programa Principal:
```
Dex (Solana Program)
├── Accounts (PDA - Program Derived Address)
│   ├── config: Config
│   ├── tokenA: TokenAccount
│   ├── tokenB: TokenAccount
│   ├── lpMint: TokenMint
│   ├── lpTokenAccount: TokenAccount (treasury)
│   ├── protocolFeeA: TokenAccount
│   ├── protocolFeeB: TokenAccount
│   ├── systemProgram: SystemProgram
│   ├── tokenProgram: TokenProgram
│   └── rent: Rent
│
├── State (Program State)
│   ├── owner: Pubkey
│   ├── totalFee: u64 (30 = 0.3%)
│   ├── protocolFee: u64 (10 = 0.1%)
│   ├── lpFee: u64 (20 = 0.2%)
│   ├── feeDenominator: u64 (10000)
│   ├── reserveA: u64
│   ├── reserveB: u64
│   ├── protocolFeeA: u64
│   └── protocolFeeB: u64
│
├── Events (Solana Events)
│   ├── Swap(User, TokenIn, AmountIn, AmountOut)
│   ├── AddLiquidity(User, AmountA, AmountB, LPMinted)
│   └── RemoveLiquidity(User, LPBurned, AmountA, AmountB)
│
└── Functions
    ├── initialize()
    ├── add_liquidity()
    ├── remove_liquidity()
    ├── swap()
    ├── get_amount_out()
    ├── withdraw_protocol_fees()
    └── sqrt_u64()
```

### 1.3 Mapa de Componentes por Funcionalidad

| Funcionalidad | Solidity | Solana/Anchor |
|--------------|----------|---------------|
| **Token Personalizado** | TokenA.sol, TokenB.sol | Implementar como custom token mint (bypassing SPL Token for custom logic) |
| **Token LP** | DEX.extends ERC20 | SPL Token mint for LP tokens |
| **Reservas** | reserveA, reserveB (uint256) | State variables in Anchor program |
| **Fees del Protocolo** | protocolFeeA, protocolFeeB (uint256) | Token accounts for storing fees |
| **Fees del Pool** | LP fee stays in reserves | LP fee added to reserves (increasing k) |
| **Fee Total** | 0.3% (30/10000) | Constant u64 value |
| **Fee Protocolo** | 0.1% (10/10000) | Calculated and stored in separate account |
| **Fee Pool** | 0.2% (20/10000) | Added to reserve before calculating amount out |
| **Acceso de Owner** | owner (address) | `pub owner: Pubkey` in program state |
| **Transferencias** | tokenA.transferFrom(), tokenB.transferFrom() | token program instructions (transferChecked) |
| **Mint de LP** | _mint() internal function | Token program instructions (mintTo) |
| **Quema de LP** | _burn() internal function | Token program instructions (burn) |
| **Calculo de sqrt** | sqrt() internal function | sqrt_u64() function in Rust |
| **Calculo de Fees** | Protocol fee = amountIn * 10/10000, LP fee = amountIn * 20/10000 | Similar calculation in Rust with u128 for precision |
| **Calculo de AmountOut** | reserveOut - (reserveIn * reserveOut) / newReserveIn (x*y=k) | Same formula using fixed-point arithmetic |
| **Eventos** | ERC20.Transfer, ERC20.Approval, Swap, AddLiquidity, RemoveLiquidity | Solana Programmatic Events (custom event structs) |
| **Check-effects-interactions** | No implementation, vulnerable to reentrancy | Implement checks-effects-interactions pattern in Rust |

---

## 2. Equivalencias de Estado, Eventos y Modificadores de Acceso

### 2.1 Estado

#### Solidity → Solana Mapping:

| Variable de Estado (Solidity) | Equivalente (Solana) | Notas |
|-------------------------------|----------------------|-------|
| `address public owner` | `pub owner: Pubkey` | Owner tiene control de protocol fees |
| `uint256 public reserveA` | `pub reserve_a: u64` | Reserva de TokenA en el pool |
| `uint256 public reserveB` | `pub reserve_b: u64` | Reserva de TokenB en el pool |
| `uint256 public protocolFeeA` | `pub protocol_fee_a: u64` | Fee acumulada de TokenA |
| `uint256 public protocolFeeB` | `pub protocol_fee_b: u64` | Fee acumulada de TokenB |
| `uint256 public totalSupply` | `pub total_supply: u64` | Total de LP tokens emitidos |
| `mapping(address => uint256) public balanceOf` | `pub balances: HashMap<Pubkey, u64>` | Balance de tokens para cada cuenta |
| `mapping(address => mapping(address => uint256)) public allowance` | N/A | No necesario en Solana (usar PDA para approvals) |

### 2.2 Eventos

#### Solidity Events → Solana Events:

| Solidity Event | Solana Event | Campos |
|----------------|--------------|--------|
| `Transfer(address indexed from, address indexed to, uint256 value)` | `#[event(name = "Transfer")]` | `from: Pubkey, to: Pubkey, value: u64` |
| `Approval(address indexed owner, address indexed spender, uint256 value)` | `#[event(name = "Approval")]` | `owner: Pubkey, spender: Pubkey, value: u64` |
| `Swap(address indexed user, address indexed tokenIn, uint256 amountIn, uint256 amountOut)` | `#[event(name = "Swap")]` | `user: Pubkey, token_in: Pubkey, amount_in: u64, amount_out: u64` |
| `AddLiquidity(address indexed user, uint256 amountA, uint256 amountB, uint256 lpMinted)` | `#[event(name = "AddLiquidity")]` | `user: Pubkey, amount_a: u64, amount_b: u64, lp_minted: u64` |
| `RemoveLiquidity(address indexed user, uint256 lpBurned, uint256 amountA, uint256 amountB)` | `#[event(name = "RemoveLiquidity")]` | `user: Pubkey, lp_burned: u64, amount_a: u64, amount_b: u64` |

### 2.3 Modificadores de Acceso

#### Solidity Modifiers → Solana Access Control:

| Modifier (Solidity) | Equivalente (Solana) | Implementación |
|---------------------|----------------------|----------------|
| `onlyOwner` (en withdrawProtocolFees()) | Program state `owner` check | `if ctx.accounts.owner.key != owner { return Err(ProgramError::InvalidArgument) }` |
| `msg.sender` en Solidity | `ctx.accounts.user.key` en Solana | El account que invoca la instrucción |

### 2.4 Flujos de Operaciones

#### 2.4.1 Add Liquidity

**Solidity:**
```
1. User calls addLiquidity(amountA, amountB)
2. Checks: amountA > 0 && amountB > 0
3. If totalSupply == 0: lpMinted = sqrt(amountA * amountB)
   Else: lpMinted = min(amountA * totalSupply / reserveA, amountB * totalSupply / reserveB)
4. Checks: lpMinted > 0
5. tokenA.transferFrom(msg.sender, address(this), amountA)
6. tokenB.transferFrom(msg.sender, address(this), amountB)
7. reserveA += amountA; reserveB += amountB
8. _mint(msg.sender, lpMinted)
9. Emit AddLiquidity event
```

**Solana:**
```
1. User calls add_liquidity()
2. Checks: amountA > 0 && amountB > 0
3. Calculate lpMinted:
   - If total_supply == 0: lp_minted = sqrt_u64(amount_a * amount_b)
   - Else: lp_from_a = amount_a * total_supply / reserve_a; lp_from_b = amount_b * total_supply / reserve_b; lp_minted = min(lp_from_a, lp_from_b)
4. Checks: lp_minted > 0
5. tokenA.transfer_from(user, dex_token_account, amountA)
6. tokenB.transfer_from(user, dex_token_account, amountB)
7. Update state: reserve_a += amountA; reserve_b += amountB; total_supply += lp_minted
8. token.mint_to(lpmint, dex_lp_token_account, lp_minted)
9. Emit AddLiquidity event
```

#### 2.4.2 Swap

**Solidity:**
```
1. User calls swap(tokenIn, amountIn)
2. Checks: amountIn > 0 && tokenIn == address(tokenA) || address(tokenB)
3. token.transferFrom(msg.sender, address(this), amountIn)
4. Calculate fees: protocolFee = amountIn * 10/10000; lpFee = amountIn * 20/10000; amountInAfterFee = amountIn - protocolFee - lpFee
5. Track protocolFeeA/B based on tokenIn
6. newReserveIn = reserveIn + amountInAfterFee + lpFee
7. amountOut = reserveOut - (reserveIn * reserveOut) / newReserveIn
8. Checks: amountOut > 0
9. Update reserves based on isAtoB
10. token.transfer(msg.sender, amountOut)
11. Emit Swap event
```

**Solana:**
```
1. User calls swap()
2. Checks: amount_in > 0 && token_in == tokenA || tokenB
3. Calculate fees: protocol_fee = amount_in * 10/10000; lp_fee = amount_in * 20/10000; amount_in_after_fee = amount_in - protocol_fee - lp_fee
4. Track protocol fee in state
5. new_reserve_in = reserve_in + amount_in_after_fee + lp_fee
6. amount_out = reserve_out - (reserve_in * reserve_out) / new_reserve_in (using fixed-point arithmetic)
7. Checks: amount_out > 0
8. Update reserves based on is_atob
9. token.transfer(token_out, user, amount_out)
10. Emit Swap event
```

---

## 3. Plan de Implementación por Etapas

### 🎯 Objetivo General

Migrar el sistema DEX completo de Solidity/Foundry a Solana/Anchor, manteniendo toda la funcionalidad mientras se aprovecha las ventajas de Solana (menos gas, más throughput, más velocidades de confirmación).

---

### 📦 Etapa 1: Setup de Proyecto Anchor y Estructura Inicial

#### 1.1. Creación del Proyecto Anchor

**Pasos:**
```bash
# Crear estructura de carpetas
mkdir -p solana-projects/anchor-dex/{programs/anchor-dex/src,tests,migrations,scripts,src,config}

# Inicializar proyecto Anchor
cd solana-projects/anchor-dex
anchor init anchor-dex

# Estructura resultante:
# anchor-dex/
# ├── programs/
# │   └── anchor-dex/
# │       └── src/
# ├── tests/
# ├── migrations/
# ├── scripts/
# ├── src/
# └── config/
#     ├── Anchor.toml
#     ├── package.json
#     └── tsconfig.json
```

#### 1.2. Configuración de Anchor.toml

```toml
[toolchain]

[features]
seeds = false
skip-lint = false

[programs.localnet]
anchor_dex = "AnchorDex1111111111111111111111111111111111111"

[programs.devnet]
anchor_dex = "AnchorDex1111111111111111111111111111111111111"

[programs.mainnet]
anchor_dex = "AnchorDex1111111111111111111111111111111111111"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

#### 1.3. Configuración de package.json

```json
{
  "name": "anchor-dex",
  "version": "0.1.0",
  "description": "Decentralized Exchange on Solana with Anchor",
  "license": "MIT",
  "author": "",
  "repository": "",
  "bugs": "",
  "homepage": "",
  "dependencies": {
    "@coral-xyz/anchor": "^0.29.0"
  },
  "devDependencies": {
    "@types/chai": "^4.3.4",
    "@types/mocha": "^10.0.0",
    "chai": "^4.3.4",
    "mocha": "^10.2.0",
    "ts-mocha": "^10.0.0",
    "typescript": "^5.0.4"
  },
  "engines": {
    "node": ">=16.9.0",
    "yarn": ">=1.22.0"
  }
}
```

#### 1.4. Creación de Estructura de Carpetas de Proyecto

```
solana-projects/anchor-dex/
├── programs/
│   └── anchor-dex/
│       ├── src/
│       │   ├── error.rs
│       │   ├── lib.rs
│       │   ├── state.rs
│       │   └── instructions.rs
│       ├── tests/
│       │   └── integration_tests.ts
│       └── Cargo.toml
├── tests/
│   └── integration_tests.ts
├── scripts/
│   └── deploy.ts
├── migrations/
│   └── 1_deploy_v1.rs
└── config/
    ├── Anchor.toml
    └── tsconfig.json
```

#### 1.5. Cargo.toml del Programa

```toml
[package]
name = "anchor-dex"
version = "0.1.0"
description = "A DEX on Solana with Anchor"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "anchor_dex"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = "0.29.0"
solana-program = "=1.17.0"
solana-program-test = "=1.17.0"
solana-sdk = "=1.17.0"

[dev-dependencies]
anchor-client = "0.29.0"
```

#### 1.6. Creación de Estructuras y Tipos

**Archivo: `programs/anchor-dex/src/state.rs`**

```rust
use anchor_lang::prelude::*;

#[account]
pub struct DEXConfig {
    pub owner: Pubkey,
    pub total_fee: u64,
    pub protocol_fee: u64,
    pub lp_fee: u64,
    pub fee_denominator: u64,
    pub reserve_a: u64,
    pub reserve_b: u64,
    pub protocol_fee_a: u64,
    pub protocol_fee_b: u64,
    pub total_supply: u64,
}

impl DEXConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        8 + // total_fee
        8 + // protocol_fee
        8 + // lp_fee
        8 + // fee_denominator
        8 + // reserve_a
        8 + // reserve_b
        8 + // protocol_fee_a
        8 + // protocol_fee_b
        8 + // total_supply
        4;  // padding to make size a multiple of 8

    pub fn new(owner: Pubkey) -> Self {
        Self {
            owner,
            total_fee: 30, // 0.3%
            protocol_fee: 10, // 0.1%
            lp_fee: 20, // 0.2%
            fee_denominator: 10000,
            reserve_a: 0,
            reserve_b: 0,
            protocol_fee_a: 0,
            protocol_fee_b: 0,
            total_supply: 0,
        }
    }
}
```

**Archivo: `programs/anchor-dex/src/instructions.rs`**

```rust
use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, transfer};

declare_id!("AnchorDex1111111111111111111111111111111111111");

#[program]
pub mod anchor_dex {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let dex_config = &mut ctx.accounts.dex_config;
        *dex_config = DEXConfig::new(ctx.accounts.owner.key());
        Ok(())
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity>, amount_a: u64, amount_b: u64) -> Result<()> {
        // Implementación en Etapa 3
        Ok(())
    }

    pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, lp_amount: u64) -> Result<()> {
        // Implementación en Etapa 3
        Ok(())
    }

    pub fn swap(ctx: Context<Swap>, token_in: Pubkey, amount_in: u64) -> Result<()> {
        // Implementación en Etapa 3
        Ok(())
    }

    pub fn get_amount_out(ctx: Context<GetAmountOut>, token_in: Pubkey, amount_in: u64) -> Result<u64> {
        // Implementación en Etapa 3
        Ok(0)
    }

    pub fn withdraw_protocol_fees(ctx: Context<WithdrawProtocolFees>) -> Result<()> {
        // Implementación en Etapa 3
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = DEXConfig::LEN
    )]
    pub dex_config: Account<'info, DEXConfig>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(
        mut,
        has_one = token_a,
        has_one = token_b,
        has_one = dex_config
    )]
    pub dex_config: Account<'info, DEXConfig>,
    #[account(mut)]
    pub token_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub lp_mint: Account<'info, Mint>,
    #[account(mut)]
    pub lp_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(
        mut,
        has_one = token_a,
        has_one = token_b,
        has_one = dex_config
    )]
    pub dex_config: Account<'info, DEXConfig>,
    #[account(mut)]
    pub token_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub lp_mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_lp_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: AccountInfo<'info>,
    #[account(mut)]
    pub lp_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(
        mut,
        has_one = token_a,
        has_one = token_b,
        has_one = dex_config
    )]
    pub dex_config: Account<'info, DEXConfig>,
    #[account(mut)]
    pub token_in: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_out: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct GetAmountOut<'info> {
    #[account(
        has_one = token_a,
        has_one = token_b,
        has_one = dex_config
    )]
    pub dex_config: Account<'info, DEXConfig>,
    #[account(mut)]
    pub token_in: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawProtocolFees<'info> {
    #[account(
        mut,
        has_one = token_a,
        has_one = token_b,
        has_one = dex_config,
        constraint = dex_config.owner == owner.key()
    )]
    pub dex_config: Account<'info, DEXConfig>,
    #[account(mut)]
    pub token_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub owner_token_account_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner_token_account_b: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
```

#### 1.7. Error Handling

**Archivo: `programs/anchor-dex/src/error.rs`**

```rust
use anchor_lang::prelude::*;

#[error_code]
pub enum DEXError {
    #[msg("Zero amount")]
    ZeroAmount,
    #[msg("Insufficient LP balance")]
    InsufficientLPBalance,
    #[msg("Insufficient liquidity burned")]
    InsufficientLiquidityBurned,
    #[msg("Invalid token")]
    InvalidToken,
    #[msg("Not owner")]
    NotOwner,
    #[msg("Insufficient output")]
    InsufficientOutput,
    #[msg("Insufficient initial liquidity")]
    InsufficientInitialLiquidity,
    #[msg("Insufficient liquidity minted")]
    InsufficientLiquidityMinted,
    #[msg("Underflow")]
    Underflow,
    #[msg("Overflow")]
    Overflow,
}
```

#### 1.8. Lib.rs

**Archivo: `programs/anchor-dex/src/lib.rs`**

```rust
mod instructions;
mod state;

use anchor_lang::prelude::*;

declare_id!("AnchorDex1111111111111111111111111111111111111");

pub use instructions::*;
pub use state::*;
```

#### 1.9. TypeScript Config

**Archivo: `config/tsconfig.json`**

```json
{
  "compilerOptions": {
    "types": ["mocha", "chai"],
    "lib": ["es2015", "dom"],
    "module": "commonjs",
    "target": "es6",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "resolveJsonModule": true
  },
  "include": ["./programs/anchor-dex/src/**/*.rs"]
}
```

---

### 🔄 Etapa 2: Implementación de Tokens Personalizados (TokenA, TokenB)

#### 2.1. Opciones de Implementación

**Opción A: Implementar tokens customizados** (Más cercano al original)
- Bypass SPL Token
- Implementar lógica propia
- Más complejo

**Opción B: Usar SPL Token con custom mint** (Recomendado)
- Usar SPL Token estándar
- Personalizar metadata
- Más simple y robusto

#### 2.2. Implementación con SPL Token (Recomendado)

**Archivo: `scripts/deploy_tokens.ts`**

```typescript
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import { IDL, AnchorDex } from "./programs/anchor-dex/src/types";
import { Wallet } from "@coral-xyz/anchor";

const TOKEN_DECIMALS = 18;

export async function deployTokens() {
    // Setup
    const provider = getProvider();
    const program = new Program<IDL>(IDL, provider);

    // Crear mint accounts
    const tokenAKeypair = Keypair.generate();
    const tokenBKeypair = Keypair.generate();

    // Crear tokenA
    const tokenA = await Token.createMint(
        provider.connection,
        provider.wallet as any,
        tokenAKeypair.publicKey,
        null,
        TOKEN_DECIMALS,
        TOKEN_PROGRAM_ID
    );

    // Crear tokenB
    const tokenB = await Token.createMint(
        provider.connection,
        provider.wallet as any,
        tokenBKeypair.publicKey,
        null,
        TOKEN_DECIMALS,
        TOKEN_PROGRAM_ID
    );

    // Crear cuentas de almacenamiento para tokens
    const tokenAAccount = await tokenA.createAccount(
        provider.wallet.publicKey
    );
    const tokenBAccount = await tokenB.createAccount(
        provider.wallet.publicKey
    );

    // Mintear tokens para testing (10 cuentas con 10000 cada una)
    const accounts = generateTestAccounts(10);
    const mintAmount = 10000 * Math.pow(10, TOKEN_DECIMALS);

    for (const account of accounts) {
        await tokenA.mintTo(
            tokenAAccount,
            tokenAKeypair.publicKey,
            [account],
            mintAmount
        );
        await tokenB.mintTo(
            tokenBAccount,
            tokenBKeypair.publicKey,
            [account],
            mintAmount
        );
    }

    console.log("TokenA deployed at:", tokenAKeypair.publicKey.toBase58());
    console.log("TokenB deployed at:", tokenBKeypair.publicKey.toBase58());
    console.log("TokenA account at:", tokenAAccount.toBase58());
    console.log("TokenB account at:", tokenBAccount.toBase58());

    return {
        tokenA: tokenAKeypair.publicKey,
        tokenB: tokenBKeypair.publicKey,
        tokenAAccount,
        tokenBAccount,
    };
}

function generateTestAccounts(count: number): PublicKey[] {
    const accounts: PublicKey[] = [];
    for (let i = 0; i < count; i++) {
        accounts.push(
            new PublicKey(
                `111111111111111111111111111111111111111111111111111111111111111`
            ).add(
                Buffer.from(new Uint8Array([i]))
            )
        );
    }
    return accounts;
}

function getProvider(): AnchorProvider {
    const wallet = new Wallet(process.env.ANCHOR_WALLET || "~/.config/solana/id.json");
    return new AnchorProvider(
        new Connection(process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8899"),
        wallet,
        { commitment: "confirmed" }
    );
}
```

---

### ⚙️ Etapa 3: Implementación del DEX con LP Tokens

#### 3.1. Implementación de Funciones del DEX

**Archivo: `programs/anchor-dex/src/instructions.rs` (Actualizado)**

```rust
use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self, Token, TokenAccount, Mint, Transfer, TransferChecked, MintTo, Burn, BurnChecked},
    system_program::{self, Transfer, System},
};

declare_id!("AnchorDex1111111111111111111111111111111111111");

#[program]
pub mod anchor_dex {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let dex_config = &mut ctx.accounts.dex_config;
        *dex_config = DEXConfig::new(ctx.accounts.owner.key());
        Ok(())
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity>, amount_a: u64, amount_b: u64) -> Result<()> {
        let dex_config = &mut ctx.accounts.dex_config;
        
        // Validate amounts
        require!(amount_a > 0 && amount_b > 0, DEXError::ZeroAmount);

        let (lp_minted, mut lp_amount_transfer) = if dex_config.total_supply == 0 {
            // First liquidity: calculate LP tokens based on square root formula
            let product = (amount_a as u128) * (amount_b as u128);
            let lp_minted = if product == 0 { 0 } else {
                u64::try_from((product as f64).sqrt() as u64)
                    .unwrap_or(0)
            };
            require!(lp_minted > 0, DEXError::InsufficientInitialLiquidity);
            (lp_minted, lp_minted)
        } else {
            // Subsequent liquidity: proportional to existing reserves
            let lp_from_a = amount_a
                .saturating_mul(dex_config.total_supply)
                .saturating_div(dex_config.reserve_a);
            let lp_from_b = amount_b
                .saturating_mul(dex_config.total_supply)
                .saturating_div(dex_config.reserve_b);
            lp_amount_transfer = lp_from_a.min(lp_from_b);
            (lp_amount_transfer, lp_amount_transfer)
        };

        require!(lp_amount_transfer > 0, DEXError::InsufficientLiquidityMinted);

        // Transfer tokens to DEX
        let from_a = ctx.accounts.user.clone();
        let to_a = ctx.accounts.dex_token_account.clone();
        let from_b = ctx.accounts.user.clone();
        let to_b = ctx.accounts.dex_token_account.clone();

        let cpi_a = token::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: from_a.to_account_info(),
                    mint: ctx.accounts.token_a.to_account_info(),
                    to: to_a.to_account_info(),
                    authority: from_a,
                    decimals: 8,
                }
            ),
            amount_a,
            8,
        );
        token::transfer_checked(cpi_a)?;

        let cpi_b = token::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: from_b.to_account_info(),
                    mint: ctx.accounts.token_b.to_account_info(),
                    to: to_b.to_account_info(),
                    authority: from_b,
                    decimals: 8,
                }
            ),
            amount_b,
            8,
        );
        token::transfer_checked(cpi_b)?;

        // Update reserves
        dex_config.reserve_a += amount_a;
        dex_config.reserve_b += amount_b;

        // Mint LP tokens to user
        let cpi_mint = token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.lp_mint.to_account_info(),
                    to: ctx.accounts.lp_token_account.to_account_info(),
                    authority: ctx.accounts.dex_config.to_account_info(),
                }
            ),
            lp_amount_transfer,
        );
        token::mint_to(cpi_mint)?;

        // Update total supply
        dex_config.total_supply = dex_config.total_supply.saturating_add(lp_amount_transfer);

        // Emit event
        emit!(AddLiquidityEvent {
            user: ctx.accounts.user.key(),
            amount_a,
            amount_b,
            lp_minted: lp_amount_transfer,
        });

        Ok(())
    }

    pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, lp_amount: u64) -> Result<()> {
        let dex_config = &mut ctx.accounts.dex_config;
        
        // Validate LP amount
        require!(lp_amount > 0, DEXError::ZeroAmount);
        
        let user_lp_balance = ctx
            .accounts
            .user_lp_token_account
            .amount;
        require!(user_lp_balance >= lp_amount, DEXError::InsufficientLPBalance);

        // Calculate tokens to return
        let amount_a = (lp_amount as u128)
            .saturating_mul(dex_config.reserve_a as u128)
            .saturating_div(dex_config.total_supply as u128) as u64;
        let amount_b = (lp_amount as u128)
            .saturating_mul(dex_config.reserve_b as u128)
            .saturating_div(dex_config.total_supply as u128) as u64;

        require!(amount_a > 0 && amount_b > 0, DEXError::InsufficientLiquidityBurned);

        // Burn LP tokens from user
        let cpi_burn = token::burn_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                BurnChecked {
                    mint: ctx.accounts.lp_mint.to_account_info(),
                    to: ctx.accounts.user_lp_token_account.to_account_info(),
                    authority: ctx.accounts.user,
                    decimals: 8,
                }
            ),
            lp_amount,
            8,
        );
        token::burn_checked(cpi_burn)?;

        // Update total supply
        dex_config.total_supply = dex_config.total_supply.saturating_sub(lp_amount);

        // Transfer tokens back to user
        let from_a = ctx.accounts.dex_token_account.clone();
        let to_a = ctx.accounts.user.clone();
        let from_b = ctx.accounts.dex_token_account.clone();
        let to_b = ctx.accounts.user.clone();

        let cpi_a = token::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: from_a.to_account_info(),
                    mint: ctx.accounts.token_a.to_account_info(),
                    to: to_a.to_account_info(),
                    authority: from_a,
                    decimals: 8,
                }
            ),
            amount_a,
            8,
        );
        token::transfer_checked(cpi_a)?;

        let cpi_b = token::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: from_b.to_account_info(),
                    mint: ctx.accounts.token_b.to_account_info(),
                    to: to_b.to_account_info(),
                    authority: from_b,
                    decimals: 8,
