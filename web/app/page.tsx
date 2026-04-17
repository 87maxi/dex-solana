"use client";

import { Header } from "@/components/layout/Header";
import { SwapCard } from "@/components/features/swap/SwapCard";
import { Dashboard } from "@/components/features/dashboard/Dashboard";
import { AddLiquidityCard } from "@/components/features/liquidity/AddLiquidityCard";
import { RemoveLiquidityCard } from "@/components/features/liquidity/RemoveLiquidityCard";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white bg-grid noise-overlay">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Decentralized Exchange
            </h1>
            <p className="text-slate-500">
              Swap tokens, provide liquidity, and earn fees on a trustless AMM
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SwapCard />
            <Dashboard />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AddLiquidityCard />
            <RemoveLiquidityCard />
          </div>
        </div>
      </main>
    </div>
  );
}
