'use client';

import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { UnsafeBurnerWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

import { SOLANA_RPC_URL } from './contracts';

export function SolanaWalletAdapterProvider({ children }: { children: React.ReactNode }) {
  const endpoint = SOLANA_RPC_URL;

  // Available wallets - supports both explicitly configured and automatically detected wallets
  // Phantom and Burner wallets are explicitly configured
  // Backpack and other wallets are automatically detected when installed
  const wallets = [
    new PhantomWalletAdapter(),
    new UnsafeBurnerWalletAdapter(),
  ];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
