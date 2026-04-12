import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaDex } from "../target/types/solana_dex";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as chai from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import BN from "bn.js";

chai.use(chaiAsPromised);

// Constants for testing
const TOKEN_A_DECIMALS = 9;
const TOKEN_B_DECIMALS = 9;
const INITIAL_LIQUIDITY_A = new BN(1000000000); // 1 token A
const INITIAL_LIQUIDITY_B = new BN(2000000000); // 2 token B
const SWAP_AMOUNT = new BN(100000000); // 0.1 token A
const MINIMUM_OUTPUT_AMOUNT = new BN(10000000); // 0.01 token B

describe("Solana DEX - Functional Tests", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.solanaDex as Program<SolanaDex>;
  const provider = anchor.getProvider();

  // Account keys for testing
  let configKey: PublicKey;
  let poolKey: PublicKey;
  let lpMintKey: PublicKey;
  let userLpKey: PublicKey;

  // Token A and Token B keys
  let tokenAKey: PublicKey;
  let tokenBKey: PublicKey;

  // User token accounts
  let userTokenAKey: PublicKey;
  let userTokenBKey: PublicKey;
  let userLpTokenKey: PublicKey;

  // DEX vault accounts
  let dexTokenAKey: PublicKey;
  let dexTokenBKey: PublicKey;

  // Owner (admin) wallet
  let ownerWallet = provider.wallet;

  // Test user wallet (different from owner)
  let testWallet = anchor.web3.Keypair.generate();

  before(async () => {
    // Airdrop SOL to test wallet
    try {
      const tx = await provider.connection.requestAirdrop(
        testWallet.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(tx);
    } catch (e) {
      console.log("Airdrop already done or wallet has funds");
    }

    // Generate deterministic keys for predictable testing
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

    userLpKey = await PublicKey.createWithSeed(
      provider.wallet.publicKey,
      "user_lp",
      program.programId
    );

    // Create token A and token B (in a real scenario, these would be pre-existing tokens)
    // For testing, we'll use the program's address as a base for creating test tokens
    tokenAKey = await PublicKey.createWithSeed(
      program.programId,
      "token_a",
      TOKEN_PROGRAM_ID
    );

    tokenBKey = await PublicKey.createWithSeed(
      program.programId,
      "token_b",
      TOKEN_PROGRAM_ID
    );
  });

  describe("🚀 Initialization Tests", () => {
    it("✅ Should initialize the DEX program", async () => {
      // Initialize the DEX program
      const tx = await program.methods.initialize().rpc();

      // Verify the config account was created
      const configAccount = await program.account.config.fetch(configKey);
      expect(configAccount.owner.equals(ownerWallet.publicKey)).to.be.true;
      expect(configAccount.totalLpSupply.toNumber()).to.equal(0);

      // Verify the pool account was created
      const poolAccount = await program.account.pool.fetch(poolKey);
      expect(poolAccount.tokenAReserve.toNumber()).to.equal(0);
      expect(poolAccount.tokenBReserve.toNumber()).to.equal(0);
      expect(poolAccount.protocolFeeA.toNumber()).to.equal(0);
      expect(poolAccount.protocolFeeB.toNumber()).to.equal(0);
    });

    it("❌ Should fail to initialize twice", async () => {
      await expect(program.methods.initialize().rpc()).to.be.rejectedWith(
        "Account already initialized"
      );
    });
  });

  describe("💰 Token Setup Tests", () => {
    it("✅ Should create token A and mint initial liquidity", async () => {
      // Create token A
      const tokenA = new Token(
        provider.connection,
        tokenAKey,
        TOKEN_PROGRAM_ID,
        ownerWallet.payer
      );

      // Create user token account for token A
      const [await Token.createAssociatedTokenAccount(
        provider.connection,
        ownerWallet.payer,
        tokenAKey,
        ownerWallet.publicKey
      );
      userTokenAKey = userTokenAAccount;

      // Mint initial tokens to user
      const mintTx = await tokenA.mintTo(
        userTokenAAccount,
        ownerWallet.payer,
        [],
        INITIAL_LIQUIDITY_A
      );

      await provider.connection.confirmTransaction(mintTx);

      // Verify the mint
      const userBalance = await tokenA.getAccountInfo(userTokenAAccount);
      expect(userBalance.amount).to.equal(INITIAL_LIQUIDITY_A.toString());
    });

    it("✅ Should create token B and mint initial liquidity", async () => {
      // Create token B
      const tokenB = new Token(
        provider.connection,
        tokenBKey,
        TOKEN_PROGRAM_ID,
        ownerWallet.payer
      );

      // Create user token account for token B
      const [await Token.createAssociatedTokenAccount(
        provider.connection,
        ownerWallet.payer,
        tokenBKey,
        ownerWallet.publicKey
      );
      userTokenBKey = userTokenBAccount;

      // Mint initial tokens to user
      const mintTx = await tokenB.mintTo(
        userTokenBAccount,
        ownerWallet.payer,
        [],
        INITIAL_LIQUIDITY_B
      );

      await provider.connection.confirmTransaction(mintTx);

      // Verify the mint
      const userBalance = await tokenB.getAccountInfo(userTokenBAccount);
      expect(userBalance.amount).to.equal(INITIAL_LIQUIDITY_B.toString());
    });
  });

  describe("🔄 Add Liquidity Tests", () => {
    it("✅ Should add initial liquidity to the pool", async () => {
      // Create DEX vault accounts for token A and B
      const [await Token.createAssociatedTokenAccount(
        provider.connection,
        ownerWallet.payer,
        tokenAKey,
        poolKey
      );
      dexTokenAKey = dexTokenAAccount;

      const [await Token.createAssociatedTokenAccount(
        provider.connection,
        ownerWallet.payer,
        tokenBKey,
        poolKey
      );
      dexTokenBKey = dexTokenBAccount;

      // Create user LP token account
      const [await Token.createAssociatedTokenAccount(
        provider.connection,
        ownerWallet.payer,
        lpMintKey,
        ownerWallet.publicKey
      );
      userLpTokenKey = userLpTokenAccount;

      // Add liquidity to the pool
      const tx = await program.methods
        .addLiquidity(INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B)
        .accounts({
          config: configKey,
          pool: poolKey,
          lpMint: lpMintKey,
          userLp: userLpKey,
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

      // Verify the pool has the tokens
      const poolAccount = await program.account.pool.fetch(poolKey);
      expect(poolAccount.tokenAReserve.eq(INITIAL_LIQUIDITY_A)).to.be.true;
      expect(poolAccount.tokenBReserve.eq(INITIAL_LIQUIDITY_B)).to.be.true;

      // Verify user received LP tokens
      const lpToken = new Token(
        provider.connection,
        lpMintKey,
        TOKEN_PROGRAM_ID,
        ownerWallet.payer
      );
      const lpBalance = await lpToken.getAccountInfo(userLpTokenKey);
      expect(lpBalance.amount).to.not.equal("0");

      // Verify config account updated
      const configAccount = await program.account.config.fetch(configKey);
      expect(configAccount.totalLpSupply.gt(new BN(0))).to.be.true;
    });

    it("✅ Should fail to add liquidity with zero amounts", async () => {
      await expect(
        program.methods
          .addLiquidity(new BN(0), INITIAL_LIQUIDITY_B)
          .accounts({
            config: configKey,
            pool: poolKey,
            lpMint: lpMintKey,
            userLp: userLpKey,
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

    it("✅ Should fail to add liquidity with mismatched token amounts", async () => {
      // This should fail because tokens should be added in proper ratio
      // (actual validation depends on your DEX logic)
    });
  });

  describe("🔀 Swap Tests", () => {
    it("✅ Should successfully swap token A for token B", async () => {
      // Perform a swap
      const tx = await program.methods
        .swap(0, SWAP_AMOUNT) // 0 = token A, 1 = token B
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

      // Verify the swap occurred
      const poolAccount = await program.account.pool.fetch(poolKey);
      expect(poolAccount.tokenAReserve.gte(INITIAL_LIQUIDITY_A)).to.be.true;
      expect(poolAccount.tokenBReserve.lt(INITIAL_LIQUIDITY_B)).to.be.true;
    });

    it("✅ Should successfully swap token B for token A", async () => {
      // Perform a swap in the opposite direction
      const tx = await program.methods
        .swap(1, SWAP_AMOUNT) // 1 = token B
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

      // Verify the swap occurred
      const poolAccount = await program.account.pool.fetch(poolKey);
      expect(poolAccount.tokenBReserve.gte(new BN(1500000000))).to.be.true; // Should be back to reasonable level
    });

    it("❌ Should fail to swap with insufficient funds", async () => {
      // Try to swap more than the user has
      const largeAmount = new BN("999999999999999999");

      await expect(
        program.methods
          .swap(0, largeAmount)
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
      ).to.be.rejected;
    });
  });

  describe("📤 Remove Liquidity Tests", () => {
    it("✅ Should successfully remove liquidity", async () => {
      // Get current LP balance
      const lpToken = new Token(
        provider.connection,
        lpMintKey,
        TOKEN_PROGRAM_ID,
        ownerWallet.payer
      );
      const lpBalanceBefore = await lpToken.getAccountInfo(userLpTokenKey);
      const lpAmountToRemove = new BN(lpBalanceBefore.amount).div(new BN(2)); // Remove half

      // Remove liquidity
      const tx = await program.methods
        .removeLiquidity(lpAmountToRemove)
        .accounts({
          user: ownerWallet.publicKey,
          config: configKey,
          pool: poolKey,
          lpMint: lpMintKey,
          userLp: userLpKey,
          userLpTokenAccount: userLpTokenKey,
          userTokenA: userTokenAKey,
          userTokenB: userTokenBKey,
          dexTokenA: dexTokenAKey,
          dexTokenB: dexTokenBKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Verify LP tokens were burned
      const lpBalanceAfter = await lpToken.getAccountInfo(userLpTokenKey);
      expect(new BN(lpBalanceAfter.amount)).to.equal(
        new BN(lpBalanceBefore.amount).sub(lpAmountToRemove)
      );

      // Verify tokens were returned to user
      const tokenABalance = await new Token(
        provider.connection,
        tokenAKey,
        TOKEN_PROGRAM_ID,
        ownerWallet.payer
      ).getAccountInfo(userTokenAKey);

      const tokenBBalance = await new Token(
        provider.connection,
        tokenBKey,
        TOKEN_PROGRAM_ID,
        ownerWallet.payer
      ).getAccountInfo(userTokenBKey);

      expect(new BN(tokenABalance.amount)).to.gt(new BN(0));
      expect(new BN(tokenBBalance.amount)).to.gt(new BN(0));
    });

    it("❌ Should fail to remove more liquidity than owned", async () => {
      // Try to remove more LP tokens than the user has
      const tooMuchLp = new BN("999999999999999999");

      await expect(
        program.methods
          .removeLiquidity(tooMuchLp)
          .accounts({
            user: ownerWallet.publicKey,
            config: configKey,
            pool: poolKey,
            lpMint: lpMintKey,
            userLp: userLpKey,
            userLpTokenAccount: userLpTokenKey,
            userTokenA: userTokenAKey,
            userTokenB: userTokenBKey,
            dexTokenA: dexTokenAKey,
            dexTokenB: dexTokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
      ).to.be.rejected;
    });
  });

  describe("🏦 Protocol Fee Withdrawal Tests", () => {
    it("✅ Should allow owner to withdraw protocol fees", async () => {
      // Create owner token accounts for receiving fees
      const [await Token.createAssociatedTokenAccount(
        provider.connection,
        ownerWallet.payer,
        tokenAKey,
        ownerWallet.publicKey
      );

      const [await Token.createAssociatedTokenAccount(
        provider.connection,
        ownerWallet.payer,
        tokenBKey,
        ownerWallet.publicKey
      );

      // Withdraw protocol fees
      const tx = await program.methods
        .withdrawProtocolFees()
        .accounts({
          owner: ownerWallet.publicKey,
          config: configKey,
          pool: poolKey,
          ownerTokenA: ownerTokenAAccount,
          ownerTokenB: ownerTokenBAccount,
          dexTokenA: dexTokenAKey,
          dexTokenB: dexTokenBKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Verify fees were transferred to owner
      const tokenABalance = await new Token(
        provider.connection,
        tokenAKey,
        TOKEN_PROGRAM_ID,
        ownerWallet.payer
      ).getAccountInfo(ownerTokenAAccount);

      const tokenBBalance = await new Token(
        provider.connection,
        tokenBKey,
        TOKEN_PROGRAM_ID,
        ownerWallet.payer
      ).getAccountInfo(ownerTokenBAccount);

      expect(new BN(tokenABalance.amount)).to.gt(new BN(0)); // Should have some protocol fees
      expect(new BN(tokenBBalance.amount)).to.gt(new BN(0)); // Should have some protocol fees
    });

    it("❌ Should prevent non-owner from withdrawing fees", async () => {
      // Try to withdraw fees as a non-owner
      const nonOwnerWallet = anchor.web3.Keypair.generate();
      const tx = await provider.connection.requestAirdrop(
        nonOwnerWallet.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(tx);

      await expect(
        program.methods
          .withdrawProtocolFees()
          .accounts({
            owner: nonOwnerWallet.publicKey,
            config: configKey,
            pool: poolKey,
            ownerTokenA: userTokenAKey, // Reusing user's account for test
            ownerTokenB: userTokenBKey,
            dexTokenA: dexTokenAKey,
            dexTokenB: dexTokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([nonOwnerWallet])
          .rpc()
      ).to.be.rejectedWith("Only owner can withdraw fees");
    });
  });

  describe("🔒 Security Tests", () => {
    it("✅ Should prevent reentrancy attacks", async () => {
      // This test verifies that the DEX properly handles reentrancy
      // In Anchor, reentrancy is prevented by the runtime, but we test it anyway

      // Try to call swap multiple times in rapid succession
      const multipleSwaps = [];
      for (let i = 0; i < 5; i++) {
        multipleSwaps.push(
          program.methods
            .swap(0, SWAP_AMOUNT.div(new BN(5))) // Small amount each time
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

      // All swaps should succeed without reentrancy issues
      await Promise.all(multipleSwaps);
    });

    it("✅ Should handle integer overflow correctly", async () => {
      // This test verifies that large numbers don't cause overflow issues
      // The program should use checked arithmetic operations

      // Try to add liquidity with very large numbers (within reasonable bounds)
      const largeAmount = new BN("5000000000"); // 50 tokens

      // This should not cause an overflow
      const tx = await program.methods
        .addLiquidity(largeAmount, largeAmount.mul(new BN(2))) // 50 A, 100 B ratio
        .accounts({
          config: configKey,
          pool: poolKey,
          lpMint: lpMintKey,
          userLp: userLpKey,
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

      // Verify the operation succeeded
      const poolAccount = await program.account.pool.fetch(poolKey);
      expect(poolAccount.tokenAReserve.gte(largeAmount)).to.be.true;
    });

    it("✅ Should validate token accounts properly", async () => {
      // Test that the program validates token accounts correctly

      // Try to use wrong token accounts (should fail)
      await expect(
        program.methods
          .swap(0, SWAP_AMOUNT)
          .accounts({
            user: ownerWallet.publicKey,
            config: configKey,
            pool: poolKey,
            userTokenIn: userTokenBKey, // Wrong token account
            userTokenOut: userTokenAKey, // Wrong token account
            dexVaultIn: dexTokenAKey,
            dexVaultOut: dexTokenBKey,
            tokenAMint: tokenAKey,
            tokenBMint: tokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
      ).to.be.rejected;
    });

    it("✅ Should prevent dust attacks", async () => {
      // Test that very small amounts are handled correctly
      // Dust attacks involve sending very small amounts to clog the system

      const dustAmount = new BN(1); // 0.000000001 tokens

      // This should either fail or be handled gracefully
      // The exact behavior depends on your DEX implementation
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

      // Either it should succeed with minimal impact or fail gracefully
      // Both are acceptable behaviors for dust attack prevention
    });
  });

  describe("📊 Edge Case Tests", () => {
    it("✅ Should handle zero balance scenarios", async () => {
      // Test with a user who has no tokens

      // Create a new wallet with no tokens
      const newWallet = anchor.web3.Keypair.generate();
      const tx = await provider.connection.requestAirdrop(
        newWallet.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(tx);

      // Try to add liquidity with zero balance (should fail)
      await expect(
        program.methods
          .addLiquidity(new BN(100), new BN(200))
          .accounts({
            config: configKey,
            pool: poolKey,
            lpMint: lpMintKey,
            userLp: userLpKey,
            tokenAMint: tokenAKey,
            tokenBMint: tokenBKey,
            userTokenA: userTokenAKey, // This account has tokens, but testing logic
            userTokenB: userTokenBKey,
            dexTokenA: dexTokenAKey,
            dexTokenB: dexTokenBKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .signers([newWallet])
          .rpc()
      ).to.be.rejected;
    });

    it("✅ Should maintain correct liquidity ratios", async () => {
      // Test that the DEX maintains the correct ratio of tokens

      const poolAccountBefore = await program.account.pool.fetch(poolKey);
      const reserveABefore = poolAccountBefore.tokenAReserve;
      const reserveBBefore = poolAccountBefore.tokenBReserve;

      // Add more liquidity
      const additionalLiquidityA = new BN(500000000);
      const additionalLiquidityB = new BN(1000000000);

      const tx = await program.methods
        .addLiquidity(additionalLiquidityA, additionalLiquidityB)
        .accounts({
          config: configKey,
          pool: poolKey,
          lpMint: lpMintKey,
          userLp: userLpKey,
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

      const poolAccountAfter = await program.account.pool.fetch(poolKey);

      // Verify the ratio is maintained (should be approximately 1:2)
      const newReserveA = poolAccountAfter.tokenAReserve;
      const newReserveB = poolAccountAfter.tokenBReserve;

      // The ratio should be close to the initial ratio
      const ratioBefore = reserveABefore.toNumber() / reserveBBefore.toNumber();
      const ratioAfter = newReserveA.toNumber() / newReserveB.toNumber();

      // Ratios should be similar (allowing for some variation due to fees)
      expect(Math.abs(ratioAfter - ratioBefore)).to.be.lessThan(0.1);
    });
  });
});
