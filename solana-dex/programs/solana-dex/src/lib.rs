use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self, TokenAccount, Token, Transfer, Mint},
};

// This should match exactly with the program ID in Anchor.toml
declare_id!("3eKDocDuxYA41DLFSKM3nKLjGhrfYpCRoUsCJmXSCVvy");

#[program]
pub mod solana_dex {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        token_a_amount: u64,
        token_b_amount: u64
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(!pool.is_initialized, ErrorCode::PoolAlreadyInitialized);
        pool.token_a_reserve = token_a_amount;
        pool.token_b_reserve = token_b_amount;
        pool.token_a_mint = ctx.accounts.token_a_mint.key();
        pool.token_b_mint = ctx.accounts.token_b_mint.key();
        pool.authority = ctx.accounts.authority.key();
        pool.is_initialized = true;

        Ok(())
    }

    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u64,
        minimum_amount_out: u64
    ) -> Result<u64> {
        // Calculate swap amount with 0.3% fee
        let amount_out = calculate_swap_amount(
            ctx.accounts.pool.token_a_reserve,
            ctx.accounts.pool.token_b_reserve,
            amount_in,
        )?;

        // Check minimum amount out
        require!(amount_out >= minimum_amount_out, ErrorCode::SlippageExceeded);

        // Transfer tokens from user to pool
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_in.to_account_info(),
            to: ctx.accounts.dex_token_in.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount_in)?;

        // Transfer tokens from pool to user
        let cpi_accounts = Transfer {
            from: ctx.accounts.dex_token_out.to_account_info(),
            to: ctx.accounts.user_token_out.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount_out)?;

        // Update reserves
        ctx.accounts.pool.token_a_reserve = ctx.accounts.pool.token_a_reserve.checked_add(amount_in).unwrap();
        ctx.accounts.pool.token_b_reserve = ctx.accounts.pool.token_b_reserve.checked_sub(amount_out).unwrap();

        Ok(amount_out)
    }

    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        token_a_amount: u64,
        token_b_amount: u64
    ) -> Result<()> {
        // Calculate LP tokens to mint
        let total_supply = ctx.accounts.lp_mint.supply;
        let lp_tokens_to_mint = if total_supply == 0 {
            token_a_amount
        } else {
            token_a_amount
                .checked_mul(total_supply)
                .unwrap()
                .checked_div(ctx.accounts.pool.token_a_reserve)
                .unwrap()
        };

        // Mint LP tokens to user
        let cpi_accounts = token::MintTo {
            mint: ctx.accounts.lp_mint.to_account_info(),
            to: ctx.accounts.user_lp_token.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, lp_tokens_to_mint)?;

        // Transfer tokens from user to pool
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_a.to_account_info(),
            to: ctx.accounts.dex_token_a.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, token_a_amount)?;

        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_b.to_account_info(),
            to: ctx.accounts.dex_token_b.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, token_b_amount)?;

        // Update reserves
        ctx.accounts.pool.token_a_reserve = ctx.accounts.pool.token_a_reserve.checked_add(token_a_amount).unwrap();
        ctx.accounts.pool.token_b_reserve = ctx.accounts.pool.token_b_reserve.checked_add(token_b_amount).unwrap();

        Ok(())
    }

    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        lp_amount: u64
    ) -> Result<()> {
        // Calculate amounts to return
        let token_a_amount = ctx.accounts.pool.token_a_reserve
            .checked_mul(lp_amount)
            .unwrap()
            .checked_div(ctx.accounts.lp_mint.supply)
            .unwrap();

        let token_b_amount = ctx.accounts.pool.token_b_reserve
            .checked_mul(lp_amount)
            .unwrap()
            .checked_div(ctx.accounts.lp_mint.supply)
            .unwrap();

        // Burn LP tokens from user
        let cpi_accounts = token::Burn {
            mint: ctx.accounts.lp_mint.to_account_info(),
            from: ctx.accounts.user_lp_token.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::burn(cpi_ctx, lp_amount)?;

        // Transfer tokens from pool to user
        let cpi_accounts = Transfer {
            from: ctx.accounts.dex_token_a.to_account_info(),
            to: ctx.accounts.user_token_a.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, token_a_amount)?;

        let cpi_accounts = Transfer {
            from: ctx.accounts.dex_token_b.to_account_info(),
            to: ctx.accounts.user_token_b.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, token_b_amount)?;

        // Update reserves
        ctx.accounts.pool.token_a_reserve = ctx.accounts.pool.token_a_reserve.checked_sub(token_a_amount).unwrap();
        ctx.accounts.pool.token_b_reserve = ctx.accounts.pool.token_b_reserve.checked_sub(token_b_amount).unwrap();

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8 + 8 + 32 + 32 + 32,
        seeds = [b"pool", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    pub token_a_mint: Account<'info, Mint>,
    pub token_b_mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(
        mut,
        seeds = [b"pool", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    pub token_a_mint: Account<'info, Mint>,
    pub token_b_mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_token_in: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_out: Account<'info, TokenAccount>,
    #[account(mut)]
    pub dex_token_in: Account<'info, TokenAccount>,
    #[account(mut)]
    pub dex_token_out: Account<'info, TokenAccount>,
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(
        mut,
        seeds = [b"pool", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    pub token_a_mint: Account<'info, Mint>,
    pub token_b_mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_token_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub dex_token_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub dex_token_b: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"lp", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub lp_mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_lp_token: Account<'info, TokenAccount>,
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(
        mut,
        seeds = [b"pool", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    pub token_a_mint: Account<'info, Mint>,
    pub token_b_mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_token_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub dex_token_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub dex_token_b: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"lp", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub lp_mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_lp_token: Account<'info, TokenAccount>,
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Pool {
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub token_a_reserve: u64,
    pub token_b_reserve: u64,
    pub authority: Pubkey,
    pub is_initialized: bool,
}

fn calculate_swap_amount(token_a_reserve: u64, token_b_reserve: u64, amount_in: u64) -> Result<u64> {
    // Constant product formula with 0.3% fee
    // x * y = k
    // After swap: (x + amount_in) * (y - amount_out) = k
    // amount_out = (amount_in * y) / (x + amount_in)

    // Apply 0.3% fee (0.3/1000)
    let fee_numerator = 3u64;
    let fee_denominator = 1000u64;

    let amount_in_with_fee = amount_in
        .checked_mul(fee_denominator - fee_numerator)
        .unwrap()
        .checked_div(fee_denominator)
        .unwrap();

    let numerator = amount_in_with_fee
        .checked_mul(token_b_reserve)
        .unwrap();
    let denominator = token_a_reserve
        .checked_add(amount_in_with_fee)
        .unwrap();

    Ok(numerator.checked_div(denominator).unwrap())
}

#[error_code]
pub enum ErrorCode {
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Invalid pool")]
    InvalidPool,
    #[msg("Pool already initialized")]
    PoolAlreadyInitialized,
}
