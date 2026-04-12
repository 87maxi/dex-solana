"use client";

import { useWallet, fmt } from "@/lib/solana-wallet-context";

function StatRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }): React.ReactNode {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-xs font-medium text-slate-700 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function StatSection({ title, tag, children }: { title: string; tag?: string; children: React.ReactNode }): React.ReactNode {
  return (
    <div className="card-glow rounded-2xl border border-slate-200/80 bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">{title}</h3>
        {tag && (
          <span className="rounded-full bg-teal-50 border border-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal">
            {tag}
          </span>
        )}
      </div>
      <div className="divide-y divide-slate-100">
        {children}
      </div>
    </div>
  );
}

export function PoolStats(): React.ReactNode {
  const { isConnected, pool, user } = useWallet();

  const poolShare =
    pool && user && pool.totalSupply > 0n
      ? Number((user.balanceLP * 10000n) / pool.totalSupply) / 100
      : 0;

  return (
    <div className="space-y-4">
      <StatSection title="Pool Reserves">
        <StatRow label="Token A (TA)" value={fmt(pool?.reserveA)} />
        <StatRow label="Token B (TB)" value={fmt(pool?.reserveB)} />
        <StatRow label="Total LP Supply" value={fmt(pool?.totalSupply)} />
        <StatRow
          label="Price TA/TB"
          value={pool && pool.reserveA > 0n ? (Number(pool.reserveB) / Number(pool.reserveA)).toFixed(4) : "N/A"}
        />
      </StatSection>

      <StatSection title="Protocol Fees" tag="0.1%">
        <StatRow label="Accrued TA" value={fmt(pool?.protocolFeeA)} />
        <StatRow label="Accrued TB" value={fmt(pool?.protocolFeeB)} />
      </StatSection>

      <StatSection title="LP Fees" tag="0.2%">
        <div className="py-2">
          <p className="text-xs text-slate-400 leading-relaxed">
            LP fees compound in reserves automatically, increasing LP token value over time.
          </p>
        </div>
      </StatSection>

      {isConnected && (
        <div className="gradient-border rounded-2xl">
          <div className="rounded-2xl bg-white p-5">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Your Position</h3>
              {poolShare > 0 && (
                <span className="rounded-full bg-teal-50 border border-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal">
                  {poolShare.toFixed(2)}% share
                </span>
              )}
            </div>
            <div className="divide-y divide-slate-100">
              <StatRow label="Token A" value={fmt(user?.balanceA)} />
              <StatRow label="Token B" value={fmt(user?.balanceB)} />
              <StatRow label="LP Tokens" value={fmt(user?.balanceLP)} />
              <StatRow label="Pool Share" value={`${poolShare.toFixed(2)}%`} mono={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
