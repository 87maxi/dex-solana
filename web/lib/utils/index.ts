import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format bigint numbers for display (converts from 1e6 units to decimal string)
 */
export function fmt(amount: bigint): string {
  if (!amount) return "0.00";
  return (Number(amount) / 1000000).toFixed(2);
}

/**
 * Format bigint numbers with decimals (for Solana tokens)
 */
export function fmtWithDecimals(amount: bigint, decimals: number = 6): string {
  if (!amount) return "0.00";
  const divisor = 10 ** decimals;
  return (Number(amount) / divisor).toFixed(2);
}
