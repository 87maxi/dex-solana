use anchor_lang::prelude::*;
use anchor_spl::{
    token::{
        self, Token, TokenAccount, Mint, Transfer, TransferChecked,
    },
    token_interface::{BurnChecked, burn_checked},
};

use crate::state::*;
use crate::state::ErrorCode;

// ==================== Instructions ====================

/// Initialize the DEX program
/// Sets up the config and pool accounts
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = owner,
        space = Config::INIT_SPACE
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = owner,
        space = Pool::INIT_SPACE,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        init,
        payer = owner,
        space = LpMint::INIT_SPACE,
        seeds = [b"lp_mint"],
        bump
    )]
    pub lp_mint: Account<'info, LpMint>,

    #[account(
        init,
        payer = owner,
        space = UserLpToken::INIT_SPACE,
        seeds = [b"user_lp", owner.key().as_ref(), lp_mint.key().as_ref()],
        bump
    )]
    pub user_lp: Account<'info, UserLpToken>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

pub fn initialize_dex(ctx: Context<Initialize>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let pool = &mut ctx.accounts.pool;
    let lp_mint = &mut ctx.accounts.lp_mint;

    // Initialize config
    config.owner = ctx.accounts.user_lp.key();
    config.total_lp_supply = 0;
    config.total_fee = 30;    // 0.3%
    config.protocol_fee = 10; // 0.1%
    config.lp_fee = 20;       // 0.2%
    config.fee_denominator = 10000;

    // Initialize pool
    pool.program_id = *ctx.program_id;
    pool.token_a_mint = Pubkey::default();
    pool.token_b_mint = Pubkey::default();
    pool.token_a_reserve = 0;
    pool.token_b_reserve = 0;
    pool.protocol_fee_a = 0;
    pool.protocol_fee_b = 0;

    // Initialize LP mint
    lp_mint.program_id = *ctx.program_id;
    lp_mint.token_a_mint = Pubkey::default();
    lp_mint.token_b_mint = Pubkey::default();
    lp_mint.total_supply = 0;
    lp_mint.decimals = 8;

    msg!("DEX initialized successfully");
    Ok(())
}

/// Add liquidity instruction
/// Users add both token A and token B to receive LP tokens
#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        init_if_needed,
        payer = user,
        space = UserLpToken::INIT_SPACE,
        seeds = [b"user_lp", user.key().as_ref(), config.key().as_ref()],
        bump
    )]
    pub user_lp: Account<'info, UserLpToken>,

    /// Token A mint account
    #[account(mut)]
    pub token_a_mint: Account<'info, Mint>,

    /// Token B mint account
    #[account(mut)]
    pub token_b_mint: Account<'info, Mint>,

    /// User's Token A account
    #[account(mut)]
    pub user_token_a: Box<Account<'info, TokenAccount>>,

    /// User's Token B account
    #[account(mut)]
    pub user_token_b: Box<Account<'info, TokenAccount>>,

    /// DEX's Token A vault
    #[account(mut)]
    pub dex_token_a: Box<Account<'info, TokenAccount>>,

    /// DEX's Token B vault
    #[account(mut)]
    pub dex_token_b: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn add_liquidity_dex(
    ctx: Context<AddLiquidity>,
    amount_a: u64,
    amount_b: u64,
) -> Result<u64> {
    let config = &mut ctx.accounts.config;
    let pool = &mut ctx.accounts.pool;
    let user_lp = &mut ctx.accounts.user_lp;
    let token_a_mint = &ctx.accounts.token_a_mint;
    let token_b_mint = &ctx.accounts.token_b_mint;

    // Validate amounts
    require!(amount_a > 0 && amount_b > 0, ErrorCode::InvalidAmounts);

    // Initialize user LP account if needed
    if user_lp.balance == 0 {
        user_lp.owner = ctx.accounts.user.key();
        user_lp.mint = config.key();
        user_lp.balance = 0;
    }

    // Calculate LP tokens to mint
    let lp_minted = if pool.token_a_reserve == 0 && pool.token_b_reserve == 0 {
        // First liquidity: equal amounts required
        require!(amount_a == amount_b, ErrorCode::InvalidAmounts);
        amount_a
    } else {
        // Subsequent liquidity: proportional to existing reserves
        let liquidity_a = amount_a
            .checked_mul(config.total_lp_supply)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(pool.token_a_reserve)
            .ok_or(ErrorCode::InvalidAmounts)?;
        let liquidity_b = amount_b
            .checked_mul(config.total_lp_supply)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(pool.token_b_reserve)
            .ok_or(ErrorCode::InvalidAmounts)?;

        // Take the minimum to maintain balance
        liquidity_a.min(liquidity_b)
    };

    require!(lp_minted > 0, ErrorCode::InsufficientLiquidity);

    // Transfer tokens from user to DEX (Effects first - Checks-Effects-Interactions)
    let cpi_context_a = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.user_token_a.to_account_info(),
            mint: token_a_mint.to_account_info(),
            to: ctx.accounts.dex_token_a.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );

    let cpi_context_b = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.user_token_b.to_account_info(),
            mint: token_b_mint.to_account_info(),
            to: ctx.accounts.dex_token_b.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );

    token::transfer_checked(
        cpi_context_a,
        amount_a,
        token_a_mint.decimals,
    )?;
    token::transfer_checked(
        cpi_context_b,
        amount_b,
        token_b_mint.decimals,
    )?;

    // Update pool reserves
    pool.token_a_reserve = pool.token_a_reserve.checked_add(amount_a).ok_or(ErrorCode::Overflow)?;
    pool.token_b_reserve = pool.token_b_reserve.checked_add(amount_b).ok_or(ErrorCode::Overflow)?;

    // Update total LP supply
    config.total_lp_supply = config.total_lp_supply.checked_add(lp_minted).ok_or(ErrorCode::Overflow)?;

    // Update user LP balance
    user_lp.balance = user_lp.balance.checked_add(lp_minted).ok_or(ErrorCode::Overflow)?;

    // Emit event
    emit!(AddLiquidityEvent {
        user: ctx.accounts.user.key(),
        amount_a,
        amount_b,
        lp_minted,
        timestamp: Clock::get()?.unix_timestamp,
    });

    msg!("Added {} TA and {} TB, minted {} LP tokens", amount_a, amount_b, lp_minted);

    Ok(lp_minted)
}

