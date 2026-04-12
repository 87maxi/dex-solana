use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use crate::state::{Config, Reserve};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8 + 8 + 32 + 32
    )]
    pub event_log: Account<'info, EventLog>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct WithdrawProtocolFees<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        constraint = config.token_program == token_program.key()
    )]
    pub token_program: Program<'info, Token>,

    #[account(
        mut,
        constraint = config.protocol_fee_token_a.key() == protocol_fee_a_account.key()
    )]
    pub protocol_fee_a_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = config.protocol_fee_token_b.key() == protocol_fee_b_account.key()
    )]
    pub protocol_fee_b_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = config.token_program == token_program.key()
    )]
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct EventLog {
    pub index: u64,
    pub event_type: EventType,
    pub data: EventData,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum EventType {
    Swap,
    AddLiquidity,
    RemoveLiquidity,
    ProtocolFeesWithdrawn,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub struct EventData {
    pub amount_in: u64,
    pub amount_out: u64,
    pub token_in: u8,
    pub token_out: u8,
}

pub fn swap(
    ctx: Context<Swap>,
    token_in: u8, // 0 = TokenA, 1 = TokenB
    amount_in: u64,
    amount_out_min: u64,
) -> Result<u64> {
    let config = &ctx.accounts.config;
    let amount_in_with_fee = amount_in.checked_mul(10000).ok_or(ErrorCode::MultiplicationOverflow)?;

    let is_token_a = token_in == 0;
    let token_in_account = if is_token_a {
        &ctx.accounts.token_a_account
    } else {
        &ctx.accounts.token_b_account
    };

    let token_out_account = if is_token_a {
        &ctx.accounts.token_b_account
    } else {
        &ctx.accounts.token_a_account
    };

    let reserve_in = if is_token_a {
        config.reserve_a
    } else {
        config.reserve_b
    };

    let reserve_out = if is_token_a {
        config.reserve_b
    } else {
        config.reserve_a
    };

    // Calculate amount out with fees
    let amount_out = amount_in_with_fee
        .checked_mul(reserve_out)
        .ok_or(ErrorCode::MultiplicationOverflow)?
        .checked_div(
            amount_in_with_fee
                .checked_add(reserve_in.checked_mul(10000).ok_or(ErrorCode::MultiplicationOverflow)?)
                .ok_or(ErrorCode::MultiplicationOverflow)?
        )
        .ok_or(ErrorCode::DivisionByZero)?;

    // Slippage protection
    require!(
        amount_out >= amount_out_min,
        ErrorCode::SlippageProtectionViolated
    );

    // Calculate fees
    let total_fee = amount_out.checked_mul(30).ok_or(ErrorCode::MultiplicationOverflow)?;
    let protocol_fee = total_fee.checked_mul(10).ok_or(ErrorCode::MultiplicationOverflow)?;
    let pool_fee = total_fee.checked_sub(protocol_fee).ok_or(ErrorCode::SubtractionOverflow)?;

    let protocol_amount = protocol_fee.checked_div(10000).ok_or(ErrorCode::DivisionByZero)?;
    let pool_amount = pool_fee.checked_div(10000).ok_or(ErrorCode::DivisionByZero)?;

    // Check if amounts are valid
    require!(amount_out > 0, ErrorCode::InsufficientOutputAmount);

    // Update reserves (Effects first - Checks-Effects-Interactions)
    if is_token_a {
        let new_reserve_a = reserve_in
            .checked_sub(amount_in)
            .and_then(|r| r.checked_add(protocol_amount))
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        let new_reserve_b = reserve_out
            .checked_sub(amount_out)
            .and_then(|r| r.checked_add(pool_amount))
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        config.reserve_a = new_reserve_a;
        config.reserve_b = new_reserve_b;
        config.protocol_fee_a = config.protocol_fee_a.checked_add(protocol_amount).ok_or(ErrorCode::ArithmeticOverflow)?;
        config.protocol_fee_b = config.protocol_fee_b.checked_add(pool_amount).ok_or(ErrorCode::ArithmeticOverflow)?;
    } else {
        let new_reserve_b = reserve_in
            .checked_sub(amount_in)
            .and_then(|r| r.checked_add(protocol_amount))
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        let new_reserve_a = reserve_out
            .checked_sub(amount_out)
            .and_then(|r| r.checked_add(pool_amount))
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        config.reserve_a = new_reserve_a;
        config.reserve_b = new_reserve_b;
        config.protocol_fee_a = config.protocol_fee_a.checked_add(pool_amount).ok_or(ErrorCode::ArithmeticOverflow)?;
        config.protocol_fee_b = config.protocol_fee_b.checked_add(protocol_amount).ok_or(ErrorCode::ArithmeticOverflow)?;
    }

    // Transfer token in (Interactions)
    let token_in_cpi = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: token_in_account.to_account_info(),
            to: config.token_a_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );

    token::transfer(token_in_cpi, amount_in)?;

    // Transfer token out (Interactions)
    let token_out_cpi = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: config.token_b_account.to_account_info(),
            to: ctx.accounts.token_out_account.to_account_info(),
            authority: config.to_account_info(),
        },
    );

    token::transfer(token_out_cpi, amount_out)?;

    // Emit event
    event_log!(
        ctx.accounts.event_log,
        EventLog {
            index: 0, // Would be incremented in real implementation
            event_type: EventType::Swap,
            data: EventData {
                amount_in,
                amount_out,
                token_in: token_in as u8,
                token_out: if is_token_a { 1 } else { 0 },
            },
        }
    );

    Ok(amount_out)
}

pub fn withdraw_protocol_fees(ctx: Context<WithdrawProtocolFees>) -> Result<()> {
    let config = &mut ctx.accounts.config;

    require!(
        config.protocol_fee_a > 0 || config.protocol_fee_b > 0,
        ErrorCode::NoFeesToWithdraw
    );

    let fee_a = config.protocol_fee_a;
    let fee_b = config.protocol_fee_b;

    // Update reserves before withdrawing
    config.reserve_a = config.reserve_a.checked_sub(fee_a).ok_or(ErrorCode::ArithmeticOverflow)?;
    config.reserve_b = config.reserve_b.checked_sub(fee_b).ok_or(ErrorCode::ArithmeticOverflow)?;

    // Reset fees
    config.protocol_fee_a = 0;
    config.protocol_fee_b = 0;

    // Transfer token A
    if fee_a > 0 {
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.protocol_fee_a_account.to_account_info(),
                to: ctx.accounts.owner.to_account_info(),
                authority: config.to_account_info(),
            },
        );

        token::transfer(cpi_context, fee_a)?;
    }

    // Transfer token B
    if fee_b > 0 {
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.protocol_fee_b_account.to_account_info(),
                to: ctx.accounts.owner.to_account_info(),
                authority: config.to_account_info(),
            },
        );

        token::transfer(cpi_context, fee_b)?;
    }

    msg!("Protocol fees withdrawn: fee_a={}, fee_b={}", fee_a, fee_b);
    Ok(())
}
```

```</think>Perfecto. Ahora voy a crear el archivo de implementación del swap para la fase 3.
