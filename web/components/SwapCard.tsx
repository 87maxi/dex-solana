
"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallet, fmt } from "@/lib/solana-wallet-context";

export function SwapCard(): React.ReactNode {
  const { isConnected, user, doSwap, getAmountOut } = useWallet();
  const [tokenIn, setTokenIn] = useState(0); // 0 = Token A, 1 = Token B
  const [amount, setAmount] = useState("");
  const [estimatedOut, setEstimatedOut] = useState<bigint | undefined>();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const parsedAmount = amount ? BigInt(Math.round(parseFloat(amount) * 1e6)) : 0n; // Convert to u64 (6 decimals)
  const insufficientBalance =
    user && parsedAmount > 0n &&
    ((tokenIn === 0 && user.balanceA < parsedAmount) ||
     (tokenIn === 1 && user.balanceB < parsedAmount));

  useEffect(() => {
    if (parsedAmount > 0n) {
      getAmountOut(tokenIn, parsedAmount).then(setEstimatedOut).catch(() => setEstimatedOut(undefined));
    } else {
      setEstimatedOut(undefined);
    }
  }, [tokenIn, parsedAmount, getAmountOut]);

  async function handleSwap(): Promise<void> {
    try {
      setBusy(true); setStatus("Swapping...");
      await doSwap(tokenIn, parsedAmount);
      setAmount(""); setEstimatedOut(undefined); setStatus("");
    } catch (err) {
      console.error("Swap error:", err);
      setStatus((err instanceof Error ? err.message : String(err)).slice(0, 120));
    } finally { setBusy(false); }
  }

  return (
    <div className="card-glow rounded-2xl border border-slate-200/80 bg-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Swap</h2>
          <p className="text-xs text-slate-400 mt-0.5">Trade tokens instantly</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 p-0.5">
          <button
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${tokenIn === 0 ? "bg-teal text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            onClick={() => { setTokenIn(0); setAmount(""); setEstimatedOut(undefined); }}
          >
            TA &rarr; TB
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${tokenIn === 1 ? "bg-teal text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            onClick={() => { setTokenIn(1); setAmount(""); setEstimatedOut(undefined); }}
          >
            TB &rarr; TA
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">You pay</span>
            {user && (
              <span className="text-xs text-slate-400">
                Balance: <span className="font-mono">{fmt(tokenIn === 0 ? user.balanceA : user.balanceB)}</span>
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono text-lg h-14 pr-16 bg-slate-50/80 border-slate-200 rounded-xl focus:bg-white"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              {tokenIn === 0 ? "TA" : "TB"}
            </span>
          </div>
        </div>

        <div className="flex justify-center -my-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
            <svg className="h-4 w-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">You receive</span>
          </div>
          <div className="relative">
            <div className="font-mono text-lg h-14 flex items-center px-4 bg-teal-50/50 border border-teal-100 rounded-xl text-slate-700">
              {parsedAmount > 0n && estimatedOut !== undefined ? fmt(estimatedOut) : "0.00"}
            </div>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-teal">
              {tokenIn === 0 ? "TB" : "TA"}
            </span>
          </div>
        </div>

        {parsedAmount > 0n && estimatedOut !== undefined && (
          <div className="rounded-xl bg-slate-50 p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Fee (0.3%)</span>
              <span className="font-mono text-slate-500">{fmt((parsedAmount * 30n) / 10000n)} {tokenIn === 0 ? "TA" : "TB"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Rate</span>
              <span className="font-mono text-slate-500">
                1 {tokenIn === 0 ? "TA" : "TB"} = {(Number(estimatedOut) / Number(parsedAmount)).toFixed(4)} {tokenIn === 0 ? "TB" : "TA"}
              </span>
            </div>
          </div>
        )}

        {status && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-3">
            <p className="text-xs text-red-600">{status}</p>
          </div>
        )}

        {insufficientBalance && !status && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
            <p className="text-xs text-amber-700">
              Insufficient {tokenIn === 0 ? "TA" : "TB"} balance
              (have {fmt(tokenIn === 0 ? user!.balanceA : user!.balanceB)})
            </p>
          </div>
        )}

        {isConnected ? (
          <Button
            className="w-full h-12 rounded-xl text-sm font-semibold bg-gradient-to-r from-teal to-teal-dark hover:from-teal-dark hover:to-teal text-white shadow-md shadow-teal/15 transition-all"
            onClick={() => void handleSwap()}
            disabled={busy || parsedAmount === 0n || !!insufficientBalance}
          >
            {busy ? <span className="status-pulse">{status}</span> : "Swap"}
          </Button>
        ) : (
          <div className="text-center py-3 text-sm text-slate-400">
            Connect wallet to swap
          </div>
        )}
      </div>
    </div>
  );
}
