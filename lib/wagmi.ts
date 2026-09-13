import {
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";

import {
  defineChain,
  http,
} from "viem";

export const robinhoodChain = defineChain({
  id: 4663,

  name: "Robinhood Chain",

  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },

  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RH_RPC_URL ||
          "https://rpc.mainnet.chain.robinhood.com",
      ],
    },
  },

  blockExplorers: {
    default: {
      name: "Robinhood Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },

  testnet: false,
});

const rpcUrl =
  process.env.NEXT_PUBLIC_RH_RPC_URL ||
  "https://rpc.mainnet.chain.robinhood.com";

export const config = getDefaultConfig({
  appName: "Hood Yacht Club",

  projectId:
    process.env
      .NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    "YOUR_WALLETCONNECT_PROJECT_ID",

  chains: [
    robinhoodChain,
  ],

  transports: {
    [robinhoodChain.id]:
      http(rpcUrl),
  },

  ssr: true,
});