"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallet, fmt } from "@/lib/solana-wallet-context";

export function LiquidityCard(): React.ReactNode {
  const { isConnected, user, pool, doAddLiquidity, doRemoveLiquidity } =
    useWallet();

  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [lpAmount, setLpAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const parsedA = amountA ? BigInt(Math.round(parseFloat(amountA) * 1e6)) : 0n;
  const parsedB = amountB ? BigInt(Math.round(parseFloat(amountB) * 1e6)) : 0n;
  const parsedLP = lpAmount
    ? BigInt(Math.round(parseFloat(lpAmount) * 1e6))
    : 0n;

  const insufficientA = user && parsedA > 0n && user.balanceA < parsedA;
  const insufficientB = user && parsedB > 0n && user.balanceB < parsedB;

  const estimatedLP =
    pool && pool.totalSupply > 0n && parsedA > 0n
      ? (parsedA * pool.totalSupply) / pool.reserveA
      : parsedA > 0n && parsedB > 0n
        ? parsedA
        : 0n;

  const estimatedRemoveA =
    pool && pool.totalSupply > 0n && parsedLP > 0n
      ? (parsedLP * pool.reserveA) / pool.totalSupply
      : 0n;
  const estimatedRemoveB =
    pool && pool.totalSupply > 0n && parsedLP > 0n
      ? (parsedLP * pool.reserveB) / pool.totalSupply
      : 0n;

  async function handleAddLiquidity(): Promise<void> {
    try {
      setBusy(true);
      setStatus("Adding liquidity...");
      await doAddLiquidity(parsedA, parsedB);
      setAmountA("");
      setAmountB("");
      setStatus("");
    } catch (err) {
      console.error("Add liquidity error:", err);
      setStatus((err instanceof Error ? err.message : String(err)).slice(0, 120));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveLiquidity(): Promise<void> {
    try {
      setBusy(true);
      setStatus("Removing liquidity...");
      await doRemoveLiquidity(parsedLP);
      setLpAmount("");
      setStatus("");
    } catch (err) {
      console.error("Remove liquidity error:", err);
      setStatus((err instanceof Error ? err.message : String(err)).slice(0, 120));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-glow rounded-2xl border border-slate-200/80 bg-white p-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Liquidity</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Provide liquidity and earn 0.2% on every swap
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Add Liquidity</h3>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Token A
            </span>
            {user && (
              <span className="text-xs text-slate-400">
                Balance: <span className="font-mono">{fmt(user.balanceA)}</span>
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.00"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              className="font-mono text-base h-12 pr-14 bg-slate-50/80 border-slate-200 rounded-xl"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              TA
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Token B
            </span>
            {user && (
              <span className="text-xs text-slate-400">
                Balance: <span className="font-mono">{fmt(user.balanceB)}</span>
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.00"
              value={amountB}
              onChange={(e) => setAmountB(e.target.value)}
              className="font-mono text-base h-12 pr-14 bg-slate-50/80 border-slate-200 rounded-xl"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              TB
            </span>
          </div>
        </div>

        {parsedA > 0n && parsedB > 0n && (
          <div className="rounded-xl bg-teal-50/50 border border-teal-100 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-teal-dark/70">Estimated LP tokens</span>
              <span className="font-mono font-semibold text-teal-dark">
                {fmt(estimatedLP)}
              </span>
            </div>
          </div>
        )}

        {status && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-3">
            <p className="text-xs text-red-600">{status}</p>
          </div>
        )}

        {(insufficientA || insufficientB) && !status && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
            <p className="text-xs text-amber-700">
              {insufficientA &&
                `Insufficient TA (have ${fmt(user?.balanceA ?? 0n)})`}
              {insufficientA && insufficientB && " / "}
              {insufficientB &&
                `Insufficient TB (have ${fmt(user?.balanceB ?? 0n)})`}
            </p>
          </div>
        )}

        {isConnected ? (
          <Button
            className="w-full h-11 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal to-teal-dark hover:from-teal-dark hover:to-teal text-white shadow-md shadow-teal/15"
            disabled={busy || parsedA === 0n || parsedB === 0n || !!insufficientA || !!insufficientB}
            onClick={() => void handleAddLiquidity()}
          >
            {busy ? <span className="status-pulse">{status}</span> : "Add Liquidity"}
          </Button>
        ) : (
          <div className="text-center py-3 text-sm text-slate-400">
            Connect wallet to add liquidity
          </div>
        )}
      </div>

      <hr className="my-6 border-slate-200" />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Remove Liquidity</h3>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              LP Tokens
            </span>
            {user && (
              <button
                type="button"
                className="text-xs text-teal hover:text-teal-dark font-medium transition-colors"
                onClick={() =>
                  setLpAmount(
                    (Number(user.balanceLP) / 1e18)
                      .toFixed(6)
                      .replace(/\.?0+$/, ""),
                  )
                }
              >
                Max: <span className="font-mono">{fmt(user.balanceLP)}</span>
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.00"
              value={lpAmount}
              onChange={(e) => setLpAmount(e.target.value)}
              className="font-mono text-base h-12 pr-14 bg-slate-50/80 border-slate-200 rounded-xl"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              LP
            </span>
          </div>
        </div>

        {parsedLP > 0n && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Receive TA</span>
              <span className="font-mono font-medium text-slate-700">
                {fmt(estimatedRemoveA)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Receive TB</span>
              <span className="font-mono font-medium text-slate-700">
                {fmt(estimatedRemoveB)}
              </span>
            </div>
          </div>
        )}

        {isConnected ? (
          <Button
            className="w-full h-11 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-600 text-white"
            disabled={busy || parsedLP === 0n}
            onClick={() => void handleRemoveLiquidity()}
          >
            {busy ? <span className="status-pulse">{status}</span> : "Remove Liquidity"}
          </Button>
        ) : (
          <div className="text-center py-3 text-sm text-slate-400">
            Connect wallet to remove liquidity
          </div>
        )}
      </div>
    </div>
  );
}
