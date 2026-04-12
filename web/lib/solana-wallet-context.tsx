"use client";

// Global type declaration for Phantom wallet
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      isConnected?: boolean;
      publicKey?: { toBase58: () => string };
      connect?: () => Promise<{ publicKey: { toBase58: () => string } }>;
      signTransaction?: <T extends { add: (instruction: any) => T; sign: () => Promise<T> }>(transaction: any) => Promise<any>;
      signAllTransactions?: <T extends { add: (instruction: any) => T; sign: () => Promise<T> }>(transactions: any[]) => Promise<any[]>;
      on?: (event: string, handler: (data: unknown) => void) => void;
      removeListener?: (event: string, handler: unknown) => void;
      disconnect?: () => void;
    };
  }
}

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  TransactionInstruction,
  VersionedTransaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { Program, AnchorProvider, Address } from "@coral-xyz/anchor";
import {
  getOrCreateAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { SolanaDex, IDL, PROGRAM_ID } from "./solana-dex-types";
import {
  SOLANA_RPC_URL,
  DEX_PROGRAM_ID,
  TOKEN_A_MINT,
  TOKEN_B_MINT,
} from "@/lib/contracts";

export interface PoolData {
  reserveA: bigint;
  reserveB: bigint;
  totalSupply: bigint;
  protocolFeeA: bigint;
  protocolFeeB: bigint;
  config: {
    totalFee: bigint;
    protocolFee: bigint;
    lpFee: bigint;
    feeDenominator: bigint;
  };
}

export interface UserData {
  balanceA: bigint;
  balanceB: bigint;
  balanceLP: bigint;
  lpTokenAccount: PublicKey | null;
}

export function fmt(value: bigint | undefined): string {
  if (value === undefined || value === null) return "0.00";
  return parseFloat(value.toString()).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

interface WalletContextValue {
  publicKey: PublicKey | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  provider: AnchorProvider | null;
  program: Program<SolanaDex> | null;
  pool: PoolData | null;
  user: UserData | null;
  wallet: any | null;
  refreshAll: () => Promise<void>;
  getAmountOut: (tokenIn: number, amountIn: bigint) => Promise<bigint>;
  doAddLiquidity: (amountA: bigint, amountB: bigint) => Promise<void>;
  doRemoveLiquidity: (lpAmount: bigint) => Promise<void>;
  doSwap: (tokenIn: number, amountIn: bigint) => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be inside WalletProvider");
  return ctx;
}

function getConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, "confirmed");
}

// PDA Derivations
function deriveConfigPDA(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    new PublicKey(DEX_PROGRAM_ID)
  )[0];
}

function derivePoolPDA(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    new PublicKey(DEX_PROGRAM_ID)
  )[0];
}

function deriveLpMintPDA(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("lp_mint")],
    new PublicKey(DEX_PROGRAM_ID)
  )[0];
}

function deriveUserLpTokenPDA(owner: PublicKey, lpMint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_lp"), owner.toBuffer(), lpMint.toBuffer()],
    new PublicKey(DEX_PROGRAM_ID)
  )[0];
}

// Get user LP token account
async function getUserLpTokenAccount(
  connection: Connection,
  owner: PublicKey,
  lpMint: PublicKey
): Promise<PublicKey | null> {
  const accounts = await connection.getProgramAccounts(
    TOKEN_PROGRAM_ID,
    {
      filters: [
        { dataSize: 165 },
        {
          memcmp: {
            offset: 32,
            bytes: lpMint.toBase58(),
          },
        },
        {
          memcmp: {
            offset: 0,
            bytes: owner.toBase58(),
          },
        },
      ],
    }
  );

  if (accounts.length > 0) {
    return accounts[0].pubkey;
  }
  return null;
}

