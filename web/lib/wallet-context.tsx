'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  useWallet,
  WalletContextState,
} from '@solana/wallet-adapter-react';
import {
  detectAvailableWallets,
  getConnectedWalletInfo,
  getWalletNameFromSolana,
} from './wallet-utils';

interface CustomWalletContextType {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
  publicKey: PublicKey | null | undefined;
  wallet: WalletContextState | null;
  isConnecting: boolean;
  error: Error | undefined;
  isDisconnecting: boolean;
  chainType: 'solana';
  availableWallets: Array<{
    id: string;
    name: string;
    icon: React.ReactNode;
    isInstalled: boolean;
    isConnected: boolean;
  }>;
  refreshWallets: () => void;
  connectedWalletName: string | null;
}

const WalletContext = createContext<CustomWalletContextType>({
  connect: async () => {},
  disconnect: async () => {},
  isConnected: false,
  publicKey: null,
  wallet: null,
  isConnecting: false,
  error: undefined,
  isDisconnecting: false,
  chainType: 'solana',
  availableWallets: [],
  refreshWallets: () => {},
  connectedWalletName: null,
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [availableWallets, setAvailableWallets] = useState<Array<{
    id: string;
    name: string;
    icon: React.ReactNode;
    isInstalled: boolean;
    isConnected: boolean;
  }>>([]);
  const [connectedWalletName, setConnectedWalletName] = useState<string | null>(null);
  const solanaWallet = useWallet();

  // Refresh wallet detection
  const refreshWallets = () => {
    const detectedWallets = detectAvailableWallets();
    setAvailableWallets(detectedWallets);

    const connectedWallet = getConnectedWalletInfo();
    if (connectedWallet) {
      setConnectedWalletName(connectedWallet.name);
    } else {
      setConnectedWalletName(null);
    }
  };

  useEffect(() => {
    // Initial wallet detection
    refreshWallets();

    // Set up event listener for wallet changes
    if (typeof window !== 'undefined' && window.addEventListener) {
      const handleWalletChange = () => {
        refreshWallets();
      };

      window.addEventListener('solanaWalletConnect', handleWalletChange);
      window.addEventListener('solanaWalletDisconnect', handleWalletChange);

      return () => {
        window.removeEventListener('solanaWalletConnect', handleWalletChange);
        window.removeEventListener('solanaWalletDisconnect', handleWalletChange);
      };
    }
  }, []);

  useEffect(() => {
    // Update connected wallet name when publicKey changes
    if (solanaWallet.publicKey) {
      const walletName = getWalletNameFromSolana();
      setConnectedWalletName(walletName);
    }
  }, [solanaWallet.publicKey]);

  const handleConnect = async () => {
    if (!solanaWallet.wallet) {
      setError(new Error('No Solana wallet detected. Please install Phantom, Backpack, or another Solana wallet extension.'));
      return;
    }

    try {
      setIsConnecting(true);
      setError(undefined);

      if (!solanaWallet.publicKey) {
        await solanaWallet.connect();
        // Refresh wallet detection after connection
        refreshWallets();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';

      // Provide more specific error messages
      if (errorMessage.includes('user rejected')) {
        setError(new Error('Wallet connection rejected. Please try connecting again.'));
      } else if (errorMessage.includes('not connected') || errorMessage.includes('connect')) {
        setError(new Error('Unable to connect to wallet. Make sure your wallet extension is unlocked.'));
      } else if (errorMessage.includes('network') || errorMessage.includes('rpc')) {
        setError(new Error('Network error. Please check your connection and try again.'));
      } else {
        setError(new Error(errorMessage || 'Unknown connection error'));
      }

      console.error('Connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await solanaWallet.disconnect();
      // Refresh wallet detection after disconnection
      refreshWallets();
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        connect: handleConnect,
        disconnect: handleDisconnect,
        isConnected: !!solanaWallet.publicKey,
        publicKey: solanaWallet.publicKey,
        wallet: solanaWallet,
        isConnecting,
        isDisconnecting,
        error,
        chainType: 'solana',
        availableWallets,
        refreshWallets,
        connectedWalletName,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useCustomWallet() {
  return useContext(WalletContext);
}
