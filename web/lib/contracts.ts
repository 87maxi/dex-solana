// Solana Configuration
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.mainnet-beta.solana.com";

export const DEX_PROGRAM_ID =
  process.env.NEXT_PUBLIC_DEX_PROGRAM_ID ??
  "5p8iy2yZWb4xjHj17AAoZwAFzFY4Zh4c2e3dV32uRRH3";

export const TOKEN_A_MINT = process.env.NEXT_PUBLIC_TOKEN_A_MINT;

export const TOKEN_B_MINT = process.env.NEXT_PUBLIC_TOKEN_B_MINT;