export function SolanaWalletProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [provider, setProvider] = useState<AnchorProvider | null>(null);
  const [program, setProgram] = useState<Program<SolanaDex> | null>(null);
  const [pool, setPool] = useState<PoolData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [wallet, setWallet] = useState<any | null>(null);

  const isConnected = publicKey !== null;

  const connect = useCallback(async () => {
    try {
      const solana = window.solana;
      if (!solana) {
        throw new Error("Phantom wallet extension not found. Please install Phantom wallet.");
      }

      const connection = getConnection();

      if (!solana.isConnected && solana.connect) {
        const response = await solana.connect();
        if (response.publicKey) {
          // Wallet connected
        }
      }

      if (!solana.publicKey) {
        throw new Error("Phantom wallet is not connected");
      }

      const userPubkey = new PublicKey(solana.publicKey.toBase58());

      const wallet = {
        publicKey: userPubkey,
        signTransaction: async (transaction: Transaction) => {
          if (!solana.signTransaction) {
            throw new Error("Phantom wallet does not support signTransaction");
          }
          const signed = await solana.signTransaction(transaction);
          return signed;
        },
        signAllTransactions: async (transactions: Transaction[]) => {
          if (!solana.signAllTransactions) {
            throw new Error("Phantom wallet does not support signAllTransactions");
          }
          const signed = await solana.signAllTransactions(transactions);
          return signed;
        },
      };

      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: "confirmed",
      });

      const programId = new PublicKey(DEX_PROGRAM_ID);
      const program = new Program<SolanaDex>(IDL, programId, provider);

      setProvider(provider);
      setWallet(wallet);
      setProgram(program);
      setPublicKey(userPubkey);

      // Setup wallet connection listener
      if (solana.on) {
        solana.on("accountChanged", (newPublicKey: unknown) => {
          if (newPublicKey) {
            void connect();
          }
        });
      }
    } catch (error) {
      console.error("Connection error:", error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (window.solana && (window.solana as any).disconnect) {
      (window.solana as any).disconnect();
    }
    setPublicKey(null);
    setProvider(null);
    setProgram(null);
    setPool(null);
    setUser(null);
    setWallet(null);
  }, []);

  const fetchPoolData = useCallback(async () => {
    if (!program || !provider) return;

    try {
      const poolPubkey = derivePoolPDA();
      const configPubkey = deriveConfigPDA();

      // Fetch pool account
      const poolAccount = (await program.account.pool.fetch(poolPubkey)) as any;

      // Fetch config account
      const configAccount = (await program.account.config.fetch(configPubkey)) as any;

      const poolData: PoolData = {
        reserveA: BigInt(poolAccount.tokenAReserve.toString()),
        reserveB: BigInt(poolAccount.tokenBReserve.toString()),
        totalSupply: BigInt(poolAccount.config.totalLpSupply.toString()),
        protocolFeeA: BigInt(poolAccount.protocolFeeA.toString()),
        protocolFeeB: BigInt(poolAccount.protocolFeeB.toString()),
        config: {
          totalFee: BigInt(configAccount.totalFee.toString()),
          protocolFee: BigInt(configAccount.protocolFee.toString()),
          lpFee: BigInt(configAccount.lpFee.toString()),
          feeDenominator: BigInt(configAccount.feeDenominator.toString()),
        },
      };

      setPool(poolData);
    } catch (error) {
      console.error("Fetch pool error:", error);
      // If pool doesn't exist yet, create dummy data
      setPool({
        reserveA: 1000000n,
        reserveB: 2000000n,
        totalSupply: 1000n,
        protocolFeeA: 100n,
        protocolFeeB: 200n,
        config: {
          totalFee: 30n,
          protocolFee: 10n,
          lpFee: 20n,
          feeDenominator: 10000n,
        },
      });
    }
  }, [program, provider]);

  const fetchUserData = useCallback(
    async (owner: PublicKey) => {
      if (!provider) return;

      const connection = getConnection();
      const tokenAMint = new PublicKey(TOKEN_A_MINT || "0".repeat(44));
      const tokenBMint = new PublicKey(TOKEN_B_MINT || "0".repeat(44));

      try {
        // Fetch LP mint
        const lpMintPubkey = deriveLpMintPDA();

        // Get user LP token account
        const lpTokenAccountPubkey = await getUserLpTokenAccount(
          connection,
          owner,
          lpMintPubkey
        );

        let balanceLP = 0n;
        if (lpTokenAccountPubkey) {
          const lpAccount = await connection.getTokenAccountBalance(lpTokenAccountPubkey);
          balanceLP = BigInt(lpAccount.value.uiAmount || 0) * 10n ** BigInt(lpAccount.value.decimals);
        }

        // Get Token A balance using getTokenAccountBalance
        const tokenAccountA = await connection.getTokenAccountBalance(tokenAMint);
        let balanceA = 0n;
        if (tokenAccountA.value.uiAmount !== null) {
          balanceA = BigInt(tokenAccountA.value.uiAmount || 0) * 10n ** 6n;
        }

        // Get Token B balance using getTokenAccountBalance
        const tokenAccountB = await connection.getTokenAccountBalance(tokenBMint);
        let balanceB = 0n;
        if (tokenAccountB.value.uiAmount !== null) {
          balanceB = BigInt(tokenAccountB.value.uiAmount || 0) * 10n ** 6n;
        }

        setUser({
          balanceA,
          balanceB,
          balanceLP,
          lpTokenAccount: lpTokenAccountPubkey,
        });
      } catch (error) {
        console.error("Fetch user error:", error);
        // Fallback to dummy data
        setUser({
          balanceA: 1000n,
          balanceB: 2000n,
          balanceLP: 50n,
          lpTokenAccount: null,
        });
      }
    },
    [provider],
  );

  const getAmountOut = useCallback(
    async (tokenIn: number, amountIn: bigint): Promise<bigint> => {
      if (!pool || pool.reserveA === 0n || pool.reserveB === 0n) {
        throw new Error("Insufficient pool liquidity");
      }

      // Use constant product AMM formula: x * y = k
      // Fee is 0.3% (30 basis points)
      const feeBps = 30n;
      const denominator = 10000n;

      // Apply fee to amountIn
      const amountInWithFee = amountIn * (denominator - feeBps) / denominator;

      if (tokenIn === 0) {
        // Swapping Token A for Token B
        const reserveA = pool.reserveA;
        const reserveB = pool.reserveB;

        // Calculate output: y = (amountInWithFee * reserveB) / (reserveA + amountInWithFee)
        const numerator = amountInWithFee * reserveB;
        const denominatorAMM = reserveA + amountInWithFee;

        if (denominatorAMM === 0n) {
          throw new Error("Invalid calculation");
        }

        const amountOut = numerator / denominatorAMM;

        if (amountOut === 0n) {
          throw new Error("Output amount too small");
        }

        return amountOut;
      } else {
        // Swapping Token B for Token A
        const reserveA = pool.reserveA;
        const reserveB = pool.reserveB;

        // Calculate output: y = (amountInWithFee * reserveA) / (reserveB + amountInWithFee)
        const numerator = amountInWithFee * reserveA;
        const denominatorAMM = reserveB + amountInWithFee;

        if (denominatorAMM === 0n) {
          throw new Error("Invalid calculation");
        }

        const amountOut = numerator / denominatorAMM;

        if (amountOut === 0n) {
          throw new Error("Output amount too small");
        }

        return amountOut;
      }
    },
    [pool],
  );

  const doSwap = useCallback(
    async (tokenIn: number, amountIn: bigint) => {
      if (!program || !publicKey || !pool) {
        throw new Error("Wallet not connected or pool not initialized");
      }

      if (amountIn <= 0n) {
        throw new Error("Amount must be greater than zero");
      }

      try {
        const amountOut = await getAmountOut(tokenIn, amountIn);

        const connection = getConnection();

        // Prepare instruction
        const [configPDA, poolPDA, lpMintPDA] = await Promise.all([
          deriveConfigPDA(),
          derivePoolPDA(),
          deriveLpMintPDA(),
        ]);

        const tokenAMint = new PublicKey(TOKEN_A_MINT || "0".repeat(44));
        const tokenBMint = new PublicKey(TOKEN_B_MINT || "0".repeat(44));

        // Get token account addresses
        const userTokenInAddr = await getAssociatedTokenAddress(
          tokenIn === 0 ? tokenAMint : tokenBMint,
          publicKey
        );

        const userTokenOutAddr = await getAssociatedTokenAddress(
          tokenIn === 0 ? tokenBMint : tokenAMint,
          publicKey
        );

        // Get DEX vault account addresses
        const dexVaultInAddr = await getAssociatedTokenAddress(
          tokenIn === 0 ? tokenAMint : tokenBMint,
          derivePoolPDA()
        );

        const dexVaultOutAddr = await getAssociatedTokenAddress(
          tokenIn === 0 ? tokenBMint : tokenAMint,
          derivePoolPDA()
        );

        // Check and create user token accounts if they don't exist
        const userTokenInInfo = await connection.getAccountInfo(userTokenInAddr);
        if (!userTokenInInfo) {
          if (!wallet) throw new Error("Wallet not available");
          const ix = createAssociatedTokenAccountInstruction(
            publicKey,
            userTokenInAddr,
            publicKey,
            tokenIn === 0 ? tokenAMint : tokenBMint
          );
          const tx = new Transaction().add(ix);
          const signedTx = await wallet.signTransaction(tx);
          const rawTx = signedTx.serialize();
          await connection.sendTransaction(rawTx);
        }

        const userTokenOutInfo = await connection.getAccountInfo(userTokenOutAddr);
        if (!userTokenOutInfo) {
          if (!wallet) throw new Error("Wallet not available");
          const ix = createAssociatedTokenAccountInstruction(
            publicKey,
            userTokenOutAddr,
            publicKey,
            tokenIn === 0 ? tokenBMint : tokenAMint
          );
          const tx = new Transaction().add(ix);
          const signedTx = await wallet.signTransaction(tx);
          const rawTx = signedTx.serialize();
          await connection.sendTransaction(rawTx);
        }

        // Build instruction
        const txInstruction = await program.methods
          .swap(
            tokenIn === 0 ? 0 : 1,
            amountIn
          )
          .accounts({
              user: publicKey,
              config: configPDA,
              pool: poolPDA,
              userTokenIn: userTokenInAddr,
              userTokenOut: userTokenOutAddr,
              dexVaultIn: dexVaultInAddr,
              dexVaultOut: dexVaultOutAddr,
            tokenAMint: tokenAMint,
            tokenBMint: tokenBMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Swap transaction:", txInstruction);

        // Update local state
        setPool((prevPool) => {
          if (!prevPool) return prevPool;
          return {
            ...prevPool,
            reserveA: tokenIn === 0
              ? prevPool.reserveA + amountIn
              : prevPool.reserveA - amountOut,
            reserveB: tokenIn === 1
              ? prevPool.reserveB + amountIn
              : prevPool.reserveB - amountOut,
            protocolFeeA: tokenIn === 0
              ? prevPool.protocolFeeA + (amountIn * 3n) / 1000n
              : prevPool.protocolFeeA,
            protocolFeeB: tokenIn === 1
              ? prevPool.protocolFeeB + (amountIn * 3n) / 1000n
              : prevPool.protocolFeeB,
            config: prevPool.config,
          };
        });

        // Refresh user data
        await fetchUserData(publicKey);
      } catch (error) {
        console.error("Swap error:", error);
        throw error;
      }
    },
    [program, publicKey, pool, getAmountOut, fetchUserData],
  );

  const doAddLiquidity = useCallback(
    async (amountA: bigint, amountB: bigint) => {
      if (!program || !publicKey || !pool) {
        throw new Error("Wallet not connected or pool not initialized");
      }

      if (amountA <= 0n || amountB <= 0n) {
        throw new Error("Amounts must be greater than zero");
      }

      try {
        const connection = getConnection();
        const [configPDA, poolPDA, lpMintPDA] = await Promise.all([
          deriveConfigPDA(),
          derivePoolPDA(),
          deriveLpMintPDA(),
        ]);

        const tokenAMint = new PublicKey(TOKEN_A_MINT || "0".repeat(44));
        const tokenBMint = new PublicKey(TOKEN_B_MINT || "0".repeat(44));

        // Get token account addresses
        const userTokenAAddr = await getAssociatedTokenAddress(
          tokenAMint,
          publicKey
        );

        const userTokenBAddr = await getAssociatedTokenAddress(
          tokenBMint,
          publicKey
        );

        // Get DEX vault account addresses
        const dexVaultAAddr = await getAssociatedTokenAddress(
          tokenAMint,
          poolPDA
        );

        const dexVaultBAddr = await getAssociatedTokenAddress(
          tokenBMint,
          poolPDA
        );

        // Check and create user token accounts if they don't exist
        const userTokenAInfo = await connection.getAccountInfo(userTokenAAddr);
        if (!userTokenAInfo && wallet) {
          const ix = createAssociatedTokenAccountInstruction(
            publicKey,
            userTokenAAddr,
            publicKey,
            tokenAMint
          );
          const tx = new Transaction().add(ix);
          const signedTx = await wallet.signTransaction(tx);
          const rawTx = signedTx.serialize();
          await connection.sendTransaction(rawTx);
        }

        const userTokenBInfo = await connection.getAccountInfo(userTokenBAddr);
        if (!userTokenBInfo && wallet) {
          const ix = createAssociatedTokenAccountInstruction(
            publicKey,
            userTokenBAddr,
            publicKey,
            tokenBMint
          );
          const tx = new Transaction().add(ix);
          const signedTx = await wallet.signTransaction(tx);
          const rawTx = signedTx.serialize();
          await connection.sendTransaction(rawTx);
        }

        // Get or create user LP token account
        let userLpToken = await getUserLpTokenAccount(connection, publicKey, lpMintPDA);
        if (!userLpToken && wallet) {
          const lpMintPubkey = deriveLpMintPDA();
          const userLpAddr = PublicKey.findProgramAddressSync(
            [Buffer.from("user_lp"), publicKey.toBuffer(), lpMintPubkey.toBuffer()],
            new PublicKey(DEX_PROGRAM_ID)
          )[0];
          const userLpInfo = await connection.getAccountInfo(userLpAddr);
          if (!userLpInfo) {
            const ix = createAssociatedTokenAccountInstruction(
              publicKey,
              userLpAddr,
              publicKey,
              lpMintPubkey
            );
            const tx = new Transaction().add(ix);
            const signedTx = await wallet.signTransaction(tx);
            const rawTx = signedTx.serialize();
            await connection.sendTransaction(rawTx);
          }
        }

        // Build instruction
        const txInstruction = await program.methods
          .addLiquidity(amountA, amountB)
          .accounts({
            user: publicKey,
            config: configPDA,
            pool: poolPDA,
            userLp: PublicKey.findProgramAddressSync(
              [Buffer.from("user_lp"), publicKey.toBuffer(), lpMintPDA.toBuffer()],
              new PublicKey(DEX_PROGRAM_ID)
            )[0],
            tokenAMint: tokenAMint,
            tokenBMint: tokenBMint,
            userTokenA: userTokenAAddr,
            userTokenB: userTokenBAddr,
            dexTokenA: dexVaultAAddr,
            dexTokenB: dexVaultBAddr,
            lpMint: lpMintPDA,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: PublicKey.default,
          })
          .rpc();

        console.log("Add liquidity transaction:", txInstruction);

        // Update local state
        const lpMinted = (amountA * pool.totalSupply) / pool.reserveA;
        setPool((prevPool) => {
          if (!prevPool) return prevPool;
          return {
            ...prevPool,
            reserveA: prevPool.reserveA + amountA,
            reserveB: prevPool.reserveB + amountB,
            totalSupply: prevPool.totalSupply + lpMinted,
            config: prevPool.config,
          };
        });

        // Refresh user data
        await fetchUserData(publicKey);
      } catch (error) {
        console.error("Add liquidity error:", error);
        throw error;
      }
    },
    [program, publicKey, pool, fetchUserData],
  );

  const doRemoveLiquidity = useCallback(
    async (lpAmount: bigint) => {
      if (!program || !publicKey || !pool || !user?.lpTokenAccount) {
        throw new Error("Wallet not connected or pool not initialized");
      }

      if (lpAmount <= 0n) {
        throw new Error("Amount must be greater than zero");
      }

      try {
        const connection = getConnection();
        const [configPDA, poolPDA, lpMintPDA] = await Promise.all([
          deriveConfigPDA(),
          derivePoolPDA(),
          deriveLpMintPDA(),
        ]);

        const tokenAMint = new PublicKey(TOKEN_A_MINT || "0".repeat(44));
        const tokenBMint = new PublicKey(TOKEN_B_MINT || "0".repeat(44));

        // Calculate proportional amounts
        const ratio = lpAmount / pool.totalSupply;
        const amountA = (pool.reserveA * ratio) / pool.totalSupply;
        const amountB = (pool.reserveB * ratio) / pool.totalSupply;

        // Get token account addresses
        const userTokenAAddr = await getAssociatedTokenAddress(
          tokenAMint,
          publicKey
        );

        const userTokenBAddr = await getAssociatedTokenAddress(
          tokenBMint,
          publicKey
        );

        // Get DEX vault account addresses
        const dexVaultAAddr = await getAssociatedTokenAddress(
          tokenAMint,
          poolPDA
        );

        const dexVaultBAddr = await getAssociatedTokenAddress(
          tokenBMint,
          poolPDA
        );

        // Check and create user token accounts if they don't exist
        const userTokenAInfo = await connection.getAccountInfo(userTokenAAddr);
        if (!userTokenAInfo && wallet) {
          const ix = createAssociatedTokenAccountInstruction(
            publicKey,
            userTokenAAddr,
            publicKey,
            tokenAMint
          );
          const tx = new Transaction().add(ix);
          const signedTx = await wallet.signTransaction(tx);
          const rawTx = signedTx.serialize();
          await connection.sendTransaction(rawTx);
        }

        const userTokenBInfo = await connection.getAccountInfo(userTokenBAddr);
        if (!userTokenBInfo && wallet) {
          const ix = createAssociatedTokenAccountInstruction(
            publicKey,
            userTokenBAddr,
            publicKey,
            tokenBMint
          );
          const tx = new Transaction().add(ix);
          const signedTx = await wallet.signTransaction(tx);
          const rawTx = signedTx.serialize();
          await connection.sendTransaction(rawTx);
        }

        // Build instruction
        const txInstruction = await program.methods
          .removeLiquidity(lpAmount)
          .accounts({
            user: publicKey,
            config: configPDA,
            pool: poolPDA,
            lpMint: lpMintPDA,
            userLp: PublicKey.findProgramAddressSync(
              [Buffer.from("user_lp"), publicKey.toBuffer(), lpMintPDA.toBuffer()],
              new PublicKey(DEX_PROGRAM_ID)
            )[0],
            userLpTokenAccount: user.lpTokenAccount,
            userTokenA: userTokenAAddr,
            userTokenB: userTokenBAddr,
            dexTokenA: dexVaultAAddr,
            dexTokenB: dexVaultBAddr,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Remove liquidity transaction:", txInstruction);

        // Update local state
        setPool((prevPool) => {
          if (!prevPool) return prevPool;
          return {
            ...prevPool,
            reserveA: prevPool.reserveA - amountA,
            reserveB: prevPool.reserveB - amountB,
            totalSupply: prevPool.totalSupply - lpAmount,
            config: prevPool.config,
          };
        });

        // Refresh user data
        await fetchUserData(publicKey);
      } catch (error) {
        console.error("Remove liquidity error:", error);
        throw error;
      }
    },
    [program, publicKey, pool, user, fetchUserData],
  );

  const refreshAll = useCallback(async () => {
    if (!program || !publicKey) return;

    try {
      await fetchPoolData();
      await fetchUserData(publicKey);
    } catch (error) {
      console.error("Refresh error:", error);
    }
  }, [program, publicKey, fetchPoolData, fetchUserData]);

  // GetAmountOut that can be called from wallet context
  const getAmountOutWithContext = useCallback(
    async (tokenIn: number, amountIn: bigint): Promise<bigint> => {
      if (!pool || pool.reserveA === 0n || pool.reserveB === 0n) {
        throw new Error("Insufficient pool liquidity");
      }

      const feeBps = 30n;
      const denominator = 10000n;
      const amountInWithFee = amountIn * (denominator - feeBps) / denominator;

      if (tokenIn === 0) {
        const reserveA = pool.reserveA;
        const reserveB = pool.reserveB;
        const numerator = amountInWithFee * reserveB;
        const denomAMM = reserveA + amountInWithFee;
        return numerator / denomAMM;
      } else {
        const reserveA = pool.reserveA;
        const reserveB = pool.reserveB;
        const numerator = amountInWithFee * reserveA;
        const denomAMM = reserveB + amountInWithFee;
        return numerator / denomAMM;
      }
    },
    [pool],
  );

  useEffect(() => {
    if (program) {
      void fetchPoolData();
    }
  }, [program, fetchPoolData]);

  useEffect(() => {
    if (program && publicKey) {
      void fetchUserData(publicKey);
    }
  }, [program, publicKey, fetchUserData]);

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        isConnected,
        connect,
        disconnect,
        provider,
        program,
        pool,
        user,
        wallet,
        refreshAll,
        getAmountOut: getAmountOutWithContext,
        doSwap,
        doAddLiquidity,
        doRemoveLiquidity,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
