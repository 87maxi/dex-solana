use anchor_lang::prelude::*;

// ==================== Errors ====================
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Insufficient output amount")]
    InsufficientOutput,

    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,

    #[msg("Pool not initialized")]
    PoolNotInitialized,

    #[msg("Invalid token amounts")]
    InvalidAmounts,

    #[msg("Only owner can withdraw fees")]
    OnlyOwnerCanWithdraw,

    #[msg("No fees to withdraw")]
    NoFeesToWithdraw,

    #[msg("Insufficient user LP balance")]
    InsufficientUserLPBalance,

    #[msg("Insufficient LP tokens burned")]
    InsufficientLPTokensBurned,

    #[msg("LP mint already initialized")]
    LPMintAlreadyInitialized,

    #[msg("Token accounts not provided")]
    TokenAccountsNotProvided,

    #[msg("Overflow occurred")]
    Overflow,

    #[msg("Underflow occurred")]
    Underflow,
}

// ==================== Events ====================
#[event]
pub struct SwapEvent {
    pub user: Pubkey,
    pub token_in: Pubkey,
    pub token_out: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub timestamp: i64,
}

#[event]
pub struct AddLiquidityEvent {
    pub user: Pubkey,
    pub amount_a: u64,
    pub amount_b: u64,
    pub lp_minted: u64,
    pub timestamp: i64,
}

#[event]
pub struct RemoveLiquidityEvent {
    pub user: Pubkey,
    pub lp_burned: u64,
    pub amount_a: u64,
    pub amount_b: u64,
    pub timestamp: i64,
}

#[event]
pub struct ProtocolFeesWithdrawnEvent {
    pub owner: Pubkey,
    pub fee_a: u64,
    pub fee_b: u64,
    pub timestamp: i64,
}

// ==================== State Accounts ====================

/// Configuration account for the DEX program
#[account]
pub struct Config {
    /// Owner of the DEX (can withdraw protocol fees)
    pub owner: Pubkey,
    /// Total LP tokens supply
    pub total_lp_supply: u64,

    /// Fee constants (stored as basis points * 100 to avoid decimals)
    pub total_fee: u64,        // 30 = 0.3%
    pub protocol_fee: u64,     // 10 = 0.1%
    pub lp_fee: u64,           // 20 = 0.2%
    pub fee_denominator: u64, // 10000
}

impl Config {
    pub const INIT_SPACE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 8;
}

/// Pool account holding token reserves
#[account]
pub struct Pool {
    /// Program ID
    pub program_id: Pubkey,
    /// Token A mint
    pub token_a_mint: Pubkey,
    /// Token B mint
    pub token_b_mint: Pubkey,
    /// Reserve of Token A
    pub token_a_reserve: u64,
    /// Reserve of Token B
    pub token_b_reserve: u64,
    /// Protocol fees accumulated in Token A
    pub protocol_fee_a: u64,
    /// Protocol fees accumulated in Token B
    pub protocol_fee_b: u64,
}

impl Pool {
    pub const INIT_SPACE: usize = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 8;
}

/// LP Token mint account
#[account]
pub struct LpMint {
    /// Program ID
    pub program_id: Pubkey,
    /// Token A mint
    pub token_a_mint: Pubkey,
    /// Token B mint
    pub token_b_mint: Pubkey,
    /// Total LP tokens supply
    pub total_supply: u64,
    /// Decimal precision
    pub decimals: u8,
}

impl LpMint {
    pub const INIT_SPACE: usize = 8 + 32 + 32 + 32 + 8 + 1;
}

/// User LP token balance
#[account]
pub struct UserLpToken {
    /// Owner of the LP tokens
    pub owner: Pubkey,
    /// LP token mint
    pub mint: Pubkey,
    /// Balance of LP tokens
    pub balance: u64,
}

impl UserLpToken {
    pub const INIT_SPACE: usize = 8 + 32 + 32 + 8;
}
