"use client";

import type { Program } from "@coral-xyz/anchor";
import idl from "./solana-dex-idl.json";

// Simplified IDL type - compatible with Anchor's Program type
export interface SolanaDexIDL {
  address: string;
  metadata: {
    name: string;
    version: string;
    spec: string;
    description: string;
  };
  instructions: Array<any>;
  accounts?: Array<any>;
  types?: Array<any>;
  events?: Array<any>;
  errors?: Array<any>;
}

// Export the IDL
export const IDL: SolanaDexIDL = idl as SolanaDexIDL;

// Type for the Anchor program - using any to avoid strict type checking
export type SolanaDex = any;

// Program ID constant
export const PROGRAM_ID = idl.address as string;

// Define the interface types that match the on-chain structs
export interface Config {
  owner: string;
  totalLpSupply: bigint;
  totalFee: bigint;
  protocolFee: bigint;
  lpFee: bigint;
  feeDenominator: bigint;
}

export interface Pool {
  programId: string;
  tokenAMint: string;
  tokenBMint: string;
  tokenAReserve: bigint;
  tokenBReserve: bigint;
  protocolFeeA: bigint;
  protocolFeeB: bigint;
}

export interface LpMint {
  programId: string;
  tokenAMint: string;
  tokenBMint: string;
  totalSupply: bigint;
  decimals: number;
}

export interface UserLpToken {
  owner: string;
  mint: string;
  balance: bigint;
}
