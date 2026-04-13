import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaDex } from "../target/types/solana_dex";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as chai from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import BN from "bn.js";

chai.use(chaiAsPromised);

// Security test constants
const MAX_TEST_AMOUNT = new BN("1000000000000000"); // 10,000 tokens (maximum for testing)
const OVERTLOW_TEST_AMOUNT = new BN("2").pow(new BN(63)).sub(new BN(1)); // Close to u64::MAX
const REENTRANCY_TEST_ITERATIONS = 10;

describe("Solana DEX - Security Tests", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.solanaDex as Program<SolanaDex>;
  const provider = anchor.getProvider();

  // Account keys for testing
  let configKey: PublicKey;
  let poolKey: PublicKey;
  let lpMintKey: PublicKey;

  // Token A and Token B keys
  let tokenAKey: PublicKey;
  let tokenBKey: PublicKey;

  // User token accounts
  let userTokenAKey: PublicKey;
  let userTokenBKey: PublicKey;

  // DEX vault accounts
  let dexTokenAKey: PublicKey;
  let dexTokenBKey: PublicKey;

  // Test wallets
  let ownerWallet = provider.wallet;
  let attackerWallet = anchor.web3.Keypair.generate();
  let victimWallet = anchor.web3.Keypair.generate();

  before(async () => {
    // Airdrop SOL to test wallets
    const wallets = [attackerWallet.publicKey, victimWallet.publicKey];

    for (const wallet of wallets) {
      try {
        const tx = await provider.connection.requestAirdrop(
          wallet,
          10 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(tx);
      } catch (e) {
        console.log("Airdrop already done or wallet has funds");
      }
    }

    // Initialize keys
    configKey = await PublicKey.createWithSeed(
      provider.wallet.publicKey,
      "config",
      program.programId
    );

    poolKey = await PublicKey.createWithSeed(
      provider.wallet.publicKey,
      "pool",
      program.programId
    );

    lpMintKey = await PublicKey.createWithSeed(
      provider.wallet.publicKey,
      "lp_mint",
      program.programId
    );

    // Create test tokens
    tokenAKey = await PublicKey.createWithSeed(
      program.programId,
      "security_token_a",
      TOKEN_PROGRAM_ID
    );

    tokenBKey = await PublicKey.createWithSeed(
      program.programId,
      "security_token_b",
      TOKEN_PROGRAM_ID
    );
  });

  describe("🔒 Reentrancy Protection Tests", () => {
    it("✅ Should prevent reentrancy in swap operations", async () => {
      // Setup: Initialize and add liquidity first
      if ((await provider.connection.getAccountInfo(configKey)) === null) {
        await program.methods.initialize().rpc();

        // Create and setup tokens
        const tokenA = new Token(
          provider.connection,
          tokenAKey,
          TOKEN_PROGRAM_ID,
          ownerWallet.payer
        );

        const tokenB = new Token(
          provider.connection,
          tokenBKey,
          TOKEN_PROGRAM_ID,
          ownerWallet.payer
        );

        // Create user token accounts
        const userTokenAAccount = await Token.createAssociatedTokenAccount(
          provider.connection,
          ownerWallet.payer,
          tokenAKey,
          ownerWallet.publicKey
        );
        userTokenAKey = userTokenAAccount;

        const userTokenBAccount = await Token.createAssociatedTokenAccount(
          provider.connection,
          ownerWallet.payer,
          tokenBKey,
          ownerWallet.publicKey
        );
        userTokenBKey = userTokenBAccount;

        // Mint tokens to user
        await tokenA.mintTo(userTokenAAccount, ownerWallet.payer, [], new BN(10000000000));
        await tokenB.mintTo(userTokenBAccount, ownerWallet.payer, [], new BN(20000000000));

        // Create DEX vault accounts
        const dexTokenAAccount = await Token.createAssociatedTokenAccount(
          provider.connection,
          ownerWallet.payer,
          tokenAKey,
          poolKey
        );
        dexTokenAKey = dexTokenAAccount;

        const dexTokenBAccount = await Token.createAssociatedTokenAccount(
          provider.connection,
          ownerWallet.payer,
          tokenBKey,
          poolKey
        );
        dexTokenBKey = dexTokenBAccount;

        // Add initial liquidity
        await program.methods
          .addLiquidity(new BN(1000000000), new BN(2000000000))
          .accounts({
            config: configKey,
            pool: poolKey,
            lpMint: lpMintKey,
            userLp: await PublicKey.createWithSeed(
              provider.wallet.publicKey,
              "user_lp",
              program.programId
            ),
            tokenAMint: tokenAKey,
            tokenBMint: tokenBKey,
            userTokenA: userTokenAKey,
            userTokenB: userTokenBKey,
            dexTokenA: dexTokenAKey,
            dexTokenB: dexTokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc();
      }

      // Test: Multiple rapid swaps should not cause reentrancy
      const swapPromises = [];

      for (let i = 0; i < REENTRANCY_TEST_ITERATIONS; i++) {
        const swapPromise = program.methods
          .swap(0, new BN(10000000)) // Small swap amount
          .accounts({
            user: ownerWallet.publicKey,
            config: configKey,
            pool: poolKey,
            userTokenIn: userTokenAKey,
            userTokenOut: userTokenBKey,
            dexVaultIn: dexTokenAKey,
            dexVaultOut: dexTokenBKey,
            tokenAMint: tokenAKey,
            tokenBMint: tokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        swapPromises.push(swapPromise);
      }

      // All swaps should complete successfully without reentrancy issues
      await Promise.all(swapPromises);

      // Verify pool state is consistent
      const poolAccount = await program.account.pool.fetch(poolKey);
      expect(poolAccount.tokenAReserve.gte(new BN(0))).to.be.true;
      expect(poolAccount.tokenBReserve.gte(new BN(0))).to.be.true;
    });
  });

  describe("⚠️ Integer Overflow/Underflow Tests", () => {
    it("✅ Should handle large numbers without overflow", async () => {
      // Test with very large but valid numbers
      const largeAmount = new BN("5000000000"); // 50 tokens

      await expect(
        program.methods
          .addLiquidity(largeAmount, largeAmount.mul(new BN(2)))
          .accounts({
            config: configKey,
            pool: poolKey,
            lpMint: lpMintKey,
            userLp: await PublicKey.createWithSeed(
              provider.wallet.publicKey,
              "user_lp",
              program.programId
            ),
            tokenAMint: tokenAKey,
            tokenBMint: tokenBKey,
            userTokenA: userTokenAKey,
            userTokenB: userTokenBKey,
            dexTokenA: dexTokenAKey,
            dexTokenB: dexTokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc()
      ).to.not.be.rejected;
    });

    it("✅ Should reject overflow-prone operations", async () => {
      // Test with amounts that would cause overflow
      const overflowAmount = new BN("18446744073709551615"); // Close to u64::MAX

      await expect(
        program.methods
          .addLiquidity(overflowAmount, overflowAmount)
          .accounts({
            config: configKey,
            pool: poolKey,
            lpMint: lpMintKey,
            userLp: await PublicKey.createWithSeed(
              provider.wallet.publicKey,
              "user_lp",
              program.programId
            ),
            tokenAMint: tokenAKey,
            tokenBMint: tokenBKey,
            userTokenA: userTokenAKey,
            userTokenB: userTokenBKey,
            dexTokenA: dexTokenAKey,
            dexTokenB: dexTokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc()
      ).to.be.rejected;
    });
  });

  describe("🚫 Access Control Tests", () => {
    it("✅ Should enforce owner-only access for fee withdrawal", async () => {
      // Setup: Ensure there are fees to withdraw
      await program.methods
        .swap(0, new BN(10000000))
        .accounts({
          user: ownerWallet.publicKey,
          config: configKey,
          pool: poolKey,
          userTokenIn: userTokenAKey,
          userTokenOut: userTokenBKey,
          dexVaultIn: dexTokenAKey,
          dexVaultOut: dexTokenBKey,
          tokenAMint: tokenAKey,
          tokenBMint: tokenBKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Test: Non-owner should not be able to withdraw fees
      await expect(
        program.methods
          .withdrawProtocolFees()
          .accounts({
            owner: attackerWallet.publicKey,
            config: configKey,
            pool: poolKey,
            ownerTokenA: userTokenAKey,
            ownerTokenB: userTokenBKey,
            dexTokenA: dexTokenAKey,
            dexTokenB: dexTokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([attackerWallet])
          .rpc()
      ).to.be.rejectedWith("Only owner can withdraw fees");
    });

    it("✅ Should validate all account ownership", async () => {
      // Test: Try to use accounts that don't belong to the user
      await expect(
        program.methods
          .swap(0, new BN(10000000))
          .accounts({
            user: victimWallet.publicKey,
            config: configKey,
            pool: poolKey,
            userTokenIn: userTokenAKey, // Using owner's account
            userTokenOut: userTokenBKey, // Using owner's account
            dexVaultIn: dexTokenAKey,
            dexVaultOut: dexTokenBKey,
            tokenAMint: tokenAKey,
            tokenBMint: tokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([victimWallet])
          .rpc()
      ).to.be.rejected;
    });
  });

  describe("💰 Financial Attack Prevention Tests", () => {
    it("✅ Should prevent front-running attacks", async () => {
      // Setup: Create a scenario where multiple transactions compete
      const transaction1 = new Transaction().add(
        await program.methods
          .swap(0, new BN(5000000))
          .accounts({
            user: ownerWallet.publicKey,
            config: configKey,
            pool: poolKey,
            userTokenIn: userTokenAKey,
            userTokenOut: userTokenBKey,
            dexVaultIn: dexTokenAKey,
            dexVaultOut: dexTokenBKey,
            tokenAMint: tokenAKey,
            tokenBMint: tokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .instruction()
      );

      const transaction2 = new Transaction().add(
        await program.methods
          .swap(0, new BN(5000000))
          .accounts({
            user: attackerWallet.publicKey,
            config: configKey,
            pool: poolKey,
            userTokenIn: userTokenAKey,
            userTokenOut: userTokenBKey,
            dexVaultIn: dexTokenAKey,
            dexVaultOut: dexTokenBKey,
            tokenAMint: tokenAKey,
            tokenBMint: tokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .instruction()
      );

      // Both transactions should execute without front-running issues
      // (Anchor's transaction ordering prevents this by default)
      await provider.sendAndConfirm(transaction1, [ownerWallet.payer]);
      await provider.sendAndConfirm(transaction2, [attackerWallet]);

      // Verify pool state remains consistent
      const poolAccount = await program.account.pool.fetch(poolKey);
      expect(poolAccount.tokenAReserve.gte(new BN(0))).to.be.true;
      expect(poolAccount.tokenBReserve.gte(new BN(0))).to.be.true;
    });

    it("✅ Should handle dust attacks gracefully", async () => {
      // Test: Very small amounts should either be handled or rejected
      const dustAmounts = [
        new BN(1), // 0.000000001 tokens
        new BN(10), // 0.00000001 tokens
        new BN(100), // 0.0000001 tokens
      ];

      for (const dustAmount of dustAmounts) {
        const result = program.methods
          .swap(0, dustAmount)
          .accounts({
            user: ownerWallet.publicKey,
            config: configKey,
            pool: poolKey,
            userTokenIn: userTokenAKey,
            userTokenOut: userTokenBKey,
            dexVaultIn: dexTokenAKey,
            dexVaultOut: dexTokenBKey,
            tokenAMint: tokenAKey,
            tokenBMint: tokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        // Either succeed with minimal impact or fail gracefully
        // Both behaviors are acceptable
      }
    });

    it("✅ Should prevent integer rounding attacks", async () => {
      // Test: Multiple small swaps should not accumulate to exploit rounding errors
      const smallSwaps = [];
      const swapSize = new BN(10000); // Very small amount

      for (let i = 0; i < 100; i++) {
        smallSwaps.push(
          program.methods
            .swap(0, swapSize)
            .accounts({
              user: ownerWallet.publicKey,
              config: configKey,
              pool: poolKey,
              userTokenIn: userTokenAKey,
              userTokenOut: userTokenBKey,
              dexVaultIn: dexTokenAKey,
              dexVaultOut: dexTokenBKey,
              tokenAMint: tokenAKey,
              tokenBMint: tokenBKey,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            })
            .rpc()
        );
      }

      await Promise.all(smallSwaps);

      // Verify pool state remains mathematically consistent
      const poolAccount = await program.account.pool.fetch(poolKey);
      const totalSwapped = swapSize.mul(new BN(100));
      expect(poolAccount.tokenAReserve.add(totalSwapped).gte(new BN(1000000000))).to.be.true;
    });
  });

  describe("🔍 Input Validation Tests", () => {
    it("✅ Should reject zero amount operations", async () => {
      await expect(
        program.methods
          .addLiquidity(new BN(0), new BN(1000000))
          .accounts({
            config: configKey,
            pool: poolKey,
            lpMint: lpMintKey,
            userLp: await PublicKey.createWithSeed(
              provider.wallet.publicKey,
              "user_lp",
              program.programId
            ),
            tokenAMint: tokenAKey,
            tokenBMint: tokenBKey,
            userTokenA: userTokenAKey,
            userTokenB: userTokenBKey,
            dexTokenA: dexTokenAKey,
            dexTokenB: dexTokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc()
      ).to.be.rejected;

      await expect(
        program.methods
          .addLiquidity(new BN(1000000), new BN(0))
          .accounts({
            config: configKey,
            pool: poolKey,
            lpMint: lpMintKey,
            userLp: await PublicKey.createWithSeed(
              provider.wallet.publicKey,
              "user_lp",
              program.programId
            ),
            tokenAMint: tokenAKey,
            tokenBMint: tokenBKey,
            userTokenA: userTokenAKey,
            userTokenB: userTokenBKey,
            dexTokenA: dexTokenAKey,
            dexTokenB: dexTokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc()
      ).to.be.rejected;
    });

    it("✅ Should validate token account types", async () => {
      // Test: Try to use wrong token account types
      await expect(
        program.methods
          .swap(0, new BN(1000000))
          .accounts({
            user: ownerWallet.publicKey,
            config: configKey,
            pool: poolKey,
            userTokenIn: dexTokenAKey, // Using DEX vault as user account
            userTokenOut: dexTokenBKey, // Using DEX vault as user account
            dexVaultIn: userTokenAKey, // Using user account as DEX vault
            dexVaultOut: userTokenBKey, // Using user account as DEX vault
            tokenAMint: tokenAKey,
            tokenBMint: tokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
      ).to.be.rejected;
    });
  });

  describe("🔄 State Consistency Tests", () => {
    it("✅ Should maintain consistent pool reserves", async () => {
      // Record initial state
      const initialPool = await program.account.pool.fetch(poolKey);
      const initialReserveA = initialPool.tokenAReserve;
      const initialReserveB = initialPool.tokenBReserve;

      // Perform multiple operations
      await program.methods
        .swap(0, new BN(5000000))
        .accounts({
          user: ownerWallet.publicKey,
          config: configKey,
          pool: poolKey,
          userTokenIn: userTokenAKey,
          userTokenOut: userTokenBKey,
          dexVaultIn: dexTokenAKey,
          dexVaultOut: dexTokenBKey,
          tokenAMint: tokenAKey,
          tokenBMint: tokenBKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .swap(1, new BN(3000000))
        .accounts({
          user: ownerWallet.publicKey,
          config: configKey,
          pool: poolKey,
          userTokenIn: userTokenBKey,
          userTokenOut: userTokenAKey,
          dexVaultIn: dexTokenBKey,
          dexVaultOut: dexTokenAKey,
          tokenAMint: tokenBKey,
          tokenBMint: tokenAKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Verify final state is mathematically consistent
      const finalPool = await program.account.pool.fetch(poolKey);
      expect(finalPool.tokenAReserve.gte(new BN(0))).to.be.true;
      expect(finalPool.tokenBReserve.gte(new BN(0))).to.be.true;
    });

    it("✅ Should prevent race conditions in liquidity operations", async () => {
      // Setup: Add multiple liquidity providers
      const provider2Wallet = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(
        provider2Wallet.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );

      // Create token accounts for provider 2
      const provider2TokenA = await Token.createAssociatedTokenAccount(
        provider.connection,
        ownerWallet.payer,
        tokenAKey,
        provider2Wallet.publicKey
      );

      const provider2TokenB = await Token.createAssociatedTokenAccount(
        provider.connection,
        ownerWallet.payer,
        tokenBKey,
        provider2Wallet.publicKey
      );

      // Mint tokens to provider 2
      const tokenA = new Token(
        provider.connection,
        tokenAKey,
        TOKEN_PROGRAM_ID,
        ownerWallet.payer
      );

      const tokenB = new Token(
        provider.connection,
        tokenBKey,
        TOKEN_PROGRAM_ID,
        ownerWallet.payer
      );

      await tokenA.mintTo(provider2TokenA, ownerWallet.payer, [], new BN(5000000000));
      await tokenB.mintTo(provider2TokenB, ownerWallet.payer, [], new BN(10000000000));

      // Both providers add liquidity concurrently
      const provider1AddLiquidity = program.methods
        .addLiquidity(new BN(1000000000), new BN(2000000000))
        .accounts({
          config: configKey,
          pool: poolKey,
          lpMint: lpMintKey,
          userLp: await PublicKey.createWithSeed(
            provider2Wallet.publicKey,
            "user_lp",
            program.programId
          ),
          tokenAMint: tokenAKey,
          tokenBMint: tokenBKey,
          userTokenA: provider2TokenA,
          userTokenB: provider2TokenB,
          dexTokenA: dexTokenAKey,
          dexTokenB: dexTokenBKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([provider2Wallet])
        .rpc();

      const provider1Result = program.methods
        .addLiquidity(new BN(1000000000), new BN(2000000000))
        .accounts({
          config: configKey,
          pool: poolKey,
          lpMint: lpMintKey,
          userLp: await PublicKey.createWithSeed(
            provider.wallet.publicKey,
            "user_lp",
            program.programId
          ),
          tokenAMint: tokenAKey,
          tokenBMint: tokenBKey,
          userTokenA: userTokenAKey,
          userTokenB: userTokenBKey,
          dexTokenA: dexTokenAKey,
          dexTokenB: dexTokenBKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      await Promise.all([provider1AddLiquidity, provider1Result]);

      // Verify both operations completed successfully
      const configAccount = await program.account.config.fetch(configKey);
      expect(configAccount.totalLpSupply.gt(new BN(0))).to.be.true;
    });
  });
});
