# DEX Solana - Decentralized Exchange

This project is a Next.js application for interacting with a Solana-based DEX (Decentralized Exchange).

## Getting Started

## Getting Started

### Prerequisites

1. Install Phantom Wallet extension in your browser
2. Add Solana tokens (TA and TB) to your wallet
3. Set up a local Solana cluster or use devnet

### Environment Configuration

Copy `.env.local.example` to `.env.local` and set the following variables:

- `NEXT_PUBLIC_DEX_PROGRAM_ID`: Your DEX program ID
- `NEXT_PUBLIC_TOKEN_A_MINT`: Token A mint address
- `NEXT_PUBLIC_TOKEN_B_MINT`: Token B mint address
- `NEXT_PUBLIC_SOLANA_RPC_URL`: Your Solana RPC URL

### Running the Development Server

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Smart Contracts

The Solana DEX implementation is located in the `solana-dex` directory. It uses the Anchor framework and includes:

- DEX program with swap, add/remove liquidity functionality
- Token-2022 based implementation
- Fee structure: 0.3% total (0.1% protocol, 0.2% LPs)

To learn more about the smart contract implementation:

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
