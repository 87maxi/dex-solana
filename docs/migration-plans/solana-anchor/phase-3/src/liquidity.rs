// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20.sol";

contract TokenA is ERC20 {
    constructor() ERC20("TokenA", "TA", 18) {
        // TokenA con función mint personalizada
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

contract TokenB is ERC20 {
    constructor() ERC20("TokenB", "TB", 18) {
        // TokenB con función mint personalizada
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
```

This is actually the Phase 2 content. Let me create the correct Phase 3 file for liquidity.rs.</think>```rust
use anchor_lang::prelude::*;

// State accounts for the DEX
#[account]
pub struct DexState {
    pub owner: Pubkey,
    pub total_lp_supply: u64,

    // Fee constants (stored as u64 to avoid overflow)
    pub total_fee: u64,        // 30 = 0.3%
    pub protocol_fee: u64,     // 10 = 0.1%
    pub lp_fee: u64,           // 20 = 0.2%
    pub fee_denominator: u64, // 10000
}

// Liquidity pool accounts
#[account]
pub struct Pool {
    pub dex: Pubkey,
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub token_a_reserve: u64,
    pub token_b_reserve: u64,
    pub protocol_fee_a: u64,
    pub protocol_fee_b: u64,
}

// LP Token mint account
#[account]
pub struct LpMint {
    pub dex: Pubkey,
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub total_supply: u64,
}

// User's LP token account
#[account]
pub struct UserLpToken {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub balance: u64,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid liquidity amount")]
    InvalidLiquidity,
    #[msg("Insufficient LP tokens")]
    InsufficientLpTokens,
    #[msg("Pool not initialized")]
    PoolNotInitialized,
    #[msg("Invalid token amounts")]
    InvalidAmounts,
}

// Add liquidity instruction
#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        constraint = token_a.key() == pool.token_a_mint @ ErrorCode::InvalidAmounts,
        constraint = token_b.key() == pool.token_b_mint @ ErrorCode::InvalidAmounts
    )]
    pub token_a: Account<'info, spl_token::token::TokenAccount>,

    #[account(
        mut,
        constraint = token_b.key() == pool.token_b_mint @ ErrorCode::InvalidAmounts
    )]
    pub token_b: Account<'info, spl_token::token::TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Pool::space
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + LpMint::space,
        seeds = [b"lp_mint", pool.token_a_mint.as_ref(), pool.token_b_mint.as_ref()],
        bump
    )]
    pub lp_mint: Account<'info, LpMint>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserLpToken::space,
        seeds = [b"user_lp", user.key().as_ref(), lp_mint.key().as_ref()],
        bump
    )]
    pub user_lp: Account<'info, UserLpToken>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, spl_token::token::Token>,
}

pub fn add_liquidity(
    ctx: Context<'_, '_, '_, '_, AddLiquidity<'info>>,
    amount_a: u64,
    amount_b: u64,
) -> Result<u64> {
    let liquidity_amount = if ctx.accounts.pool.token_a_reserve == 0 && ctx.accounts.pool.token_b_reserve == 0 {
        // First liquidity: simple mint
        // Calculate LP tokens based on ratio
        let total_amount = amount_a + amount_b;
        liquidity_amount = total_amount / 2;
    } else {
        // Subsequent liquidity: proportional to current reserves
        let reserve_ratio_a = u128::from(ctx.accounts.pool.token_a_reserve) as f128;
        let reserve_ratio_b = u128::from(ctx.accounts.pool.token_b_reserve) as f128;

        let current_ratio = reserve_ratio_a / reserve_ratio_b;
        let new_ratio = u128::from(amount_a) / u128::from(amount_b);

        if current_ratio < new_ratio {
            // TokenB is more valuable relative to A
            let new_reserve_b = u64::from(u128::from(ctx.accounts.pool.token_b_reserve) * (10000 + u128::from(liquidity_amount)) / u128::from(10000));
            liquidity_amount = new_reserve_b - ctx.accounts.pool.token_b_reserve;
        } else {
            // TokenA is more valuable relative to B
            let new_reserve_a = u64::from(u128::from(ctx.accounts.pool.token_a_reserve) * (10000 + u128::from(liquidity_amount)) / u128::from(10000));
            liquidity_amount = new_reserve_a - ctx.accounts.pool.token_a_reserve;
        }

        // Ensure at least some liquidity is minted
        liquidity_amount = liquidity_amount.max(1);
    };

    // Check liquidity amount is valid
    require!(liquidity_amount > 0, ErrorCode::InvalidLiquidity);

    // Transfer tokens from user to pool
    let token_a_account = &mut ctx.accounts.token_a;
    let token_b_account = &mut ctx.accounts.token_b;

    let amount_a_u128 = u128::from(amount_a);
    let amount_b_u128 = u128::from(amount_b);

    require!(token_a_account.amount >= amount_a_u128, ErrorCode::InvalidAmounts);
    require!(token_b_account.amount >= amount_b_u128, ErrorCode::InvalidAmounts);

    token_a_account.try_sub_mut_amount(amount_a_u128)?;
    token_b_account.try_sub_mut_amount(amount_b_u128)?;

    // Update pool reserves
    ctx.accounts.pool.token_a_reserve = ctx.accounts.pool.token_a_reserve.checked_add(amount_a)?;
    ctx.accounts.pool.token_b_reserve = ctx.accounts.pool.token_b_reserve.checked_add(amount_b)?;

    // Update protocol fees
    let fee = ((amount_a_u128 + amount_b_u128) * u128::from(ctx.accounts.pool.total_fee) / u128::from(ctx.accounts.pool.fee_denominator)) / 2;
    ctx.accounts.pool.protocol_fee_a += fee as u64;
    ctx.accounts.pool.protocol_fee_b += fee as u64;

    // Update LP mint
    let new_total_supply = ctx.accounts.lp_mint.total_supply.checked_add(liquidity_amount)?;
    ctx.accounts.lp_mint.total_supply = new_total_supply;

    // Update user LP balance
    let user_lp = &mut ctx.accounts.user_lp;
    let current_balance = user_lp.balance.checked_add(liquidity_amount)?;
    user_lp.balance = current_balance;

    // Update total LP supply
    let total_supply = ctx.accounts.pool.total_lp_supply.checked_add(liquidity_amount)?;
    ctx.accounts.pool.total_lp_supply = total_supply;

    // Initialize LP mint if first time
    if ctx.accounts.lp_mint.total_supply == liquidity_amount && ctx.accounts.lp_mint.total_supply > 0 {
        ctx.accounts.lp_mint.total_supply = liquidity_amount;
        ctx.accounts.pool.total_lp_supply = liquidity_amount;
    }

    Ok(liquidity_amount)
}

