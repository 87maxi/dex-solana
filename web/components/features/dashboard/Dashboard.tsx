"use client";

import { useState, useEffect } from "react";
import { useAgnosticWallet } from "@/providers/AgnosticWalletProvider";
import { DEXService } from "@/lib/services/dex-service";
import { fmt } from "@/lib/utils";
import { formatUnits } from "viem";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

export function Dashboard(): React.ReactNode {
    const { isConnected, address, chainType } = useAgnosticWallet();
    const { wallet } = useWallet();
    const { connection } = useConnection();

    const [poolData, setPoolData] = useState({
        reservesA: 0n,
        reservesB: 0n,
        totalLPTokens: 0n,
        userShare: 0,
        userBalanceA: 0n,
        userBalanceB: 0n,
        userLPTokens: 0n,
        protocolFeesA: 0n,
        protocolFeesB: 0n,
        liquidityFeesA: 0n,
        liquidityFeesB: 0n,
    });

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isConnected || !address) return;

        const fetchPoolData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                if (chainType === "solana") {
                    if (!wallet || !connection) {
                        throw new Error("Solana wallet or connection not ready");
                    }
                    const data = await DEXService.getSolanaPoolData(
                        wallet.adapter,
                        connection
                    );
                    setPoolData(data);
                } else {
                    // Para EVM, implementar lógica similar
                    // Este es un placeholder
                    setPoolData({
                        reservesA: 1000000000000n,
                        reservesB: 2000000000000n,
                        totalLPTokens: 3000000000000n,
                        userShare: 0,
                        userBalanceA: 500000000000n,
                        userBalanceB: 1000000000000n,
                        userLPTokens: 1500000000000n,
                        protocolFeesA: 100000000000n,
                        protocolFeesB: 200000000000n,
                        liquidityFeesA: 200000000000n,
                        liquidityFeesB: 400000000000n,
                    });
                }
            } catch (err) {
                console.error("Error fetching pool data:", err);
                setError("Failed to fetch pool data. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPoolData();

        // Configurar actualizaciones periódicas
        const interval = setInterval(fetchPoolData, 30000); // Cada 30 segundos
        return () => clearInterval(interval);
    }, [isConnected, address, chainType, wallet, connection]);

    if (isLoading) {
        return (
            <div className="card-glow rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between mb-6">
                    <div className="h-6 w-32 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-6 w-16 bg-slate-200 rounded animate-pulse"></div>
                </div>
                <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 bg-slate-100 rounded animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card-glow rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
                    <div className="text-sm text-red-500 bg-red-50 px-3 py-1 rounded-full">{error}</div>
                </div>
            </div>
        );
    }

    const {
        reservesA,
        reservesB,
        totalLPTokens,
        userShare,
        userBalanceA,
        userBalanceB,
        userLPTokens,
        protocolFeesA,
        protocolFeesB,
        liquidityFeesA,
        liquidityFeesB,
    } = poolData;

    return (
        <div className="card-glow rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
                <div className="text-sm font-medium text-slate-500">
                    {chainType === "solana" ? "Solana" : "Ethereum"}
                </div>
            </div>

            <div className="space-y-6">
                {/* Reservas del Pool */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Pool Reserves</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Token A</div>
                            <div className="font-mono text-lg font-bold text-slate-900">
                                {fmt(reservesA)}
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Token B</div>
                            <div className="font-mono text-lg font-bold text-slate-900">
                                {fmt(reservesB)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Estadísticas del Usuario */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Your Position</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Share of Pool</div>
                            <div className="font-mono text-lg font-bold text-slate-900">
                                {userShare.toFixed(2)}%
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Total LP Tokens</div>
                            <div className="font-mono text-lg font-bold text-slate-900">
                                {fmt(userLPTokens)}
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Balance A</div>
                            <div className="font-mono text-lg font-bold text-slate-900">
                                {fmt(userBalanceA)}
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Balance B</div>
                            <div className="font-mono text-lg font-bold text-slate-900">
                                {fmt(userBalanceB)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fees acumuladas */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Accumulated Fees</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Protocol Fees A</div>
                            <div className="font-mono text-lg font-bold text-slate-900">
                                {fmt(protocolFeesA)}
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Protocol Fees B</div>
                            <div className="font-mono text-lg font-bold text-slate-900">
                                {fmt(protocolFeesB)}
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Liquidity Fees A</div>
                            <div className="font-mono text-lg font-bold text-slate-900">
                                {fmt(liquidityFeesA)}
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Liquidity Fees B</div>
                            <div className="font-mono text-lg font-bold text-slate-900">
                                {fmt(liquidityFeesB)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
