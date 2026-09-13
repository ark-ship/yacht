import type { Abi } from "viem";

/* ============================================================
   NETWORK
============================================================ */

export const ROBINHOOD_CHAIN_ID = 4663 as const;

/* ============================================================
   CONTRACT ADDRESSES
============================================================ */

export const NFT_CONTRACT =
  "0x26e3214e112ea2A6548eB40BDFc316217d0E80BD" as const;

export const HYC_STAKING_CONTRACT =
  "0x98526AD6Bf1037f5EB64Ea21c546f72BE904d167" as const;

export const YACHT_CONTRACT =
  "0xE8c2F38e3171A0B1B782f8a933D0C36dAFf83Bc3" as const;

/* ============================================================
   ERC721 ABI
============================================================ */

export const erc721Abi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
  },

  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
  },

  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      {
        name: "owner",
        type: "address",
      },
      {
        name: "operator",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
  },

  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "operator",
        type: "address",
      },
      {
        name: "approved",
        type: "bool",
      },
    ],
    outputs: [],
  },

  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      {
        name: "owner",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
] as const satisfies Abi;

/* ============================================================
   ERC20 ABI
============================================================ */

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      {
        name: "account",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },

  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
  },

  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
      },
    ],
  },

  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
] as const satisfies Abi;

/* ============================================================
   STAKING ABI
============================================================ */

export const stakingAbi = [
  {
    type: "function",
    name: "stake",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
      {
        name: "durationOption",
        type: "uint8",
      },
    ],
    outputs: [],
  },

  {
    type: "function",
    name: "stakeBatch",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "tokenIds",
        type: "uint256[]",
      },
      {
        name: "durationOption",
        type: "uint8",
      },
    ],
    outputs: [],
  },

  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    outputs: [],
  },

  {
    type: "function",
    name: "unstake",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    outputs: [],
  },

  {
    type: "function",
    name: "getStakedTokens",
    stateMutability: "view",
    inputs: [
      {
        name: "user",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256[]",
      },
    ],
  },

  {
    type: "function",
    name: "stakedCount",
    stateMutability: "view",
    inputs: [
      {
        name: "user",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },

  {
    type: "function",
    name: "isStaked",
    stateMutability: "view",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
  },

  {
    type: "function",
    name: "pendingReward",
    stateMutability: "view",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },

  {
    type: "function",
    name: "rewardPoolBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },

  {
    type: "function",
    name: "availableRewards",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },

  {
    type: "function",
    name: "totalStakes",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },

  {
    type: "function",
    name: "reservedRewards",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },

  {
    type: "function",
    name: "rewardToken",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
  },

  {
    type: "function",
    name: "rewardTokenInitialized",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
  },

  {
    type: "function",
    name: "durationSeconds",
    stateMutability: "view",
    inputs: [
      {
        name: "durationOption",
        type: "uint8",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },

  {
    type: "function",
    name: "rewardPerDay",
    stateMutability: "view",
    inputs: [
      {
        name: "durationOption",
        type: "uint8",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },

  {
    type: "function",
    name: "totalRewardForDuration",
    stateMutability: "view",
    inputs: [
      {
        name: "durationOption",
        type: "uint8",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },

  {
    type: "function",
    name: "stakes",
    stateMutability: "view",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "owner",
        type: "address",
      },
      {
        name: "startedAt",
        type: "uint256",
      },
      {
        name: "lastClaimAt",
        type: "uint256",
      },
      {
        name: "unlockAt",
        type: "uint256",
      },
      {
        name: "durationOption",
        type: "uint8",
      },
      {
        name: "rewardPerDay",
        type: "uint256",
      },
      {
        name: "totalReward",
        type: "uint256",
      },
      {
        name: "claimedReward",
        type: "uint256",
      },
    ],
  },
] as const satisfies Abi;