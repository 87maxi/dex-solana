// Configuración de direcciones de contrato
export const EVM_TOKEN_A_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_A_ADDRESS || "";
export const EVM_TOKEN_B_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_B_ADDRESS || "";
export const EVM_DEX_ADDRESS = process.env.NEXT_PUBLIC_DEX_ADDRESS || "";

// Para Solana, usaremos las variables de entorno
export const SOLANA_DEX_PROGRAM_ID = process.env.NEXT_PUBLIC_DEX_PROGRAM_ID || "";
export const SOLANA_TOKEN_A_MINT = process.env.NEXT_PUBLIC_TOKEN_A_MINT || "";
export const SOLANA_TOKEN_B_MINT = process.env.NEXT_PUBLIC_TOKEN_B_MINT || "";
