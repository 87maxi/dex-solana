"use client";

import { Header } from "@/components/Header";
import { SwapCard } from "@/components/SwapCard";
import { LiquidityCard } from "@/components/LiquidityCard";
import { PoolStats } from "@/components/PoolStats";
import { useWallet, fmt } from "@/lib/solana-wallet-context";

function HeroBanner(): React.ReactNode {
  const { isConnected } = useWallet();
  if (isConnected) return null;

  return (
    <section className="relative overflow-hidden border-b border-teal-100/40">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50/80 via-white to-teal-50/30" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal/3 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

      <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="max-w-2xl">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3 py-1 text-xs font-medium text-teal mb-6 animate-fade-up"
            style={{ animationDelay: "0ms" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" />
            AMM Protocol - 0.3% Swap Fee
          </div>

          <h1
            className="text-4xl md:text-5xl font-bold tracking-tight text-slate-950 leading-[1.1] animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            Trade tokens with
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-dark via-teal to-teal-light">
              zero intermediaries
            </span>
          </h1>

          <p
            className="mt-5 text-lg text-slate-500 leading-relaxed max-w-lg animate-fade-up"
            style={{ animationDelay: "160ms" }}
          >
            Swap, provide liquidity, and earn fees. Powered by constant product
            AMM with transparent on-chain execution.
          </p>

          <div
            className="mt-8 flex flex-wrap gap-6 text-sm animate-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 border border-teal-100">
                <svg
                  className="h-4 w-4 text-teal"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-slate-800">
                  Instant Swaps
                </div>
                <div className="text-xs text-slate-400">TA / TB pair</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 border border-teal-100">
                <svg
                  className="h-4 w-4 text-teal"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-slate-800">Earn Fees</div>
                <div className="text-xs text-slate-400">0.2% to LPs</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 border border-teal-100">
                <svg
                  className="h-4 w-4 text-teal"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-slate-800">Trustless</div>
                <div className="text-xs text-slate-400">Fully on-chain</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatBar(): React.ReactNode {
  const { user, pool } = useWallet();

  return (
    <div className="border-b border-slate-100 bg-white/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-8 overflow-x-auto text-xs">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-slate-400 uppercase tracking-wider font-medium">
            Reserve A
          </span>
          <span className="font-mono font-medium text-slate-700">
            {fmt(pool?.reserveA)}
          </span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-slate-400 uppercase tracking-wider font-medium">
            Reserve B
          </span>
          <span className="font-mono font-medium text-slate-700">
            {fmt(pool?.reserveB)}
          </span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-slate-400 uppercase tracking-wider font-medium">
            Price
          </span>
          <span className="font-mono font-medium text-slate-700">
            {pool && pool.reserveA > 0n
              ? (Number(pool.reserveB) / Number(pool.reserveA)).toFixed(4)
              : "---"}
          </span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-slate-400 uppercase tracking-wider font-medium">
            Fee
          </span>
          <span className="font-mono font-medium text-teal">0.30%</span>
        </div>
      </div>
    </div>
  );
}

export default function Home(): React.ReactNode {
  return (
    <>
      <Header />
      <HeroBanner />
      <StatBar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            <div
              className="animate-fade-up"
              style={{ animationDelay: "100ms" }}
            >
              <SwapCard />
            </div>
            <div
              className="animate-fade-up"
              style={{ animationDelay: "200ms" }}
            >
              <LiquidityCard />
            </div>
          </div>
          <aside
            className="animate-fade-up"
            style={{ animationDelay: "300ms" }}
          >
            <PoolStats />
          </aside>
        </div>
      </main>
      <footer className="border-t border-slate-100 bg-white/60 backdrop-blur-sm py-6">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center">
              <span className="text-[8px] font-bold text-white font-mono">
                DX
              </span>
            </div>
            <span className="text-xs text-slate-400">DEX Protocol</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Fee: 0.3%</span>
            <span className="h-3 w-px bg-slate-200" />
            <span>0.1% protocol</span>
            <span className="h-3 w-px bg-slate-200" />
            <span>0.2% LPs</span>
          </div>
        </div>
      </footer>
    </>
  );
}
