"use client";

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SolanaWalletProvider } from "@/lib/solana-wallet-context";

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <SolanaWalletProvider>{children}</SolanaWalletProvider>
    </QueryClientProvider>
  );
}
