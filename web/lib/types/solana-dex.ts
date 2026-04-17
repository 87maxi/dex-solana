// Generated TypeScript types for Solana DEX program
export const IDL = {
  version: "0.1.0",
  name: "solana_dex",
  instructions: [
    {
      name: "initialize",
      accounts: [
        {
          name: "config",
          isMut: true,
          isSigner: false,
        },
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "owner",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "addLiquidity",
      accounts: [
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lpMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "userTokenA",
          isMut: true,
          isSigner: false,
        },
        {
          name: "userTokenB",
          isMut: true,
          isSigner: false,
        },
        {
          name: "dexTokenA",
          isMut: true,
          isSigner: false,
        },
        {
          name: "dexTokenB",
          isMut: true,
          isSigner: false,
        },
        {
          name: "userLp",
          isMut: true,
          isSigner: false,
        },
        {
          name: "user",
          isMut: false,
          isSigner: true,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "amountA",
          type: "u64",
        },
        {
          name: "amountB",
          type: "u64",
        },
      ],
    },
    {
      name: "swap",
      accounts: [
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "userTokenIn",
          isMut: true,
          isSigner: false,
        },
        {
          name: "userTokenOut",
          isMut: true,
          isSigner: false,
        },
        {
          name: "dexTokenIn",
          isMut: true,
          isSigner: false,
        },
        {
          name: "dexTokenOut",
          isMut: true,
          isSigner: false,
        },
        {
          name: "user",
          isMut: false,
          isSigner: true,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "tokenIn",
          type: "u8",
        },
        {
          name: "amountIn",
          type: "u64",
        },
      ],
    },
    {
      name: "removeLiquidity",
      accounts: [
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lpMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "userTokenA",
          isMut: true,
          isSigner: false,
        },
        {
          name: "userTokenB",
          isMut: true,
          isSigner: false,
        },
        {
          name: "dexTokenA",
          isMut: true,
          isSigner: false,
        },
        {
          name: "dexTokenB",
          isMut: true,
          isSigner: false,
        },
        {
          name: "userLp",
          isMut: true,
          isSigner: false,
        },
        {
          name: "user",
          isMut: false,
          isSigner: true,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "lpAmount",
          type: "u64",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "Config",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            type: "publicKey",
          },
          {
            name: "totalLpSupply",
            type: "u64",
          },
          {
            name: "feeRate",
            type: "u16",
          },
        ],
      },
    },
    {
      name: "Pool",
      type: {
        kind: "struct",
        fields: [
          {
            name: "tokenAReserve",
            type: "u64",
          },
          {
            name: "tokenBReserve",
            type: "u64",
          },
          {
            name: "protocolFeeA",
            type: "u64",
          },
          {
            name: "protocolFeeB",
            type: "u64",
          },
          {
            name: "lpMint",
            type: "publicKey",
          },
          {
            name: "authority",
            type: "publicKey",
          },
        ],
      },
    },
  ],
};
