"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAgnosticWallet } from "@/lib/agnostic-wallet-context";
import { fmt } from "@/lib/utils";
import { DEXService } from "@/lib/dex-service";
import { EVM_TOKEN_A_ADDRESS, EVM_TOKEN_B_ADDRESS } from "@/lib/contracts";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

export function SwapCard(): React.ReactNode {
  const { isConnected, disconnect, isConnecting, address, chainType } = useAgnosticWallet();
  const { wallet } = useWallet();
  const { connection } = useConnection();
  const [tokenIn, setTokenIn] = useState(0); // 0 = Token A, 1 = Token B
  const [amount, setAmount] = useState("");
  const [estimatedOut, setEstimatedOut] = useState<bigint | undefined>();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const parsedAmount = amount ? BigInt(Math.round(parseFloat(amount) * 1e6)) : 0n; // Convert to u64/u256 (6 decimals)

  // Placeholder balance check
  const insufficientBalance = false;

  useEffect(() => {
    if (parsedAmount > 0n) {
      // Mock estimation - in a real implementation this would call the contract/program
      setEstimatedOut(parsedAmount * 2n);
    } else {
      setEstimatedOut(undefined);
    }
  }, [tokenIn, parsedAmount]);

  async function handleSwap(): Promise<void> {
    try {
      setBusy(true);
      setStatus("Swapping...");

      let txHash = "";

      if (chainType === 'solana') {
        if (!wallet || !connection) throw new Error("Solana wallet or connection not ready");
        txHash = await DEXService.solanaSwap(wallet.adapter, connection, parsedAmount, tokenIn === 0);
      } else if (chainType === 'evm') {
        if (!address) throw new Error("EVM address not found");
        const tokenAddress = tokenIn === 0 ? EVM_TOKEN_A_ADDRESS : EVM_TOKEN_B_ADDRESS;
        if (!tokenAddress) throw new Error("EVM Token address not configured");
        txHash = await DEXService.evmSwap(address, tokenAddress, parsedAmount);
      }

      setAmount("");
      setEstimatedOut(undefined);
      setStatus("");
      alert(`Swap successful! Transaction: ${txHash}`);
    } catch (err) {
      console.error("Swap error:", err);
      setStatus((err instanceof Error ? err.message : String(err)).slice(0, 120));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-glow rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Swap</h2>
          <p className="text-sm text-slate-500 mt-0.5">Trade tokens on {chainType === 'evm' ? 'Ethereum' : 'Solana'}</p>
        </div>
        <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50/50">
          <button
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${tokenIn === 0 ? "bg-white text-teal shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"}`}
            onClick={() => { setTokenIn(0); setAmount(""); setEstimatedOut(undefined); }}
          >
            TA &rarr; TB
          </button>
          <button
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${tokenIn === 1 ? "bg-white text-teal shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"}`}
            onClick={() => { setTokenIn(1); setAmount(""); setEstimatedOut(undefined); }}
          >
            TB &rarr; TA
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="group">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">You pay</span>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              Balance: <span className="font-mono text-slate-600">0.00</span>
            </span>
          </div>
          <div className="relative group/input">
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono text-xl h-16 pr-20 bg-slate-50 border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-teal/5 focus:border-teal/30 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
              <div className={`w-2 h-2 rounded-full ${tokenIn === 0 ? 'bg-teal' : 'bg-indigo-400'}`} />
              <span className="text-sm font-bold text-slate-700">
                {tokenIn === 0 ? "TA" : "TB"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-center -my-2 relative z-10">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-2xl border-4 border-white bg-teal text-white shadow-lg shadow-teal/20 hover:scale-110 transition-transform active:scale-95"
            onClick={() => setTokenIn(tokenIn === 0 ? 1 : 0)}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">You receive</span>
          </div>
          <div className="relative">
            <div className="font-mono text-xl h-16 flex items-center px-4 bg-teal-50/40 border border-teal-100/50 rounded-2xl text-slate-700">
              {parsedAmount > 0n && estimatedOut !== undefined ? fmt(estimatedOut) : "0.00"}
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm text-teal">
              <div className={`w-2 h-2 rounded-full ${tokenIn === 1 ? 'bg-teal' : 'bg-indigo-400'}`} />
              <span className="text-sm font-bold">
                {tokenIn === 0 ? "TB" : "TA"}
              </span>
            </div>
          </div>
        </div>

        {parsedAmount > 0n && estimatedOut !== undefined && (
          <div className="rounded-2xl bg-slate-50/80 p-4 space-y-2 text-xs border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Network Fee</span>
              <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-100 shadow-sm">
                ~0.001 {chainType === 'solana' ? 'SOL' : 'ETH'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Exchange Rate</span>
              <span className="font-mono text-slate-600">
                1 {tokenIn === 0 ? "TA" : "TB"} = 2.0000 {tokenIn === 0 ? "TB" : "TA"}
              </span>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Slippage Tolerance</span>
              <span className="text-teal font-bold uppercase tracking-tight">0.5%</span>
            </div>
          </div>
        )}

        {status && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-3">
            <p className="text-xs text-red-600 font-medium">{status}</p>
          </div>
        )}

        {isConnected ? (
          <Button
            className={`w-full h-14 rounded-2xl text-base font-bold shadow-lg transition-all active:scale-[0.98] ${chainType === 'solana' ? 'bg-gradient-to-r from-teal to-teal-dark shadow-teal/20' : 'bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-indigo-200'}`}
            onClick={() => void handleSwap()}
            disabled={busy || parsedAmount === 0n || !!insufficientBalance || isConnecting}
          >
            {busy ? (
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{status}</span>
              </div>
            ) : "Swap"}
          </Button>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/30 p-4 text-center">
            <p className="text-sm font-medium text-slate-400">Connect your wallet to start trading</p>
          </div>
        )}
      </div>
    </div>
  );
}
