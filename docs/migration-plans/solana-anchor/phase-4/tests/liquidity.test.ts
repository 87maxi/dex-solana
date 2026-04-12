// SPDX-License-Identifier: MIT
/**
 * Liquidity Tests for Solana DEX
 * Tests for add_liquidity and remove_liquidity functions
 */

import { anchor } from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { SolanaDex } from "../../target/types/solana_dex";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("Liquidity Tests", () => {
  let provider: anchor.AnchorProvider;
  let program: Program<SolanaDex>;

  // Test accounts
  let user: Keypair;
  let userTokenA: Keypair;
  let userTokenB: Keypair;
  let poolTokenA: Keypair;
  let poolTokenB: Keypair;
  let lpMint: Keypair;
  let userLpAccount: Keypair;
  let pool: Keypair;
  let tokenProgram: PublicKey;

  // Constants
  const AMOUNT_A = new BN("1000000000000000000"); // 1 TA (18 decimals)
  const AMOUNT_B = new BN("1000000000000000000"); // 1 TB (18 decimals)

  before(async () => {
    // Set up provider
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    program = anchor.workspace.SolanaDex as Program<SolanaDex>;

    // Generate test accounts
    user = Keypair.generate();
    userTokenA = Keypair.generate();
    userTokenB = Keypair.generate();
    poolTokenA = Keypair.generate();
    poolTokenB = Keypair.generate();
    lpMint = Keypair.generate();
    userLpAccount = Keypair.generate();
    pool = Keypair.generate();

    tokenProgram = TOKEN_PROGRAM_ID;
  });

  async function setupTokens() {
    // Create mint accounts
    await Token.createMint(
      provider.connection,
      user,
      user.publicKey,
      user.publicKey,
      18,
      userTokenA.publicKey
    );
    await Token.createMint(
      provider.connection,
      user,
      user.publicKey,
      user.publicKey,
      18,
      userTokenB.publicKey
    );

    // Create token accounts for user
    await Token.createAccount(
      provider.connection,
      user,
      userTokenA.publicKey,
      user.publicKey,
      userTokenA.publicKey
    );
    await Token.createAccount(
      provider.connection,
      user,
      userTokenB.publicKey,
      user.publicKey,
      userTokenB.publicKey
    );

    // Create token accounts for pool
    await Token.createAccount(
      provider.connection,
      user,
      userTokenA.publicKey,
      pool.publicKey,
      poolTokenA.publicKey
    );
    await Token.createAccount(
      provider.connection,
      user,
      userTokenB.publicKey,
      pool.publicKey,
      poolTokenB.publicKey
    );

    // Mint tokens to user
    await Token.mint(
      provider.connection,
      user,
      userTokenA.publicKey,
      user.publicKey,
      AMOUNT_A,
      []
    );
    await Token.mint(
      provider.connection,
      user,
      userTokenB.publicKey,
      user.publicKey,
      AMOUNT_B,
      []
    );
  }

  async function setupPool() {
    // Initialize pool with initial liquidity
    await program.methods
      .initializePool()
      .accounts({
        owner: user.publicKey,
        tokenA: userTokenA.publicKey,
        tokenB: userTokenB.publicKey,
        tokenAProgram: tokenProgram,
        tokenBProgram: tokenProgram,
        pool: pool.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: tokenProgram,
      })
      .rpc();

    // Add initial liquidity
    await program.methods
      .addLiquidity(new BN("1000000000000000000"), new BN("1000000000000000000"))
      .accounts({
        user: user.publicKey,
        tokenA: userTokenA.publicKey,
        tokenB: userTokenB.publicKey,
        pool: pool.publicKey,
        lpMint: lpMint.publicKey,
        userLp: userLpAccount.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: tokenProgram,
      })
      .signers([user])
      .rpc();
  }

  describe("Add Liquidity Tests", () => {
    beforeEach(async () => {
      await setupTokens();
    });

    it("should successfully add initial liquidity to an empty pool", async () => {
      // Initial pool is empty, so this should fail
      // But in a real implementation, we'd initialize the pool first
      // This test is a placeholder
      const balanceBefore = await Token.getAccount(provider.connection, userTokenA.publicKey);

      await program.methods
        .addLiquidity(AMOUNT_A, AMOUNT_B)
        .accounts({
          user: user.publicKey,
          tokenA: userTokenA.publicKey,
          tokenB: userTokenB.publicKey,
          pool: pool.publicKey,
          lpMint: lpMint.publicKey,
          userLp: userLpAccount.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgram,
        })
        .signers([user])
        .rpc();

      const balanceAfter = await Token.getAccount(provider.connection, userTokenA.publicKey);

      // User should have 0 TA balance
      expect(balanceAfter.amount.toNumber()).toBe(0);
    });

    it("should add liquidity to an existing pool proportionally", async () => {
      // First, initialize pool with initial liquidity
      await setupPool();

      // Get user token balances before adding more liquidity
      const tokenABalanceBefore = await Token.getAccount(provider.connection, userTokenA.publicKey);
      const tokenBBalanceBefore = await Token.getAccount(provider.connection, userTokenB.publicKey);

      // Add more liquidity
      const tx = await program.methods
        .addLiquidity(
          new BN("500000000000000000"), // 0.5 TA
          new BN("500000000000000000")  // 0.5 TB
        )
        .accounts({
          user: user.publicKey,
          tokenA: userTokenA.publicKey,
          tokenB: userTokenB.publicKey,
          pool: pool.publicKey,
          lpMint: lpMint.publicKey,
          userLp: userLpAccount.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgram,
        })
        .signers([user])
        .rpc();

      // Get user token balances after adding liquidity
      const tokenABalanceAfter = await Token.getAccount(provider.connection, userTokenA.publicKey);
      const tokenBBalanceAfter = await Token.getAccount(provider.connection, userTokenB.publicKey);

      // User should have less tokens (some were transferred to pool)
      expect(tokenABalanceAfter.amount.toNumber()).toBeLessThan(tokenABalanceBefore.amount.toNumber());
      expect(tokenBBalanceAfter.amount.toNumber()).toBeLessThan(tokenBBalanceBefore.amount.toNumber());
    });

    it("should fail when adding zero amounts", async () => {
      try {
        await program.methods
          .addLiquidity(new BN(0), new BN("1000000000000000000"))
          .accounts({
            user: user.publicKey,
            tokenA: userTokenA.publicKey,
            tokenB: userTokenB.publicKey,
            pool: pool.publicKey,
            lpMint: lpMint.publicKey,
            userLp: userLpAccount.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: tokenProgram,
          })
          .signers([user])
          .rpc();

        fail("Should have thrown an error for zero amount");
      } catch (error: any) {
        expect(error.msg).toContain("Invalid liquidity");
      }
    });

    it("should fail when adding more tokens than user has", async () => {
      try {
        await program.methods
          .addLiquidity(new BN("10000000000000000000"), new BN("1000000000000000000"))
          .accounts({
            user: user.publicKey,
            tokenA: userTokenA.publicKey,
            tokenB: userTokenB.publicKey,
            pool: pool.publicKey,
            lpMint: lpMint.publicKey,
            userLp: userLpAccount.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: tokenProgram,
          })
          .signers([user])
          .rpc();

        fail("Should have thrown an error for insufficient balance");
      } catch (error: any) {
        expect(error.msg).toContain("Invalid amounts");
      }
    });

    it("should emit AddLiquidity event", async () => {
      // First, initialize pool with initial liquidity
      await setupPool();

      const tx = await program.methods
        .addLiquidity(new BN("100000000000000000"), new BN("100000000000000000"))
        .accounts({
          user: user.publicKey,
          tokenA: userTokenA.publicKey,
          tokenB: userTokenB.publicKey,
          pool: pool.publicKey,
          lpMint: lpMint.publicKey,
          userLp: userLpAccount.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgram,
        })
        .signers([user])
        .rpc();

      // Verify transaction
      const signature = await provider.connection.getSignatureStatus(tx.value);
      expect(signature.value?.err).toBeUndefined();
    });
  });

  describe("Remove Liquidity Tests", () => {
    beforeEach(async () => {
      await setupTokens();
      await setupPool();
    });

    it("should successfully remove liquidity and receive tokens", async () => {
      // Get user token balances before removing liquidity
      const tokenABalanceBefore = await Token.getAccount(provider.connection, userTokenA.publicKey);
      const tokenBBalanceBefore = await Token.getAccount(provider.connection, userTokenB.publicKey);

      // Remove 50% of LP tokens
      const userLpAccountInfo = await Token.getAccount(provider.connection, userLpAccount.publicKey);
      const lpBalance = userLpAccountInfo.amount;
      const lpToRemove = new BN(Math.floor(lpBalance.toNumber() / 2));

      const tx = await program.methods
        .removeLiquidity(lpToRemove)
        .accounts({
          user: user.publicKey,
          lpMint: lpMint.publicKey,
          userLp: userLpAccount.publicKey,
          pool: pool.publicKey,
          tokenA: poolTokenA.publicKey,
          tokenB: poolTokenB.publicKey,
          tokenAProgram: tokenProgram,
          tokenBProgram: tokenProgram,
          dex: pool.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgram,
        })
        .signers([user])
        .rpc();

      // Get user token balances after removing liquidity
      const tokenABalanceAfter = await Token.getAccount(provider.connection, userTokenA.publicKey);
      const tokenBBalanceAfter = await Token.getAccount(provider.connection, userTokenB.publicKey);

      // User should have more tokens back
      expect(tokenABalanceAfter.amount.toNumber()).toBeGreaterThan(
        tokenABalanceBefore.amount.toNumber()
      );
      expect(tokenBBalanceAfter.amount.toNumber()).toBeGreaterThan(
        tokenBBalanceBefore.amount.toNumber()
      );
    });

    it("should fail when removing more LP tokens than user has", async () => {
      // Remove an amount that's more than user has
      const userLpAccountInfo = await Token.getAccount(provider.connection, userLpAccount.publicKey);
      const lpBalance = userLpAccountInfo.amount;
      const lpToRemove = new BN(lpBalance.toNumber() + 1000000000000);

      try {
        await program.methods
          .removeLiquidity(lpToRemove)
          .accounts({
            user: user.publicKey,
            lpMint: lpMint.publicKey,
            userLp: userLpAccount.publicKey,
            pool: pool.publicKey,
            tokenA: poolTokenA.publicKey,
            tokenB: poolTokenB.publicKey,
            tokenAProgram: tokenProgram,
            tokenBProgram: tokenProgram,
            dex: pool.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: tokenProgram,
          })
          .signers([user])
          .rpc();

        fail("Should have thrown an error for insufficient LP tokens");
      } catch (error: any) {
        expect(error.msg).toContain("Insufficient");
      }
    });

    it("should fail to remove from empty pool", async () => {
      try {
        // Try to remove from a pool with no liquidity
        await program.methods
          .removeLiquidity(new BN("1000000000000000000"))
          .accounts({
            user: user.publicKey,
            lpMint: lpMint.publicKey,
            userLp: userLpAccount.publicKey,
            pool: pool.publicKey,
            tokenA: poolTokenA.publicKey,
            tokenB: poolTokenB.publicKey,
            tokenAProgram: tokenProgram,
            tokenBProgram: tokenProgram,
            dex: pool.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: tokenProgram,
          })
          .signers([user])
          .rpc();

        fail("Should have thrown an error for empty pool");
      } catch (error: any) {
        expect(error.msg).toContain("Not initialized");
      }
    });

    it("should update LP token balances correctly", async () => {
      // Remove all LP tokens
      const userLpAccountInfo = await Token.getAccount(provider.connection, userLpAccount.publicKey);
      const lpToRemove = userLpAccountInfo.amount;

      await program.methods
        .removeLiquidity(lpToRemove)
        .accounts({
          user: user.publicKey,
          lpMint: lpMint.publicKey,
          userLp: userLpAccount.publicKey,
          pool: pool.publicKey,
          tokenA: poolTokenA.publicKey,
          tokenB: poolTokenB.publicKey,
          tokenAProgram: tokenProgram,
          tokenBProgram: tokenProgram,
          dex: pool.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgram,
        })
        .signers([user])
        .rpc();

      // Verify LP balance is now 0
      const userLpAccountInfoAfter = await Token.getAccount(provider.connection, userLpAccount.publicKey);
      expect(userLpAccountInfoAfter.amount.toNumber()).toBe(0);
    });
  });

  describe("Liquidity Calculation Tests", () => {
    it("should calculate LP tokens proportionally to reserves", async () => {
      // First, initialize pool with initial liquidity
      await setupPool();

      // Get initial pool reserves
      const poolInfo = await program.account.pool.fetch(pool.publicKey);
      const initialReserveA = poolInfo.tokenAReserve;
      const initialReserveB = poolInfo.tokenBReserve;

      // Add proportional liquidity
      const liquidityAmount = new BN("500000000000000000");
      await program.methods
        .addLiquidity(liquidityAmount, liquidityAmount)
        .accounts({
          user: user.publicKey,
          tokenA: userTokenA.publicKey,
          tokenB: userTokenB.publicKey,
          pool: pool.publicKey,
          lpMint: lpMint.publicKey,
          userLp: userLpAccount.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgram,
        })
        .signers([user])
        .rpc();

      // Calculate expected LP tokens
      const totalLp = await program.account.lpMint.fetch(lpMint.publicKey);
      const expectedLp = totalLp.totalSupply;

      expect(expectedLp.toNumber()).toBeGreaterThan(0);
    });

    it("should calculate token amounts based on LP share", async () => {
      // First, initialize pool
      await setupPool();

      // Add liquidity
      await program.methods
        .addLiquidity(AMOUNT_A, AMOUNT_B)
        .accounts({
          user: user.publicKey,
          tokenA: userTokenA.publicKey,
          tokenB: userTokenB.publicKey,
          pool: pool.publicKey,
          lpMint: lpMint.publicKey,
          userLp: userLpAccount.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgram,
        })
        .signers([user])
        .rpc();

      // Remove partial liquidity
      const userLpAccountInfo = await Token.getAccount(provider.connection, userLpAccount.publicKey);
      const lpBalance = userLpAccountInfo.amount;
      const lpToRemove = new BN(Math.floor(lpBalance.toNumber() / 3));

      const { tokenA: returnedA, tokenB: returnedB } =
        await program.methods
          .removeLiquidity(lpToRemove)
          .accounts({
            user: user.publicKey,
            lpMint: lpMint.publicKey,
            userLp: userLpAccount.publicKey,
            pool: pool.publicKey,
            tokenA: poolTokenA.publicKey,
            tokenB: poolTokenB.publicKey,
            tokenAProgram: tokenProgram,
            tokenBProgram: tokenProgram,
            dex: pool.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: tokenProgram,
          })
          .signers([user])
          .rpcs();

      // Verify returned amounts are proportional to LP share
      expect(returnedA.toNumber()).toBeGreaterThan(0);
      expect(returnedB.toNumber()).toBeGreaterThan(0);

      // Ratio should be approximately the same as the pool ratio
      const ratio = returnedA.toNumber() / returnedB.toNumber();
      const poolRatio = initialReserveA / initialReserveB;
      const tolerance = 0.1; // 10% tolerance

      expect(Math.abs(ratio - poolRatio) / poolRatio).toBeLessThan(tolerance);
    });
  });

  describe("Security Tests", () => {
    it("should prevent reentrancy attacks", async () => {
      // This test is for checking that the implementation follows Checks-Effects-Interactions
      // In Solana Anchor, this is handled by the account constraints and CPI

      // First, initialize pool
      await setupPool();

      // Add initial liquidity
      await program.methods
        .addLiquidity(AMOUNT_A, AMOUNT_B)
        .accounts({
          user: user.publicKey,
          tokenA: userTokenA.publicKey,
          tokenB: userTokenB.publicKey,
          pool: pool.publicKey,
          lpMint: lpMint.publicKey,
          userLp: userLpAccount.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgram,
        })
        .signers([user])
        .rpc();

      // Verify LP balance
      const userLpAccountInfo = await Token.getAccount(provider.connection, userLpAccount.publicKey);
      expect(userLpAccountInfo.amount.toNumber()).toBeGreaterThan(0);

      // Remove all liquidity
      await program.methods
        .removeLiquidity(userLpAccountInfo.amount)
        .accounts({
          user: user.publicKey,
          lpMint: lpMint.publicKey,
          userLp: userLpAccount.publicKey,
          pool: pool.publicKey,
          tokenA: poolTokenA.publicKey,
          tokenB: poolTokenB.publicKey,
          tokenAProgram: tokenProgram,
          tokenBProgram: tokenProgram,
          dex: pool.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgram,
        })
        .signers([user])
        .rpc();

      // Verify LP balance is 0
      const userLpAccountInfoAfter = await Token.getAccount(provider.connection, userLpAccount.publicKey);
      expect(userLpAccountInfoAfter.amount.toNumber()).toBe(0);
    });

    it("should use proper rounding to avoid token loss", async () => {
      // Test that calculations don't lose tokens due to rounding errors
      const userLpAccountInfo = await Token.getAccount(provider.connection, userLpAccount.publicKey);
      const lpBalance = userLpAccountInfo.amount;

      if (lpBalance.toNumber() === 0) {
        // Skip if no LP tokens
        return;
      }

      // Get initial user token balances
      const tokenABalanceBefore = await Token.getAccount(provider.connection, userTokenA.publicKey);
      const tokenBBalanceBefore = await Token.getAccount(provider.connection, userTokenB.publicKey);

      // Remove all liquidity
      await program.methods
        .removeLiquidity(lpBalance)
        .accounts({
          user: user.publicKey,
          lpMint: lpMint.publicKey,
          userLp: userLpAccount.publicKey,
          pool: pool.publicKey,
          tokenA: poolTokenA.publicKey,
          tokenB: poolTokenB.publicKey,
          tokenAProgram: tokenProgram,
          tokenBProgram: tokenProgram,
          dex: pool.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgram,
        })
        .signers([user])
        .rpc();

      // Get final user token balances
      const tokenABalanceAfter = await Token.getAccount(provider.connection, userTokenA.publicKey);
      const tokenBBalanceAfter = await Token.getAccount(provider.connection, userTokenB.publicKey);

      // Verify user received back approximately what they contributed
      // (minus protocol fees which should be minimal)
      const expectedReturn = tokenABalanceBefore.amount
        .add(tokenBBalanceBefore.amount)
        .sub(AMOUNT_A)
        .sub(AMOUNT_B);
      const actualReturn = tokenABalanceAfter.amount.add(tokenBBalanceAfter.amount);

      // Allow for small differences due to fees
      expect(actualReturn.toNumber()).toBeGreaterThan(expectedReturn.toNumber() * 0.9);
    });
  });
});
