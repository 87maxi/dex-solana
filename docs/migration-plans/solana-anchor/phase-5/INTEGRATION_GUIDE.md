# 🔄 Guía de Integración: Migración del Frontend Web de Ethereum a Solana/Anchor

## 📋 Tabla de Contenidos
1. [Resumen del Cambio](#resumen-del-cambio)
2. [Preparación del Proyecto](#preparación-del-proyecto)
3. [Variables de Entorno](#variables-de-entorno)
4. [Actualización de Dependencias](#actualización-de-dependencias)
5. [Configuración de Conexión Solana](#configuración-de-conexión-solana)
6. [Cambios en Componentes](#cambios-en-componentes)
7. [Actualización de Funcionalidades](#actualización-de-funcionalidades)
8. [Testing y Deploy](#testing-y-deploy)
9. [Migración de Estado](#migración-de-estado)

---

## 🎯 Resumen del Cambio

### De Ethereum a Solana
| Aspecto | Ethereum (Viem/Wagmi) | Solana (Solana Web3.js) |
|---------|---------------------|------------------------|
| **Wallet** | MetaMask | Phantom / Solflare |
| **Provider** | window.ethereum | window.solana |
| **Signer** | `ethers.Wallet` | `@solana/web3.js` |
| **Contracts** | `ethers.Contract` | `@solana/spl-token` + `@solana/web3.js` |
| **Network** | EIP-1193 | Solana RPC |
| **Tokens** | ERC20 | SPL Token |
| **Events** | `ethers.Contract` events | `web3.eth.subscribe('newBlockHeaders')` + polling |

### Stack Tecnológico Actualizado
- **Framework**: Next.js 14.2.5 (mantener igual)
- **Styling**: Tailwind CSS + shadcn/ui (mantener igual)
- **Web3**: `@solana/web3.js` + `@solana/spl-token` (nuevo)
- **State Management**: React Context / Zustand (mantener igual)
- **TypeScript**: `@solana/web3.js` types (nuevo)

---

## 📦 Preparación del Proyecto

### 1. Crear carpeta de integración
```bash
mkdir -p web/src/lib/solana
mkdir -p web/src/hooks
mkdir -p web/src/components/solana
```

### 2. Instalar nuevas dependencias
```bash
cd web
npm install @solana/web3.js @solana/spl-token @solana/wallet-adapter-react @solana/wallet-adapter-wallets
npm install --save-dev @types/@solana/web3.js @types/@solana/spl-token
```

### 3. Configurar entorno Solana
Crear archivo `web/.env.local`:

```env
# Solana Network Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_WS_URL=wss://api.devnet.solana.com

# Token Accounts (from deployed Anchor program)
NEXT_PUBLIC_SOLANA_DEX_PROGRAM_ID=DEPLOYED_PROGRAM_ID

# Token Mints (from SPL Token deployment)
NEXT_PUBLIC_TOKEN_A_MINT=TA_MINT_ADDRESS
NEXT_PUBLIC_TOKEN_B_MINT=TB_MINT_ADDRESS

# LP Token Mint
NEXT_PUBLIC_LP_MINT=LP_MINT_ADDRESS

# Wallet Configuration
NEXT_PUBLIC_WALLET_NAME=Phantom
NEXT_PUBLIC_WALLET_URL=https://phantom.app
```

---

## 🌐 Variables de Entorno

### Archivo `.env.local`

```env
# === Ethereum Variables (KEEP for reference) ===
# NEXT_PUBLIC_ANVIL_RPC=http://127.0.0.1:8545
# NEXT_PUBLIC_TOKEN_A_ADDRESS=0x...
# NEXT_PUBLIC_TOKEN_B_ADDRESS=0x...
# NEXT_PUBLIC_DEX_ADDRESS=0x...

# === Solana Variables (NEW) ===
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_WS_URL=wss://api.devnet.solana.com

# Program IDs from Anchor deployment
NEXT_PUBLIC_SOLANA_DEX_PROGRAM_ID=9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9pWSGw8B

# SPL Token Mints (from token deployment)
NEXT_PUBLIC_TOKEN_A_MINT=Ta1z... (TokenA mint)
NEXT_PUBLIC_TOKEN_B_MINT=Tb1z... (TokenB mint)
NEXT_PUBLIC_LP_MINT=Lp1z... (LP token mint)

# Wallet Configuration
NEXT_PUBLIC_WALLET_NAME=Phantom
NEXT_PUBLIC_WALLET_URL=https://phantom.app

# Slippage Protection (in percentage)
NEXT_PUBLIC_SLIPPAGE_TOLERANCE=0.5
NEXT_PUBLIC_DEFAULT_AMOUT_MIN=1000
```

### Actualizar `web/.env.local`

```env
# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_WS_URL=wss://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_DEX_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID

# Token Mints
NEXT_PUBLIC_TOKEN_A_MINT=YOUR_TOKEN_A_MINT
NEXT_PUBLIC_TOKEN_B_MINT=YOUR_TOKEN_B_MINT
NEXT_PUBLIC_LP_MINT=YOUR_LP_MINT

# Wallet
NEXT_PUBLIC_WALLET_NAME=Phantom
NEXT_PUBLIC_WALLET_URL=https://phantom.app

# Slippage
NEXT_PUBLIC_SLIPPAGE_TOLERANCE=0.5
NEXT_PUBLIC_DEFAULT_AMOUNT_MIN=1000
```

---

## 📚 Actualización de Dependencias

### `package.json`

```json
{
  "dependencies": {
    "@solana/spl-token": "^0.4.9",
    "@solana/web3.js": "^1.95.3",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-wallets": "^0.19.24",
    "next": "14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "viem": "^2.21.0",
    "wagmi": "^2.12.0"
  },
  "devDependencies": {
    "@types/node": "^22.1.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@solana/web3.js": "^1.95.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.40",
    "tailwindcss": "^3.4.7",
    "typescript": "^5.5.4"
  }
}
```

### Instalar dependencias faltantes
```bash
npm install @solana/spl-token@^0.4.9 @solana/web3.js@^1.95.3
npm install @solana/wallet-adapter-react@^0.15.35 @solana/wallet-adapter-wallets@^0.19.24
npm install --save-dev @types/@solana/web3.js@^1.95.3
```

---

## 🔌 Configuración de Conexión Solana

### `web/src/lib/solana/connection.ts`

```typescript
import { Connection, PublicKey, Cluster } from '@solana/web3.js';

const getCluster = (): Cluster => {
  if (process.env.NODE_ENV === 'development') {
    return 'devnet';
  }
  return 'mainnet-beta';
};

const getRpcUrl = (): string => {
  if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  }
  return getCluster() === 'devnet' 
    ? 'https://api.devnet.solana.com' 
    : 'https://api.mainnet-beta.solana.com';
};

export const connection = new Connection(getRpcUrl(), 'confirmed');

export const getProgramId = (): PublicKey => {
  return new PublicKey(process.env.NEXT_PUBLIC_SOLANA_DEX_PROGRAM_ID!);
};

export const getTokenAMint = (): PublicKey => {
  return new PublicKey(process.env.NEXT_PUBLIC_TOKEN_A_MINT!);
};

export const getTokenBMint = (): PublicKey => {
  return new PublicKey(process.env.NEXT_PUBLIC_TOKEN_B_MINT!);
};

export const getLpMint = (): PublicKey => {
  return new PublicKey(process.env.NEXT_PUBLIC_LP_MINT!);
};

export const getClusterName = (): string => {
  return getCluster();
};
```

### `web/src/lib/solana/wallet.ts`

```typescript
import { 
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import * as token from '@solana/spl-token';

// Wallet Connection
export const connectWallet = async () => {
  try {
    const { solana } = window as any;
    if (!solana) {
      throw new Error('Solana wallet not found. Please install Phantom or Solflare.');
    }
    
    const response = await solana.connect();
    return response.publicKey;
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    throw error;
  }
};

export const disconnectWallet = async () => {
  try {
    const { solana } = window as any;
    if (solana && solana.isConnected) {
      await solana.disconnect();
    }
  } catch (error) {
    console.error('Failed to disconnect wallet:', error);
  }
};

// Transaction Utilities
export const getSignerFromWallet = async (wallet: any): Promise<any> => {
  if (!wallet) return null;
  return wallet;
};

export const signAndSendTransaction = async (
  transaction: Transaction,
  connection: Connection
) => {
  const { solana } = window as any;
  if (!solana) {
    throw new Error('Solana wallet not found');
  }

  const signature = await solana.signAndSendTransaction(transaction);
  return signature;
};

// Token Account Creation
export const createTokenAccount = async (
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> => {
  const tokenAccount = await token.createAccount(
    connection,
    { 
      signers: [], 
      instruction: 
        token.createAccountInstruction(
          { fromPubkey: payer, toPubkey: mint },
          mint,
          owner
        ) 
    },
    payer,
    mint,
    owner
  );
  return tokenAccount;
};

// Token Transfer
export const transferTokens = async (
  connection: Connection,
  from: PublicKey,
  to: PublicKey,
  amount: number,
  owner: PublicKey
) => {
  await token.transfer(
    connection,
    { 
      signers: [], 
      instruction: 
        token.createTransferInstruction(
          { fromPubkey: from, toPubkey: to },
          owner,
          owner,
          amount
        ) 
    },
    owner,
    from,
    to,
    amount
  );
};
```

### `web/src/hooks/useSolanaWallet.ts`

```typescript
import { useState, useEffect } from 'react';
import { 
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { 
  getProgramId,
  getTokenAMint,
  getTokenBMint,
  getLpMint,
  getClusterName,
} from '@/lib/solana/connection';
import { connectWallet, disconnectWallet, getSignerFromWallet } from '@/lib/solana/wallet';

export interface WalletState {
  publicKey: PublicKey | null;
  connected: boolean;
  balance: {
    tokenA: number;
    tokenB: number;
    lpTokens: number;
  };
}

export const useSolanaWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    publicKey: null,
    connected: false,
    balance: {
      tokenA: 0,
      tokenB: 0,
      lpTokens: 0,
    },
  });
  const [connection, setConnection] = useState<Connection | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const conn = new Connection(
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
          'confirmed'
        );
        setConnection(conn);

        const { solana } = window as any;
        if (solana && solana.isConnected) {
          const publicKey = new PublicKey(solana.publicKey);
          setWalletState({
            publicKey,
            connected: true,
            balance: {
              tokenA: 0,
              tokenB: 0,
              lpTokens: 0,
            },
          });
          
          await fetchBalances(publicKey, conn);
        }
      } catch (error) {
        console.error('Failed to initialize wallet:', error);
      }
    };

    init();

    // Listen for wallet connection changes
    const handleWalletChange = () => {
      const { solana } = window as any;
      if (solana && solana.isConnected) {
        const publicKey = new PublicKey(solana.publicKey);
        setWalletState({
          publicKey,
          connected: true,
          balance: {
            tokenA: 0,
            tokenB: 0,
            lpTokens: 0,
          },
        });
      } else {
        setWalletState({
          publicKey: null,
          connected: false,
          balance: {
            tokenA: 0,
            tokenB: 0,
            lpTokens: 0,
          },
        });
      }
    };

    window.addEventListener('solana:connect', handleWalletChange);
    window.addEventListener('solana:disconnect', handleWalletChange);

    return () => {
      window.removeEventListener('solana:connect', handleWalletChange);
      window.removeEventListener('solana:disconnect', handleWalletChange);
    };
  }, []);

  const connect = async () => {
    try {
      const { solana } = window as any;
      if (!solana) {
        throw new Error('Solana wallet not found. Please install Phantom or Solflare.');
      }
      await connectWallet();
      window.location.reload();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const disconnect = async () => {
    try {
      await disconnectWallet();
      window.location.reload();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const fetchBalances = async (publicKey: PublicKey, conn: Connection) => {
    try {
      // Fetch token balances
      const tokenAMint = getTokenAMint();
      const tokenBMint = getTokenBMint();
      const lpMint = getLpMint();

      const tokenAInfo = await token.getAccount(conn, tokenAMint);
      const tokenBInfo = await token.getAccount(tokenBMint);
      const lpInfo = await token.getAccount(lpMint);

      const tokenA = tokenAInfo?.amount || 0;
      const tokenB = tokenBInfo?.amount || 0;
      const lpTokens = lpInfo?.amount || 0;

      setWalletState(prev => ({
        ...prev,
        balance: { tokenA, tokenB, lpTokens },
      }));
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    }
  };

  return {
    ...walletState,
    connection,
    connect,
    disconnect,
    fetchBalances,
  };
};
```

---

## 🎨 Cambios en Componentes

### `web/src/components/solana/WalletConnect.tsx`

```typescript
'use client';

import { useSolanaWallet } from '@/hooks/useSolanaWallet';
import { WalletDisconnect, WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletConnect = () => {
  const { connected, publicKey, connect, disconnect } = useSolanaWallet();

  return (
    <div className="flex items-center gap-4">
      {connected ? (
        <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 shadow-md">
          <div className="text-sm font-medium">
            {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
          </div>
          <button
            onClick={disconnect}
            className="text-sm text-gray-600 hover:text-red-600 transition"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition shadow-md"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
};
```

### `web/src/components/solana/Dashboard.tsx`

```typescript
'use client';

import { useSolanaWallet } from '@/hooks/useSolanaWallet';
import { useEffect, useState } from 'react';

export const Dashboard = () => {
  const { walletState, connection } = useSolanaWallet();
  const [reserves, setReserves] = useState({
    tokenA: 0,
    tokenB: 0,
    lpTokens: 0,
    totalLiquidity: 0,
  });

  useEffect(() => {
    if (connection && walletState.connected) {
      fetchReserves();
    }
  }, [connection, walletState.connected]);

  const fetchReserves = async () => {
    // Fetch pool reserves from program
    try {
      const response = await fetch('/api/solana/reserves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: process.env.NEXT_PUBLIC_SOLANA_DEX_PROGRAM_ID,
          walletState,
        }),
      });

      const data = await response.json();
      setReserves(data);
    } catch (error) {
      console.error('Failed to fetch reserves:', error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Pool Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Token A Reserve */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-600 mb-2">Token A (TA)</h3>
          <p className="text-2xl font-bold">
            {reserves.tokenA.toLocaleString()} TA
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Total Supply: {walletState.balance.tokenA.toLocaleString()}
          </p>
        </div>

        {/* Token B Reserve */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-600 mb-2">Token B (TB)</h3>
          <p className="text-2xl font-bold">
            {reserves.tokenB.toLocaleString()} TB
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Total Supply: {walletState.balance.tokenB.toLocaleString()}
          </p>
        </div>

        {/* LP Tokens */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-600 mb-2">LP Tokens</h3>
          <p className="text-2xl font-bold">
            {reserves.lpTokens.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Your LP Tokens: {walletState.balance.lpTokens.toLocaleString()}
          </p>
        </div>

        {/* Your Share */}
        <div className="bg-gray-50 p-4 rounded-lg col-span-full">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Your Pool Share</h3>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold">
              {((walletState.balance.lpTokens / reserves.lpTokens) * 100).toFixed(2)}%
            </p>
            <p className="text-sm text-gray-500">
              {(reserves.tokenA + reserves.tokenB) / 2 * 0.03}% APY estimated
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## ⚡ Actualización de Funcionalidades

### Swap Component (`web/src/components/solana/Swap.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';
import { getProgramId, getTokenAMint, getTokenBMint, getLpMint } from '@/lib/solana/connection';

export const Swap = () => {
  const { walletState, connect } = useSolanaWallet();
  const [tokenIn, setTokenIn] = useState<'TA' | 'TB'>('TA');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSwap = async () => {
    if (!walletState.connected) {
      setError('Please connect your wallet first');
      return;
    }

    const amount = parseFloat(amountIn);
    if (amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/solana/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletState,
          tokenIn,
          amount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAmountOut(data.amountOut.toString());
      } else {
        setError(data.error || 'Swap failed');
      }
    } catch (err) {
      setError('Failed to execute swap');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Swap Tokens</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Token In Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Select Token</label>
          <div className="flex gap-2">
            <button
              onClick={() => setTokenIn('TA')}
              className={`flex-1 py-2 px-4 rounded-lg ${
                tokenIn === 'TA'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Token A (TA)
            </button>
            <button
              onClick={() => setTokenIn('TB')}
              className={`flex-1 py-2 px-4 rounded-lg ${
                tokenIn === 'TB'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Token B (TB)
            </button>
          </div>
        </div>

        {/* Amount In */}
        <div>
          <label className="block text-sm font-medium mb-2">Amount to Swap</label>
          <input
            type="number"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            placeholder="Enter amount"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Amount Out */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="block text-sm font-medium mb-2">Estimated Output</label>
          <input
            type="number"
            value={amountOut}
            disabled
            placeholder="0"
            className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={loading || !walletState.connected}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Swapping...' : 'Swap'}
        </button>
      </div>
    </div>
  );
};
```

### API Routes (`web/app/api/solana/swap/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { 
  getProgramId,
  getTokenAMint,
  getTokenBMint,
  getLpMint,
  connection,
} from '@/lib/solana/connection';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import * as token from '@solana/spl-token';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletState, tokenIn, amount } = body;

    if (!walletState?.connected) {
      return NextResponse.json(
        { success: false, error: 'Wallet not connected' },
        { status: 400 }
      );
    }

    const programId = getProgramId();
    const tokenAMint = getTokenAMint();
    const tokenBMint = getLpMint();

    // Determine token accounts
    const tokenInMint = tokenIn === 'TA' ? tokenAMint : getTokenBMint();
    const tokenOutMint = tokenIn === 'TA' ? getTokenBMint() : tokenAMint;

    // Create transaction
    const transaction = new Transaction().add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: walletState.publicKey,
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: tokenInMint,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: tokenOutMint,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        programId,
        data: Buffer.from(JSON.stringify({
          instruction: 'swap',
          tokenIn: tokenIn,
          amount: amount,
        })),
      })
    );

    // Sign and send transaction
    const signature = await connection.sendTransaction(
      transaction,
      [walletState.publicKey]
    );

    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    return NextResponse.json({
      success: confirmation.value.err === null,
      signature,
    });
  } catch (error) {
    console.error('Swap error:', error);
    return NextResponse.json(
      { success: false, error: 'Swap failed' },
      { status: 500 }
    );
  }
}
```

---

## 🧪 Testing y Deploy

### Testing en Desarrollo

```bash
# Start local Solana cluster
solana-test-validator

# Start Next.js dev server
cd web
npm run dev

# Test wallet connection
# 1. Open http://localhost:3000
# 2. Click "Connect Wallet"
# 3. Select Phantom wallet
# 4. Verify wallet connection
```

### Deploy al Devnet Solana

```bash
# Build the Anchor program
cd ../dex
anchor build

# Deploy al devnet
anchor deploy --provider.cluster devnet

# Record deployed program ID
# Copy the program ID to NEXT_PUBLIC_SOLANA_DEX_PROGRAM_ID

# Deploy SPL tokens
spl-token create-token --program-id tokenA
spl-token create-token --program-id tokenB
spl-token create-token --program-id lpToken

# Mint initial tokens
spl-token mint tokenA 1000000
spl-token mint tokenB 1000000
spl-token mint lpToken 0

# Deploy the frontend
cd web
npm run build
npm run start
```

### Variables de Producción

```env
# .env.production
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_DEX_PROGRAM_ID=PRODUCTION_PROGRAM_ID
NEXT_PUBLIC_TOKEN_A_MINT=PRODUCTION_TOKEN_A_MINT
NEXT_PUBLIC_TOKEN_B_MINT=PRODUCTION_TOKEN_B_MINT
NEXT_PUBLIC_LP_MINT=PRODUCTION_LP_MINT
```

---

## 📊 Migración de Estado

### Old State (Ethereum)
```typescript
interface EthereumState {
  wallet: {
    address: string | null;
    connected: boolean;
    balances: {
      tokenA: string;
      tokenB: string;
      lpTokens: string;
    };
  };
  dexState: {
    reserves: {
      tokenA: string;
      tokenB: string;
    };
    protocolFees: {
      tokenA: string;
      tokenB: string;
    };
  };
}
```

### New State (Solana)
```typescript
interface SolanaState {
  wallet: {
    publicKey: PublicKey | null;
    connected: boolean;
    balances: {
      tokenA: number;
      tokenB: number;
      lpTokens: number;
    };
  };
  pool: {
    reserves: {
      tokenA: number;
      tokenB: number;
    };
    lpSupply: number;
    userShare: number;
    protocolFees: {
      tokenA: number;
      tokenB: number;
    };
  };
  fees: {
    protocolFees: number;
    poolFees: number;
  };
}
```

---

## 🔄 Migration Checklist

- [ ] Actualizar `package.json` con nuevas dependencias
- [ ] Crear archivo `.env.local` con variables Solana
- [ ] Crear archivos en `web/src/lib/solana/`
- [ ] Crear hook `useSolanaWallet`
- [ ] Actualizar `WalletConnect` componente
- [ ] Crear componentes de Solana (`Swap`, `AddLiquidity`, `RemoveLiquidity`)
- [ ] Crear API routes para interactuar con programa Solana
- [ ] Actualizar `Dashboard` componente
- [ ] Migrar tests de frontend
- [ ] Testear en devnet
- [ ] Deploy a producción

---

## 📚 Recursos Adicionales

- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [SPL Token Documentation](https://spl.solana.com/token)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Phantom Wallet Integration](https://docs.phantom.app/integrating/connecting/)

---

## ❓ FAQ

**Q: ¿Cómo conectar Phantom wallet?**
A: Phantom wallet se conecta automáticamente a través de `window.solana`. Solo necesitas instalar Phantom y hacer clic en "Connect Wallet".

**Q: ¿Cómo obtener el Program ID?**
A: Ejecuta `anchor deploy` y copia el program ID del output.

**Q: ¿Cómo migrar mi estado existente?**
A: Reemplaza todas las referencias a `address` por `publicKey`, y usa `PublicKey` type de `@solana/web3.js`.

**Q: ¿Puedo usar MetaMask?**
A: No, MetaMask es para Ethereum. Para Solana necesitas Phantom, Solflare o Glow.
```

Perfecto, he creado el archivo `INTEGRATION_GUIDE.md` con una guía completa de integración para migrar el frontend web de Ethereum a Solana/Anchor. Ahora voy a crear los archivos de tests para la fase 4.