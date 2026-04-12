use anchor_lang::prelude::*;

declare_id!("5p8iy2yZWb4xjHj17AAoZwAFzFY4Zh4c2e3dV32uRRH3");

mod state;
mod instructions;

pub use state::*;
pub use instructions::*;

#[program]
pub mod solana_dex {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize_dex(ctx)
    }

    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        amount_a: u64,
        amount_b: u64,
    ) -> Result<u64> {
        instructions::add_liquidity_dex(ctx, amount_a, amount_b)
    }

    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        lp_amount: u64,
    ) -> Result<(u64, u64)> {
        instructions::remove_liquidity_dex(ctx, lp_amount)
    }

    pub fn swap(
        ctx: Context<Swap>,
        token_in: u8,
        amount_in: u64,
    ) -> Result<u64> {
        instructions::swap_dex(ctx, token_in, amount_in)
    }

    pub fn withdraw_protocol_fees(ctx: Context<WithdrawProtocolFees>) -> Result<()> {
        instructions::withdraw_protocol_fees_dex(ctx)
    }
}
