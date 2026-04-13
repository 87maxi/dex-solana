// Solana Configuration
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export const DEX_PROGRAM_ID =
  process.env.NEXT_PUBLIC_DEX_PROGRAM_ID ?? "5p8iy2yZWb4xjHj17AAoZwAFzFY4Zh4c2e3dV32uRRH3";

export const SOLANA_TOKEN_A_MINT = process.env.NEXT_PUBLIC_SOLANA_TOKEN_A_MINT;
export const SOLANA_TOKEN_B_MINT = process.env.NEXT_PUBLIC_SOLANA_TOKEN_B_MINT;

// EVM Configuration
export const EVM_RPC_URL =
  process.env.NEXT_PUBLIC_EVM_RPC_URL ?? "http://127.0.0.1:8545";

export const EVM_DEX_ADDRESS =
  process.env.NEXT_PUBLIC_EVM_DEX_ADDRESS ?? "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Default Anvil address for first contract

export const EVM_TOKEN_A_ADDRESS = process.env.NEXT_PUBLIC_EVM_TOKEN_A_ADDRESS;
export const EVM_TOKEN_B_ADDRESS = process.env.NEXT_PUBLIC_EVM_TOKEN_B_ADDRESS;

// Chain-specific configurations
export const DEFAULT_CHAIN_TYPE =
  process.env.NEXT_PUBLIC_DEFAULT_CHAIN_TYPE ?? "solana";