/// Remove liquidity instruction
/// Users burn LP tokens to receive their share of Token A and Token B
#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"lp_mint"],
        bump
    )]
    pub lp_mint: Account<'info, LpMint>,

    #[account(
        mut,
        seeds = [b"user_lp", user.key().as_ref(), config.key().as_ref()],
        bump
    )]
    pub user_lp: Account<'info, UserLpToken>,

    /// User's LP token account (to burn)
    #[account(mut)]
    pub user_lp_token_account: Box<Account<'info, TokenAccount>>,

    /// User's Token A account (to receive)
    #[account(mut)]
    pub user_token_a: Box<Account<'info, TokenAccount>>,

    /// User's Token B account (to receive)
    #[account(mut)]
    pub user_token_b: Box<Account<'info, TokenAccount>>,

    /// DEX's Token A vault
    #[account(mut)]
    pub dex_token_a: Box<Account<'info, TokenAccount>>,

    /// DEX's Token B vault
    #[account(mut)]
    pub dex_token_b: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn remove_liquidity_dex(
    ctx: Context<RemoveLiquidity>,
    lp_amount: u64,
) -> Result<(u64, u64)> {
    let config = &mut ctx.accounts.config;
    let pool = &mut ctx.accounts.pool;
    let user_lp = &mut ctx.accounts.user_lp;
    let lp_mint = &ctx.accounts.lp_mint;

    // Check user has enough LP tokens
    require!(user_lp.balance >= lp_amount, ErrorCode::InsufficientUserLPBalance);

    // Check pool has enough liquidity
    require!(pool.token_a_reserve > 0 && pool.token_b_reserve > 0, ErrorCode::PoolNotInitialized);

    // Calculate amount of tokens to return
    let total_lp = config.total_lp_supply;
    let amount_a = lp_amount
        .checked_mul(pool.token_a_reserve)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(total_lp)
        .ok_or(ErrorCode::InsufficientLiquidity)?;
    let amount_b = lp_amount
        .checked_mul(pool.token_b_reserve)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(total_lp)
        .ok_or(ErrorCode::InsufficientLiquidity)?;

    require!(amount_a > 0 && amount_b > 0, ErrorCode::InsufficientLiquidity);

    // Burn LP tokens (Effects first)
    let cpi_context = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        BurnChecked {
            mint: lp_mint.to_account_info(),
            from: ctx.accounts.user_lp_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );

    burn_checked(
        cpi_context,
        lp_amount,
        lp_mint.decimals,
    )?;

    user_lp.balance = user_lp.balance.checked_sub(lp_amount).ok_or(ErrorCode::Underflow)?;
    config.total_lp_supply = config.total_lp_supply.checked_sub(lp_amount).ok_or(ErrorCode::Underflow)?;

    // Update protocol fees
    let protocol_fee_a = pool.protocol_fee_a.min(amount_a);
    let protocol_fee_b = pool.protocol_fee_b.min(amount_b);

    pool.protocol_fee_a = pool.protocol_fee_a.saturating_sub(protocol_fee_a);
    pool.protocol_fee_b = pool.protocol_fee_b.saturating_sub(protocol_fee_b);

    // Transfer tokens to user (Interactions)
    let cpi_context_a = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.dex_token_a.to_account_info(),
            to: ctx.accounts.user_token_a.to_account_info(),
            authority: ctx.accounts.user_lp.to_account_info(),
        },
    );

    let cpi_context_b = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.dex_token_b.to_account_info(),
            to: ctx.accounts.user_token_b.to_account_info(),
            authority: ctx.accounts.user_lp.to_account_info(),
        },
    );

    token::transfer(cpi_context_a, amount_a)?;
    token::transfer(cpi_context_b, amount_b)?;

    // Update pool reserves
    pool.token_a_reserve = pool.token_a_reserve.saturating_sub(amount_a);
    pool.token_b_reserve = pool.token_b_reserve.saturating_sub(amount_b);

    // Emit event
    emit!(RemoveLiquidityEvent {
        user: ctx.accounts.user.key(),
        lp_burned: lp_amount,
        amount_a,
        amount_b,
        timestamp: Clock::get()?.unix_timestamp,
    });

    msg!("Removed {} LP tokens, returned {} TA and {} TB", lp_amount, amount_a, amount_b);

    Ok((amount_a, amount_b))
}