// Remove liquidity instruction
#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"lp_mint", pool.token_a_mint.as_ref(), pool.token_b_mint.as_ref()],
        bump
    )]
    pub lp_mint: Account<'info, LpMint>,

    #[account(mut)]
    pub user_lp: Account<'info, UserLpToken>,

    #[account(mut, constraint = pool.dex == dex.state @ ErrorCode::InvalidAmounts)]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub token_a: Account<'info, spl_token::token::TokenAccount>,

    #[account(mut)]
    pub token_b: Account<'info, spl_token::token::TokenAccount>,

    #[account(mut)]
    pub token_a_program: Program<'info, spl_token::token::Token>,

    #[account(mut)]
    pub token_b_program: Program<'info, spl_token::token::Token>,

    pub dex: Account<'info, DexState>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, spl_token::token::Token>,
}

pub fn remove_liquidity(
    ctx: Context<'_, '_, '_, '_, RemoveLiquidity<'info>>,
    lp_amount: u64,
) -> Result<(u64, u64)> {
    // Check user has enough LP tokens
    require!(ctx.accounts.user_lp.balance >= lp_amount, ErrorCode::InsufficientLpTokens);

    // Calculate amount of tokens to return
    let reserve_a = ctx.accounts.pool.token_a_reserve;
    let reserve_b = ctx.accounts.pool.token_b_reserve;
    let total_supply = ctx.accounts.pool.total_lp_supply;

    require!(total_supply > 0, ErrorCode::PoolNotInitialized);

    let amount_a = lp_amount * reserve_a / total_supply;
    let amount_b = lp_amount * reserve_b / total_supply;

    require!(amount_a > 0 && amount_b > 0, ErrorCode::InvalidLiquidity);

    // Burn LP tokens
    let user_lp = &mut ctx.accounts.user_lp;
    user_lp.balance = user_lp.balance.checked_sub(lp_amount)?;

    let total_supply_after = ctx.accounts.pool.total_lp_supply.checked_sub(lp_amount)?;
    ctx.accounts.pool.total_lp_supply = total_supply_after;

    // Reduce protocol fees
    let protocol_fee_a = ctx.accounts.pool.protocol_fee_a.min(amount_a);
    let protocol_fee_b = ctx.accounts.pool.protocol_fee_b.min(amount_b);

    ctx.accounts.pool.protocol_fee_a = ctx.accounts.pool.protocol_fee_a.checked_sub(protocol_fee_a)?;
    ctx.accounts.pool.protocol_fee_b = ctx.accounts.pool.protocol_fee_b.checked_sub(protocol_fee_b)?;

    // Update pool reserves
    ctx.accounts.pool.token_a_reserve = reserve_a.checked_sub(amount_a)?;
    ctx.accounts.pool.token_b_reserve = reserve_b.checked_sub(amount_b)?;

    // Transfer tokens back to user
    let token_a = &mut ctx.accounts.token_a;
    let token_b = &mut ctx.accounts.token_b;

    let amount_a_u128 = u128::from(amount_a);
    let amount_b_u128 = u128::from(amount_b);

    let amount_a_after_fee = amount_a_u128 - u128::from(protocol_fee_a);
    let amount_b_after_fee = amount_b_u128 - u128::from(protocol_fee_b);

    require!(token_a.amount >= amount_a_after_fee, ErrorCode::InvalidAmounts);
    require!(token_b.amount >= amount_b_after_fee, ErrorCode::InvalidAmounts);

    token_a.try_sub_mut_amount(amount_a_after_fee)?;
    token_b.try_sub_mut_amount(amount_b_after_fee)?;

    Ok((amount_a, amount_b))
}
