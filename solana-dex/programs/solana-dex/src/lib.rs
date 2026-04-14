use anchor_lang::prelude::*;

declare_id!("5p8iy2yZWb4xjHj17AAoZwAFzFY4Zh4c2e3dV32uRRH3");

#[program]
pub mod solana_dex {
    use super::*;

    pub fn swap(
        _ctx: Context<Swap>,
        _token_in: u8,
        _amount_in: u64,
    ) -> Result<u64> {
        msg!("Swap function called successfully");
        Ok(_amount_in)
    }
}