/// Swap instruction
/// Users swap Token A for Token B or vice versa
#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, Pool>,

    /// User's token account (source)
    #[account(mut)]
    pub user_token_in: Box<Account<'info, TokenAccount>>,

    /// User's token account (destination)
    #[account(mut)]
    pub user_token_out: Box<Account<'info, TokenAccount>>,

    /// DEX's vault for the input token
    #[account(mut)]
    pub dex_vault_in: Box<Account<'info, TokenAccount>>,

    /// DEX's vault for the output token
    #[account(mut)]
    pub dex_vault_out: Box<Account<'info, TokenAccount>>,

    /// Token A mint
    #[account(mut)]
    pub token_a_mint: Account<'info, Mint>,

    /// Token B mint
    #[account(mut)]
    pub token_b_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn swap_dex(
    ctx: Context<Swap>,
    token_in: u8, // 0 = Token A, 1 = Token B
    amount_in: u64,
) -> Result<u64> {
    let config = &ctx.accounts.config;
    let pool = &mut ctx.accounts.pool;

    // Check pool is initialized
    require!(pool.token_a_reserve > 0 && pool.token_b_reserve > 0, ErrorCode::PoolNotInitialized);

    // Determine which tokens are being swapped
    let is_token_a = token_in == 0;
    let reserve_in = if is_token_a {
        pool.token_a_reserve
    } else {
        pool.token_b_reserve
    };
    let reserve_out = if is_token_a {
        pool.token_b_reserve
    } else {
        pool.token_a_reserve
    };

    // Check input amount
    require!(amount_in > 0, ErrorCode::InvalidAmount);

    // Calculate amount out with constant product formula
    // amount_out = (amount_in * reserve_out) / (reserve_in + amount_in)
    let amount_in_with_fee = amount_in
        .checked_mul(10000 - config.total_fee)
        .ok_or(ErrorCode::Overflow)?;
    let denominator = reserve_in
        .checked_mul(10000)
        .ok_or(ErrorCode::Overflow)?
        .checked_add(amount_in_with_fee)
        .ok_or(ErrorCode::Overflow)?;

    let amount_out = amount_in
        .checked_mul(reserve_out)
        .ok_or(ErrorCode::Overflow)?
        .checked_mul(10000)
        .ok_or(ErrorCode::Overflow)?
        .checked_sub(amount_in_with_fee) // Fee amount
        .ok_or(ErrorCode::Underflow)?
        .checked_div(denominator)
        .ok_or(ErrorCode::InsufficientOutput)?;

    // Check output amount
    require!(amount_out > 0, ErrorCode::InsufficientOutput);

    // Calculate fees
    let fee_amount = amount_in
        .checked_mul(config.total_fee)
        .ok_or(ErrorCode::Overflow)?
        .checked_mul(10000)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(10000)
        .unwrap_or(0);
    let protocol_fee = fee_amount
        .checked_mul(config.protocol_fee)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(10000)
        .unwrap_or(0);
    let _lp_fee = fee_amount.checked_sub(protocol_fee).unwrap_or(0);

    // Transfer input tokens from user to DEX (Effects first)
    let cpi_context_in = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.user_token_in.to_account_info(),
            mint: if is_token_a {
                ctx.accounts.token_a_mint.to_account_info()
            } else {
                ctx.accounts.token_b_mint.to_account_info()
            },
            to: if is_token_a {
                ctx.accounts.dex_vault_out.to_account_info()
            } else {
                ctx.accounts.dex_vault_in.to_account_info()
            },
            authority: ctx.accounts.user.to_account_info(),
        },
    );

    let decimals = if is_token_a {
        ctx.accounts.token_a_mint.decimals
    } else {
        ctx.accounts.token_b_mint.decimals
    };

    token::transfer_checked(cpi_context_in, amount_in, decimals)?;

    // Update reserves and fees (Effects)
    if is_token_a {
        pool.token_a_reserve = pool.token_a_reserve
            .checked_add(amount_in)
            .unwrap_or(0);
        pool.token_b_reserve = pool.token_b_reserve
            .saturating_sub(amount_out);

        // Protocol fee goes to token A pool
        pool.protocol_fee_a = pool.protocol_fee_a
            .checked_add(protocol_fee)
            .unwrap_or(0);
    } else {
        pool.token_b_reserve = pool.token_b_reserve
            .checked_add(amount_in)
            .unwrap_or(0);
        pool.token_a_reserve = pool.token_a_reserve
            .saturating_sub(amount_out);

        // Protocol fee goes to token B pool
        pool.protocol_fee_b = pool.protocol_fee_b
            .checked_add(protocol_fee)
            .unwrap_or(0);
    }

    // Transfer output tokens to user (Interactions)
    let cpi_context_out = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: if is_token_a {
                ctx.accounts.dex_vault_out.to_account_info()
            } else {
                ctx.accounts.dex_vault_in.to_account_info()
            },
            to: ctx.accounts.user_token_out.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );

    token::transfer(cpi_context_out, amount_out)?;

    // Emit event
    emit!(SwapEvent {
        user: ctx.accounts.user.key(),
        token_in: if is_token_a {
            ctx.accounts.token_a_mint.key()
        } else {
            ctx.accounts.token_b_mint.key()
        },
        token_out: if is_token_a {
            ctx.accounts.token_b_mint.key()
        } else {
            ctx.accounts.token_a_mint.key()
        },
        amount_in,
        amount_out,
        timestamp: Clock::get()?.unix_timestamp,
    });

    msg!("Swapped {} of {} for {} of {}", amount_in,
         if is_token_a { "Token A" } else { "Token B" },
         amount_out,
         if is_token_a { "Token B" } else { "Token A" });

    Ok(amount_out)
}

