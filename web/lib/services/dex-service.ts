import { PublicKey, Connection } from "@solana/web3.js";
import { WalletAdapter } from "@solana/wallet-adapter-base";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  TokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
} from "@solana/spl-token";
import { IDL } from "@/lib/types/solana-dex";

export class DEXService {
  static async solanaSwap(
    wallet: WalletAdapter,
    connection: Connection,
    amount: bigint,
    tokenInIsA: boolean,
  ): Promise<string> {
    try {
      // Create provider
      const provider = new AnchorProvider(connection, wallet, {});

      // Create program instance
      const program = new Program(IDL, provider);

      // Get program address (this should match the one in your Anchor.toml)
      const programId = new PublicKey(
        "5p8iy2yZWb4xjHj17AAoZwAFzFY4Zh4c2e3dV32uRRH3",
      );

      // In a real implementation, these would be fetched from the program state
      // For now, these are placeholders
      const poolAddress = PublicKey.findProgramAddressSync(
        [
          Buffer.from("pool"),
          new PublicKey("TokenA_Mint_Address").toBytes(),
          new PublicKey("TokenB_Mint_Address").toBytes()
        ],
        programId
      )[0];

      // In a real implementation, these would be fetched from the program state
      const userTokenIn = new PublicKey("..."); // Should be fetched from wallet
      const userTokenOut = new PublicKey("..."); // Should be fetched from wallet
      const dexTokenIn = new PublicKey("..."); // Should be fetched from program
      const dexTokenOut = new PublicKey("..."); // Should be fetched from program

      // Create transaction
      const tx = await program.methods
        .swap(tokenInIsA ? 0 : 1, amount)
        .accounts({
          pool: poolAddress,
          userTokenIn,
          userTokenOut,
          dexTokenIn,
          dexTokenOut,
          user: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([])
        .rpc();

      return tx;
    } catch (error) {
      console.error("Swap error:", error);
      throw error;
    }
  }

  static async solanaAddLiquidity(
    wallet: WalletAdapter,
    connection: Connection,
    amountA: bigint,
    amountB: bigint,
  ): Promise<string> {
    try {
      const provider = new AnchorProvider(connection, wallet, {});
      const program = new Program(IDL, provider);

      const programId = new PublicKey(
        "5p8iy2yZWb4xjHj17AAoZwAFzFY4Zh4c2e3dV32uRRH3",
      );

      // In a real implementation, these would be properly fetched from the program
      const poolAddress = PublicKey.findProgramAddressSync(
        [
          Buffer.from("pool"),
          new PublicKey("TokenA_Mint_Address").toBytes(),
          new PublicKey("TokenB_Mint_Address").toBytes()
        ],
        programId
      )[0];

      const lpMint = new PublicKey("..."); // LP token mint
      const userTokenA = new PublicKey("..."); // User's token A account
      const userTokenB = new PublicKey("..."); // User's token B account
      const dexTokenA = new PublicKey("..."); // DEX token A vault
      const dexTokenB = new PublicKey("..."); // DEX token B vault
      const userLp = new PublicKey("..."); // User's LP token account

      const tx = await program.methods
        .addLiquidity(amountA, amountB)
        .accounts({
          pool: poolAddress,
          lpMint,
          userTokenA,
          userTokenB,
          dexTokenA,
          dexTokenB,
          userLp,
          user: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([])
        .rpc();

      return tx;
    } catch (error) {
      console.error("Add liquidity error:", error);
      throw error;
    }
  }

  static async solanaRemoveLiquidity(
    wallet: WalletAdapter,
    connection: Connection,
    lpAmount: bigint,
  ): Promise<string> {
    try {
      const provider = new AnchorProvider(connection, wallet, {});
      const program = new Program(IDL, provider);

      const programId = new PublicKey(
        "5p8iy2yZWb4xjHj17AAoZwAFzFY4Zh4c2e3dV32uRRH3",
      );

      // In a real implementation, these would be properly fetched from the program
      const poolAddress = PublicKey.findProgramAddressSync(
        [
          Buffer.from("pool"),
          new PublicKey("TokenA_Mint_Address").toBytes(),
          new PublicKey("TokenB_Mint_Address").toBytes()
        ],
        programId
      )[0];

      const lpMint = new PublicKey("..."); // LP token mint
      const userTokenA = new PublicKey("..."); // User's token A account
      const userTokenB = new PublicKey("..."); // User's token B account
      const dexTokenA = new PublicKey("..."); // DEX token A vault
      const dexTokenB = new PublicKey("..."); // DEX token B vault
      const userLp = new PublicKey("..."); // User's LP token account

      const tx = await program.methods
        .removeLiquidity(lpAmount)
        .accounts({
          pool: poolAddress,
          lpMint,
          userTokenA,
          userTokenB,
          dexTokenA,
          dexTokenB,
          userLp,
          user: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([])
        .rpc();

      return tx;
    } catch (error) {
      console.error("Remove liquidity error:", error);
      throw error;
    }
  }
}
```
<tool_call>
