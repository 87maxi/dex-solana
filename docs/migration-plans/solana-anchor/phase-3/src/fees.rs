// SPDX-License-Identifier: MIT

use anchor_lang::prelude::*;

use crate::state::Dex;

/// Constants for fee calculation
pub const TOTAL_FEE: u64 = 30;      // 0.3% in 10000
pub const PROTOCOL_FEE: u64 = 10;   // 0.1% in 10000
pub const LP_FEE: u64 = 20;         // 0.2% in 10000
pub const FEE_DENOMINATOR: u64 = 10000;

/// Structure to hold fee calculations
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct FeeBreakdown {
    pub total_fee: u64,
    pub protocol_fee: u64,
    pub pool_fee: u64,
}

impl FeeBreakdown {
    /// Calculate fees from output amount
    pub fn calculate_from_output(amount_out: u64) -> FeeBreakdown {
        let total_fee = (amount_out * TOTAL_FEE) / FEE_DENOMINATOR;

        let protocol_fee = (total_fee * PROTOCOL_FEE) / TOTAL_FEE;
        let pool_fee = total_fee - protocol_fee;

        FeeBreakdown {
            total_fee,
            protocol_fee,
            pool_fee,
        }
    }

    /// Calculate fees from input amount
    pub fn calculate_from_input(amount_in: u64) -> FeeBreakdown {
        let total_fee = (amount_in * TOTAL_FEE) / FEE_DENOMINATOR;

        let protocol_fee = (total_fee * PROTOCOL_FEE) / TOTAL_FEE;
        let pool_fee = total_fee - protocol_fee;

        FeeBreakdown {
            total_fee,
            protocol_fee,
            pool_fee,
        }
    }

    /// Calculate input amount needed to get a specific output amount
    pub fn calculate_input_needed(amount_out: u64, reserve_in: u64, reserve_out: u64) -> Result<u64, Error> {
        if amount_out == 0 {
            return Err(DexError::InvalidAmount.into());
        }

        let amount_in_with_fee = amount_out * FEE_DENOMINATOR;
        let amount_out_with_fee = reserve_out * FEE_DENOMINATOR;

        // Use fixed-point arithmetic to avoid rounding errors
        let input_with_fee = (amount_in_with_fee * reserve_in) / amount_out_with_fee;

        // Subtract the protocol fee from the input
        let input_with_protocol_fee = input_with_fee * (FEE_DENOMINATOR + PROTOCOL_FEE) / FEE_DENOMINATOR;

        // Calculate the actual input needed before fees
        let amount_in = (input_with_protocol_fee * FEE_DENOMINATOR) / (FEE_DENOMINATOR - PROTOCOL_FEE);

        if amount_in == 0 {
            return Err(DexError::InsufficientOutput.into());
        }

        Ok(amount_in)
    }

    /// Calculate output amount from input amount
    pub fn calculate_output_amount(amount_in: u64, reserve_in: u64, reserve_out: u64) -> Result<u64, Error> {
        if amount_in == 0 {
            return Err(DexError::InvalidAmount.into());
        }

        // Calculate output using fixed-point arithmetic
        let input_with_fee = amount_in * FEE_DENOMINATOR;
        let output_with_fee = (input_with_fee * reserve_out) / (reserve_in * FEE_DENOMINATOR + input_with_fee);

        let output_amount = output_with_fee / FEE_DENOMINATOR;

        if output_amount == 0 {
            return Err(DexError::InsufficientOutput.into());
        }

        Ok(output_amount)
    }
}

#[error_code]
pub enum DexError {
    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Insufficient output amount")]
    InsufficientOutput,

    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,

    #[msg("Invalid fee breakdown")]
    InvalidFeeBreakdown,

    #[msg("No fees to withdraw")]
    NoFeesToWithdraw,

    #[msg("Only owner can withdraw fees")]
    OnlyOwnerCanWithdraw,
}
