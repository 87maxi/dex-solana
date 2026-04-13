import type { WalletAdapter } from '@solana/wallet-adapter-base';

export interface WalletInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
  adapter: WalletAdapter | null;
  isInstalled: boolean;
  isConnected: boolean;
}

export interface WalletMetadata {
  name: string;
  icon: React.ReactNode;
  installUrl: string;
  walletName: string;
}

const WALLET_METADATA: Record<string, WalletMetadata> = {
  phantom: {
    name: 'Phantom',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 12a4 4 0 1 1-8 0v4a4 4 0 1 1 8 0V12Z" stroke="#fff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
        <defs>
          <linearGradient id="phantom-gradient" x1="4" y1="12" x2="20" y2="12" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3944BC"/>
            <stop offset="1" stopColor="#6A35FF"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    installUrl: 'https://phantom.app/',
    walletName: 'Phantom',
  },
  backpack: {
    name: 'Backpack',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4V7H8a2 2 0 0 0-2-2v-1h2v1zm6 0H9a2 2 0 0 0-2 2v10h10V7a2 2 0 0 0-2-2zm6 0h-2v1h2V5zm0 12h-2v1h2V19zm-2-4h2v2h-2V15zm-2-2h2v2h-2V13zm-2-2h2v2h-2V11zm-2-2h2v2h-2V9zm-2-2h2v2h-2V7z" fill="#000"/>
      </svg>
    ),
    installUrl: 'https://backpack.app/',
    walletName: 'Backpack',
  },
  solflare: {
    name: 'Solflare',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#000" strokeWidth="2"/>
        <path d="M12 6v12M6 12h12" stroke="#000" strokeWidth="2"/>
      </svg>
    ),
    installUrl: 'https://solflare.com/',
    walletName: 'Solflare',
  },
  glow: {
    name: 'Glow',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#000"/>
        <path d="M12 7L2 12L12 17L22 12L12 7Z" fill="#000"/>
      </svg>
    ),
    installUrl: 'https://glow.app/',
    walletName: 'Glow',
  },
};

export function isWalletAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.solana;
}

export function getConnectedWalletInfo(): WalletInfo | null {
  if (typeof window === 'undefined') return null;
  if (!window.solana) return null;

  let walletInfo: WalletInfo | null = null;

  for (const [walletId, metadata] of Object.entries(WALLET_METADATA)) {
    if (window.solana[`is${walletId.charAt(0).toUpperCase() + walletId.slice(1)}` as keyof typeof window.solana]) {
      walletInfo = {
        id: walletId,
        name: metadata.name,
        icon: metadata.icon,
        adapter: null,
        isInstalled: true,
        isConnected: true,
      };
      break;
    }
  }

  return walletInfo;
}

export function detectAvailableWallets(): WalletInfo[] {
  if (typeof window === 'undefined') return [];
  if (!window.solana) return [];

  const wallets: WalletInfo[] = [];

  for (const [walletId, metadata] of Object.entries(WALLET_METADATA)) {
    const isWalletType = window.solana[`is${walletId.charAt(0).toUpperCase() + walletId.slice(1)}` as keyof typeof window.solana] === true;

    wallets.push({
      id: walletId,
      name: metadata.name,
      icon: metadata.icon,
      adapter: null,
      isInstalled: isWalletType,
      isConnected: isWalletType && window.solana.isConnected,
    });
  }

  return wallets;
}

export function getWalletMetadata(walletId: string): WalletMetadata | undefined {
  return WALLET_METADATA[walletId];
}

export function getWalletNameFromSolana(): string | null {
  if (typeof window === 'undefined') return null;
  if (!window.solana) return null;

  for (const [walletId, metadata] of Object.entries(WALLET_METADATA)) {
    if (window.solana[`is${walletId.charAt(0).toUpperCase() + walletId.slice(1)}` as keyof typeof window.solana]) {
      return metadata.name;
    }
  }

  return null;
}

export function isWalletConnected(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.solana) return false;
  return window.solana.isConnected;
}

export function connectWallet(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  if (!window.solana) return Promise.reject(new Error('No Solana wallet available'));

  return window.solana.connect();
}

export function disconnectWallet(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  if (!window.solana) return Promise.reject(new Error('No Solana wallet available'));
  if (!window.solana.isConnected) return Promise.reject(new Error('No active connection'));

  return window.solana.disconnect();
}

export function addWalletToDetection(walletId: string, metadata: WalletMetadata): void {
  WALLET_METADATA[walletId] = metadata;
}

export function getAllSupportedWallets(): WalletInfo[] {
  const supportedWallets: WalletInfo[] = [];

  for (const [walletId, metadata] of Object.entries(WALLET_METADATA)) {
    supportedWallets.push({
      id: walletId,
      name: metadata.name,
      icon: metadata.icon,
      adapter: null,
      isInstalled: false,
      isConnected: false,
    });
  }

  return supportedWallets;
}
