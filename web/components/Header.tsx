'use client';

import { useAgnosticWallet } from "@/lib/agnostic-wallet-context";
import { WalletConnectModal } from "@/components/WalletConnectModal";

export function Header(): React.ReactNode {
  const { address, isConnected, disconnect, isConnecting, chainType } = useAgnosticWallet();

  return (
    <header className="sticky top-0 z-40 border-b border-teal-100/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-teal to-teal-dark" />
            <span className="relative font-mono text-sm font-bold text-white tracking-tighter">
              DX
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-slate-950 leading-none">
              DEX
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-teal">
              Protocol v1
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-400">
          <span className="px-3 py-1.5 rounded-md text-teal bg-teal-50">
            Trade
          </span>
          <span className="px-3 py-1.5 rounded-md hover:text-slate-600 cursor-default">
            Pool
          </span>
          <span className="px-3 py-1.5 rounded-md hover:text-slate-600 cursor-default">
            Analytics
          </span>
        </nav>

        <div className="flex items-center gap-3">
          {isConnected && (
            <div className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${chainType === 'solana' ? 'bg-teal-50 text-teal' : 'bg-indigo-50 text-indigo-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${chainType === 'solana' ? 'bg-teal' : 'bg-indigo-500'}`} />
              {chainType === 'solana' ? 'Solana Devnet' : 'Ethereum Local'}
            </div>
          )}

          {isConnected && address ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white pl-3 pr-1 py-1 shadow-sm">
                <span className={`h-2 w-2 rounded-full ${chainType === 'solana' ? 'bg-teal' : 'bg-indigo-500'}`} />
                <span className="font-mono text-xs text-slate-600">
                  {address.slice(0, 6)}...
                  {address.slice(-4)}
                </span>
                <button
                  onClick={() => void disconnect()}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <WalletConnectModal />
          )}
        </div>
      </div>
    </header>
  );
}
