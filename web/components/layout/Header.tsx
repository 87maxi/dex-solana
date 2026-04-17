"use client";

import { useAgnosticWallet } from "@/providers/AgnosticWalletProvider";
import { WalletConnectModal } from "@/components/shared/WalletConnectModal";
import { Navigation } from "@/components/layout/Navigation";

export function Header(): React.ReactNode {
  const { address, isConnected, disconnect, isConnecting, chainType } =
    useAgnosticWallet();

  return (
    <>
      <Navigation />
      <div className="h-16" />
    </>
  );
}
