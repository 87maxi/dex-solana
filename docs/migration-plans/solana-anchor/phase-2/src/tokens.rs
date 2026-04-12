// SPDX-License-Identifier: MIT
use anchor_lang::prelude::*;

/// Custom TokenA implementation
#[account]
pub struct TokenA {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: u64,
    pub mint_authority: Pubkey,
    pub freeze_authority: Option<Pubkey>,
    pub is_mintable: bool,
}

impl TokenA {
    pub fn try_from_seed(
        seed: &[u8],
        bump: u8,
        program_id: &Pubkey,
    ) -> Result<Self> {
        let data = Pubkey::create_from_seed_with_seeds(
            seed,
            &[],
            program_id,
        )?;

        let owner = Pubkey::create_with_bump(data.as_ref(), bump);

        // In a real implementation, we'd deserialize from account data
        // For this example, we'll create a new instance
        Ok(TokenA {
            name: "TokenA".to_string(),
            symbol: "TA".to_string(),
            decimals: 9,
            total_supply: 0,
            mint_authority: owner,
            freeze_authority: Some(owner),
            is_mintable: true,
        })
    }

    pub fn to_account_info(&self, accounts: &mut Vec<AccountInfo>) -> Result<()> {
        // In Anchor, account creation is handled by the instruction
        // This is a placeholder for the logic
        Ok(())
    }
}

/// Custom TokenB implementation
#[account]
pub struct TokenB {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: u64,
    pub mint_authority: Pubkey,
    pub freeze_authority: Option<Pubkey>,
    pub is_mintable: bool,
}

impl TokenB {
    pub fn try_from_seed(
        seed: &[u8],
        bump: u8,
        program_id: &Pubkey,
    ) -> Result<Self> {
        let data = Pubkey::create_from_seed_with_seeds(
            seed,
            &[],
            program_id,
        )?;

        let owner = Pubkey::create_with_bump(data.as_ref(), bump);

        // In a real implementation, we'd deserialize from account data
        // For this example, we'll create a new instance
        Ok(TokenB {
            name: "TokenB".to_string(),
            symbol: "TB".to_string(),
            decimals: 9,
            total_supply: 0,
            mint_authority: owner,
            freeze_authority: Some(owner),
            is_mintable: true,
        })
    }

    pub fn to_account_info(&self, accounts: &mut Vec<AccountInfo>) -> Result<()> {
        // In Anchor, account creation is handled by the instruction
        // This is a placeholder for the logic
        Ok(())
    }
}

/// Initialize TokenA instruction
#[derive(Accounts)]
pub struct InitTokenA<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"tokenA", payer.key().as_ref()],
        bump,
        token::mint = token_a_mint,
        token::authority = payer,
    )]
    pub token_a_mint: Account<'info, Token>,

    #[account(
        init,
        payer = payer,
        seeds = [b"tokenA_account", payer.key().as_ref()],
        bump,
        token::account = token_a_account,
    )]
    pub token_a_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Initialize TokenB instruction
#[derive(Accounts)]
pub struct InitTokenB<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"tokenB", payer.key().as_ref()],
        bump,
        token::mint = token_b_mint,
        token::authority = payer,
    )]
    pub token_b_mint: Account<'info, Token>,

    #[account(
        init,
        payer = payer,
        seeds = [b"tokenB_account", payer.key().as_ref()],
        bump,
        token::account = token_b_account,
    )]
    pub token_b_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Mint tokens to an account
#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(
        mut,
        mint = token_mint,
    )]
    pub token_mint: Account<'info, Token>,

    #[account(
        mut,
        token::authority = token_mint,
        token::account = token_account,
    )]
    pub token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

/// Transfer tokens between accounts
#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(
        mut,
        constraint = from_account.owner == token_program.key()
    )]
    pub from_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = to_account.owner == token_program.key()
    )]
    pub to_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}