/// Withdraw protocol fees instruction
/// Only the owner can withdraw accumulated protocol fees
#[derive(Accounts)]
pub struct WithdrawProtocolFees<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, Pool>,

    /// Owner's Token A account
    #[account(mut)]
    pub owner_token_a: Box<Account<'info, TokenAccount>>,

    /// Owner's Token B account
    #[account(mut)]
    pub owner_token_b: Box<Account<'info, TokenAccount>>,

    /// DEX's Token A vault
    #[account(mut)]
    pub dex_token_a: Box<Account<'info, TokenAccount>>,

    /// DEX's Token B vault
    #[account(mut)]
    pub dex_token_b: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn withdraw_protocol_fees_dex(ctx: Context<WithdrawProtocolFees>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    // Check ownership
    require!(ctx.accounts.owner.key() == pool.program_id, ErrorCode::OnlyOwnerCanWithdraw);

    // Check if there are fees to withdraw
    let fee_a = pool.protocol_fee_a;
    let fee_b = pool.protocol_fee_b;

    require!(fee_a > 0 || fee_b > 0, ErrorCode::NoFeesToWithdraw);

    // Reset fees
    pool.protocol_fee_a = 0;
    pool.protocol_fee_b = 0;

    // Transfer fees to owner (Interactions)
    if fee_a > 0 {
        let cpi_context_a = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.dex_token_a.to_account_info(),
                to: ctx.accounts.owner_token_a.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        );
        token::transfer(cpi_context_a, fee_a)?;
    }

    if fee_b > 0 {
        let cpi_context_b = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.dex_token_b.to_account_info(),
                to: ctx.accounts.owner_token_b.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        );
        token::transfer(cpi_context_b, fee_b)?;
    }

    // Emit event
    emit!(ProtocolFeesWithdrawnEvent {
        owner: ctx.accounts.owner.key(),
        fee_a,
        fee_b,
        timestamp: Clock::get()?.unix_timestamp,
    });

    msg!("Withdrawn {} TA and {} TB as protocol fees", fee_a, fee_b);

    Ok(())
}
