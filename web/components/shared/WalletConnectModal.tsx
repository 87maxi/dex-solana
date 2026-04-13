'use client';

import { useState } from 'react';
import { useAgnosticWallet } from '@/providers/AgnosticWalletProvider';
import { useConnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WalletIcon, ExternalLinkIcon } from 'lucide-react';

export function WalletConnectModal() {
    const [open, setOpen] = useState(false);
    const { isConnected, chainType } = useAgnosticWallet();

    // EVM
    const { connect: evmConnect, connectors } = useConnect();

    // Solana
    const { select, wallets, connect: solanaConnect } = useWallet();

    const handleEvmConnect = (connector: any) => {
        evmConnect({ connector });
        setOpen(false);
    };

    const handleSolanaConnect = async (walletName: any) => {
        try {
            select(walletName);
            await solanaConnect();
            setOpen(false);
        } catch (error) {
            console.error('Solana connection error:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="rounded-full bg-teal hover:bg-teal-dark text-white px-6 font-semibold shadow-lg shadow-teal/20 transition-all hover:scale-105 active:scale-95">
                    Connect Wallet
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white border-slate-200">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900">Connect Wallet</DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Choose a wallet to connect to the DEX.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-teal mb-3">Solana Wallets</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {wallets.filter(w => w.readyState !== 'Unsupported').map((wallet) => (
                                <button
                                    key={wallet.adapter.name}
                                    onClick={() => handleSolanaConnect(wallet.adapter.name)}
                                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-teal/30 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-6 h-6" />
                                        <span className="font-semibold text-slate-700">{wallet.adapter.name}</span>
                                    </div>
                                    {wallet.readyState === 'Installed' ? (
                                        <span className="text-[10px] bg-teal/10 text-teal px-2 py-0.5 rounded-full font-bold">Installed</span>
                                    ) : (
                                        <ExternalLinkIcon className="w-3 h-3 text-slate-300 group-hover:text-slate-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-3">EVM Wallets</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {connectors.map((connector) => (
                                <button
                                    key={connector.id}
                                    onClick={() => handleEvmConnect(connector)}
                                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-indigo-100 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        {connector.icon ? (
                                            <img src={connector.icon} alt={connector.name} className="w-6 h-6" />
                                        ) : (
                                            <WalletIcon className="w-6 h-6 text-indigo-400" />
                                        )}
                                        <span className="font-semibold text-slate-700">{connector.name}</span>
                                    </div>
                                    <ExternalLinkIcon className="w-3 h-3 text-slate-300 group-hover:text-slate-400" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
