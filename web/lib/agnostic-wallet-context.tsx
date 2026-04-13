'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { WagmiProvider, useAccount, useConnect, useDisconnect } from 'wagmi';
import { config } from './wagmi-config';
import { SolanaWalletAdapterProvider } from './wallet-adapter-config';
import { WalletProvider as SolanaWalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletProvider } from './wallet-context';

interface AgnosticWalletContextType {
  address: string | null;
  isConnected: boolean;
  chainType: 'solana' | 'evm' | null;
  connect: (type: 'solana' | 'evm') => Promise<void>;
  disconnect: () => Promise<void>;
  isConnecting: boolean;
}

const AgnosticWalletContext = createContext<AgnosticWalletContextType | undefined>(undefined);

export function AgnosticWalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <SolanaWalletAdapterProvider>
        <WalletProvider>
          <AgnosticWalletInner>{children}</AgnosticWalletInner>
        </WalletProvider>
      </SolanaWalletAdapterProvider>
    </WagmiProvider>
  );
}

function AgnosticWalletInner({ children }: { children: ReactNode }) {
  // EVM Hooks
  const { address: evmAddress, isConnected: isEvmConnected, isConnecting: isEvmConnecting } = useAccount();
  const { disconnect: evmDisconnect } = useDisconnect();

  // Solana Hooks
  const { publicKey, connected: isSolanaConnected, disconnect: solanaDisconnect, wallet } = useWallet();

  const agnosticValue = useMemo(() => {
    let address = null;
    let isConnected = false;
    let chainType: 'solana' | 'evm' | null = null;

    if (isSolanaConnected && publicKey) {
      address = publicKey.toString();
      isConnected = true;
      chainType = 'solana';
    } else if (isEvmConnected && evmAddress) {
      address = evmAddress;
      isConnected = true;
      chainType = 'evm';
    }

    return {
      address,
      isConnected,
      chainType,
      isConnecting: isEvmConnecting, // Simplified
      connect: async (_type: 'solana' | 'evm') => {
        // Handled by the Modal
      },
      disconnect: async () => {
        if (isSolanaConnected) await solanaDisconnect();
        if (isEvmConnected) await evmDisconnect();
      }
    };
  }, [publicKey, isSolanaConnected, evmAddress, isEvmConnected, isEvmConnecting]);

  return (
    <AgnosticWalletContext.Provider value={agnosticValue}>
      {children}
    </AgnosticWalletContext.Provider>
  );
}

export function useAgnosticWallet() {
  const context = useContext(AgnosticWalletContext);
  if (!context) {
    throw new Error('useAgnosticWallet must be used within AgnosticWalletProvider');
  }
  return context;
}
