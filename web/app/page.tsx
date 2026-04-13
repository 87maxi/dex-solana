"use client";

import { Header } from "@/components/Header";
import { SwapCard } from "@/components/SwapCard";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white bg-grid noise-overlay">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Decentralized Exchange</h1>
            <p className="text-slate-500">
              Swap tokens, provide liquidity, and earn fees on a trustless AMM
            </p>
          </div>
          <SwapCard />
        </div>
      </main>
    </div>
  );
}
