"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAgnosticWallet } from "@/providers/AgnosticWalletProvider";
import { fmt } from "@/lib/utils";
import { DEXService } from "@/lib/services/dex-service";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

export function RemoveLiquidityCard(): React.ReactNode {
    const { isConnected, address, chainType } = useAgnosticWallet();
    const { wallet } = useWallet();
    const { connection } = useConnection();

    const [lpAmount, setLpAmount] = useState("");
    const [estimatedOutA, setEstimatedOutA] = useState<bigint | undefined>();
    const [estimatedOutB, setEstimatedOutB] = useState<bigint | undefined>();
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("");
    const [isUserLpBalanceLoading, setIsUserLpBalanceLoading] = useState(false);

    const parsedLpAmount = lpAmount
        ? BigInt(Math.round(parseFloat(lpAmount) * 1e6))
        : 0n; // 6 decimals

    // Mock balances - en un entorno real se obtendrían del contrato
    const [userLpBalance, setUserLpBalance] = useState<bigint>(0n);

    useEffect(() => {
        if (!isConnected || !address) return;

        // Mock balance - en implementación real se buscaría el balance real
        setUserLpBalance(1000000000000n); // 1000 LP tokens
    }, [isConnected, address]);

    useEffect(() => {
        if (parsedLpAmount > 0n) {
            // Mock estimation - en implementación real se calcularía en el contrato
            setEstimatedOutA(parsedLpAmount / 2n);
            setEstimatedOutB(parsedLpAmount / 2n);
        } else {
            setEstimatedOutA(undefined);
            setEstimatedOutB(undefined);
        }
    }, [parsedLpAmount]);

    async function handleRemoveLiquidity(): Promise<void> {
        try {
            setBusy(true);
            setStatus("Removing liquidity...");

            let txHash = "";

            if (chainType === "solana") {
                if (!wallet || !connection)
                    throw new Error("Solana wallet or connection not ready");
                txHash = await DEXService.solanaRemoveLiquidity(
                    wallet.adapter,
                    connection,
                    parsedLpAmount
                );
            } else {
                // Implementar para EVM cuando sea necesario
                throw new Error("EVM not yet implemented");
            }

            setLpAmount("");
            setEstimatedOutA(undefined);
            setEstimatedOutB(undefined);
            setStatus("");
            alert(`Liquidity removed successfully! Transaction: ${txHash}`);
        } catch (err) {
            console.error("Remove liquidity error:", err);
            setStatus(
                (err instanceof Error ? err.message : String(err)).slice(
                    0,
                    120,
                ),
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="card-glow rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        Remove Liquidity
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Withdraw your liquidity and collect fees
                    </p>
                </div>
                <div className="text-sm font-medium text-slate-500">
                    {chainType === "solana" ? "Solana" : "Ethereum"}
                </div>
            </div>

            <div className="space-y-4">
                <div className="group">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            LP Token Amount
                        </span>
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Balance: <span className="font-mono text-slate-600">{fmt(userLpBalance)}</span>
                        </span>
                    </div>
                    <div className="relative group/input">
                        <Input
                            type="number"
                            placeholder="0.00"
                            value={lpAmount}
                            onChange={(e) => setLpAmount(e.target.value)}
                            className="font-mono text-xl h-16 pr-20 bg-slate-50 border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-teal/5 focus:border-teal/30 transition-all"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-purple-400" />
                            <span className="text-sm font-bold text-slate-700">LP</span>
                        </div>
                    </div>
                </div>

                {estimatedOutA !== undefined && estimatedOutB !== undefined && (
                    <div className="rounded-2xl bg-slate-50/80 p-4 space-y-2 text-xs border border-slate-100">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">
                                Token A Expected
                            </span>
                            <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-100 shadow-sm">
                                {fmt(estimatedOutA)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">
                                Token B Expected
                            </span>
                            <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-100 shadow-sm">
                                {fmt(estimatedOutB)}
                            </span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-slate-500 font-medium">
                                Slippage Tolerance
                            </span>
                            <span className="text-teal font-bold uppercase tracking-tight">
                                0.5%
                            </span>
                        </div>
                    </div>
                )}

                {status && (
                    <div className="rounded-xl bg-red-50 border border-red-100 p-3">
                        <p className="text-xs text-red-600 font-medium">
                            {status}
                        </p>
                    </div>
                )}

                {isConnected ? (
                    <Button
                        className={`w-full h-14 rounded-2xl text-base font-bold shadow-lg transition-all active:scale-[0.98] ${chainType === "solana" ? "bg-gradient-to-r from-teal to-teal-dark shadow-teal/20" : "bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-indigo-200"}`}
                        onClick={() => void handleRemoveLiquidity()}
                        disabled={
                            busy ||
                            parsedLpAmount === 0n ||
                            isUserLpBalanceLoading
                        }
                    >
                        {busy ? (
                            <div className="flex items-center gap-3">
                                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>{status}</span>
                            </div>
                        ) : (
                            "Remove Liquidity"
                        )}
                    </Button>
                ) : (
                    <div className="rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/30 p-4 text-center">
                        <p className="text-sm font-medium text-slate-400">
                            Connect your wallet to remove liquidity
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
