"use client";

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgnosticWalletProvider } from "@/providers/AgnosticWalletProvider";

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <AgnosticWalletProvider>{children}</AgnosticWalletProvider>
    </QueryClientProvider>
  );
}
