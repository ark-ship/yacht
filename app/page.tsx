"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  formatUnits,
  type PublicClient,
} from "viem";

import {
  useAccount,
  useReadContract,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";

import {
  ConnectButton,
} from "@rainbow-me/rainbowkit";

import Tokenomics from "@/components/tokenomics";

import {
  ROBINHOOD_CHAIN_ID,
  NFT_CONTRACT,
  HYC_STAKING_CONTRACT,
  YACHT_CONTRACT,
  erc721Abi,
  erc20Abi,
  stakingAbi,
} from "@/lib/contracts";

/* ============================================================
   TYPES
============================================================ */

type NFTMetadata = {
  name?: string;
  description?: string;
  image?: string;
  animation_url?: string;
};

type NFTItem = {
  tokenId: bigint;
  name: string;
  image: string;
  animationUrl?: string;
};

type DurationOption = {
  id: number;
  days: number;
  label: string;
  rewardPerDay: number;
  totalReward: number;
};

/* ============================================================
   CONSTANTS
============================================================ */

const NFT_SUPPLY = 5555;

const NFT_METADATA_CID =
  "QmPcAzAabxigzZjKtSaHNWCioyfB8SHPkXgYUhpRNWot5i";

const NFT_METADATA_GATEWAYS = [
  `https://ipfs.io/ipfs/${NFT_METADATA_CID}`,
  `https://dweb.link/ipfs/${NFT_METADATA_CID}`,
];

const REWARD_OPTIONS: DurationOption[] = [
  {
    id: 1,
    days: 1,
    label: "1 DAY",
    rewardPerDay: 50,
    totalReward: 50,
  },
  {
    id: 2,
    days: 3,
    label: "3 DAYS",
    rewardPerDay: 100,
    totalReward: 300,
  },
  {
    id: 3,
    days: 7,
    label: "7 DAYS",
    rewardPerDay: 175,
    totalReward: 1225,
  },
  {
    id: 4,
    days: 30,
    label: "30 DAYS",
    rewardPerDay: 300,
    totalReward: 9000,
  },
];

/* ============================================================
   HELPERS
============================================================ */

function ipfsToHttp(value: string): string {
  if (!value) {
    return "";
  }

  if (value.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${value.slice(7)}`;
  }

  if (value.startsWith("ar://")) {
    return `https://arweave.net/${value.slice(5)}`;
  }

  return value;
}

function isHttpUrl(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}

function formatNumber(
  value: bigint | undefined,
  decimals = 18
): string {
  if (value === undefined) {
    return "0";
  }

  const parsed = Number(
    formatUnits(value, decimals)
  );

  if (!Number.isFinite(parsed)) {
    return "0";
  }

  return parsed.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function formatInteger(
  value: bigint | undefined
): string {
  if (value === undefined) {
    return "0";
  }

  return Number(
    formatUnits(value, 18)
  ).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

function formatCountdown(
  seconds: bigint
): string {
  const total = Number(seconds);

  const days = Math.floor(
    total / 86400
  );

  const hours = Math.floor(
    (total % 86400) / 3600
  );

  const minutes = Math.floor(
    (total % 3600) / 60
  );

  const secs = total % 60;

  return [
    days.toString().padStart(2, "0"),
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    secs.toString().padStart(2, "0"),
  ].join(":");
}

function getMetadataUrls(
  tokenId: bigint
): string[] {
  const id = tokenId.toString();

  const urls: string[] = [];

  for (
    const gateway of NFT_METADATA_GATEWAYS
  ) {
    urls.push(`${gateway}/${id}`);
    urls.push(`${gateway}/${id}.json`);
  }

  return urls;
}

async function fetchMetadata(
  tokenId: bigint
): Promise<NFTMetadata> {
  const urls =
    getMetadataUrls(tokenId);

  for (
    const url of urls
  ) {
    try {
      const response =
        await fetch(url, {
          cache: "no-store",
        });

      if (!response.ok) {
        continue;
      }

      const data =
        (await response.json()) as NFTMetadata;

      return data;
    } catch {
      continue;
    }
  }

  return {};
}

function normalizeAddress(
  value: string
): string {
  return value.toLowerCase();
}

function makeTokenRange(
  start: number,
  end: number
): bigint[] {
  const tokenIds: bigint[] = [];

  for (
    let tokenId = start;
    tokenId <= end;
    tokenId += 1
  ) {
    tokenIds.push(BigInt(tokenId));
  }

  return tokenIds;
}

const erc721EnumerableAbi = [
  {
    type: "function",
    name: "supportsInterface",
    stateMutability: "view",
    inputs: [
      { name: "interfaceId", type: "bytes4" },
    ],
    outputs: [
      { name: "", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [
      { name: "", type: "uint256" },
    ],
  },
] as const;

const ERC721_ENUMERABLE_INTERFACE_ID =
  "0x780e9d63" as const;

async function findOwnedTokenIds(
  publicClient: PublicClient,
  wallet: Address,
  start: number,
  end: number
): Promise<bigint[]> {
  const walletAddress =
    normalizeAddress(wallet);

  /*
   * First try ERC721Enumerable. This is the production-friendly path
   * because it asks the NFT contract directly which token IDs belong
   * to the connected wallet. No event-history scan and no multicall.
   */
  try {
    const enumerableSupported =
      await publicClient.readContract({
        address: NFT_CONTRACT,
        abi: erc721EnumerableAbi,
        functionName: "supportsInterface",
        args: [
          ERC721_ENUMERABLE_INTERFACE_ID,
        ],
      });

    if (enumerableSupported) {
      const balance =
        await publicClient.readContract({
          address: NFT_CONTRACT,
          abi: erc721Abi,
          functionName: "balanceOf",
          args: [wallet],
        });

      const ownedTokenIds: bigint[] = [];

      for (
        let index = 0n;
        index < balance;
        index += 1n
      ) {
        const tokenId =
          await publicClient.readContract({
            address: NFT_CONTRACT,
            abi: erc721EnumerableAbi,
            functionName: "tokenOfOwnerByIndex",
            args: [wallet, index],
          });

        ownedTokenIds.push(tokenId);
      }

      return ownedTokenIds;
    }
  } catch (error) {
    console.warn(
      "ERC721Enumerable lookup unavailable, falling back to ownerOf scan.",
      error
    );
  }

  /*
   * Generic ERC721 fallback. This works even when the collection does
   * not implement ERC721Enumerable. Calls are sent individually so
   * this does not depend on Multicall3 being deployed on Robinhood.
   */
  const tokenIds =
    makeTokenRange(start, end);

  const ownedTokenIds: bigint[] = [];
  const concurrency = 20;
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;

      if (index >= tokenIds.length) {
        return;
      }

      const tokenId = tokenIds[index];

      try {
        const owner =
          await publicClient.readContract({
            address: NFT_CONTRACT,
            abi: erc721Abi,
            functionName: "ownerOf",
            args: [tokenId],
          });

        if (
          normalizeAddress(String(owner)) ===
          walletAddress
        ) {
          ownedTokenIds.push(tokenId);
        }
      } catch {
        // Non-existent/burned token IDs revert. Ignore them.
      }
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          concurrency,
          tokenIds.length
        ),
      },
      () => worker()
    )
  );

  ownedTokenIds.sort(
    (a, b) =>
      a < b
        ? -1
        : a > b
        ? 1
        : 0
  );

  return ownedTokenIds;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency = 8
): Promise<R[]> {
  const results =
    new Array<R>(items.length);

  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const index =
        nextIndex++;

      if (
        index >= items.length
      ) {
        return;
      }

      results[index] =
        await worker(items[index]);
    }
  }

  const workers =
    Math.min(
      concurrency,
      items.length
    );

  await Promise.all(
    Array.from(
      { length: workers },
      () => runWorker()
    )
  );

  return results;
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function Home() {
  const {
    address,
    isConnected,
    chainId,
  } = useAccount();

  const publicClient =
    usePublicClient({
      chainId:
        ROBINHOOD_CHAIN_ID,
    });

  const {
    switchChain,
    isPending:
      isSwitchingChain,
  } = useSwitchChain();

  const {
    writeContract,
    data: transactionHash,
    error: writeError,
    isPending:
      isWriting,
  } = useWriteContract();

  const {
    isLoading:
      isTransactionConfirming,
    isSuccess:
      isTransactionConfirmed,
  } =
    useWaitForTransactionReceipt({
      hash: transactionHash,
    });

  /* ==========================================================
     LOCAL STATE
  ========================================================== */

  const [
    ownedNFTs,
    setOwnedNFTs,
  ] = useState<NFTItem[]>([]);

  const [
    selectedNFTs,
    setSelectedNFTs,
  ] = useState<bigint[]>([]);

  const [
    selectedDuration,
    setSelectedDuration,
  ] = useState(1);

  const [
    isLoadingNFTs,
    setIsLoadingNFTs,
  ] = useState(false);

  const [
    nftLoadError,
    setNFTLoadError,
  ] = useState("");

  const [
    actionStatus,
    setActionStatus,
  ] = useState("");

  const [
    currentTimestamp,
    setCurrentTimestamp,
  ] = useState(
    Math.floor(
      Date.now() / 1000
    )
  );

  /* ==========================================================
     NETWORK
  ========================================================== */

  const wrongNetwork =
    isConnected &&
    chainId !==
      ROBINHOOD_CHAIN_ID;

  /* ==========================================================
     YACHT BALANCE
  ========================================================== */

  const {
    data: yachtBalance,
    refetch:
      refetchYachtBalance,
  } =
    useReadContract({
      address:
        YACHT_CONTRACT,

      abi:
        erc20Abi,

      functionName:
        "balanceOf",

      args:
        address
          ? [address]
          : undefined,

      chainId:
        ROBINHOOD_CHAIN_ID,

      query: {
        enabled:
          Boolean(address) &&
          !wrongNetwork,
      },
    });

  /* ==========================================================
     STAKED TOKEN IDS
  ========================================================== */

  const {
    data: stakedTokenIds,
    refetch:
      refetchStakedTokenIds,
  } =
    useReadContract({
      address:
        HYC_STAKING_CONTRACT,

      abi:
        stakingAbi,

      functionName:
        "getStakedTokens",

      args:
        address
          ? [address]
          : undefined,

      chainId:
        ROBINHOOD_CHAIN_ID,

      query: {
        enabled:
          Boolean(address) &&
          !wrongNetwork,

        refetchInterval:
          10000,
      },
    });

  /* ==========================================================
     STAKED COUNT
  ========================================================== */

  const {
    data: stakedCount,
    refetch:
      refetchStakedCount,
  } =
    useReadContract({
      address:
        HYC_STAKING_CONTRACT,

      abi:
        stakingAbi,

      functionName:
        "stakedCount",

      args:
        address
          ? [address]
          : undefined,

      chainId:
        ROBINHOOD_CHAIN_ID,

      query: {
        enabled:
          Boolean(address) &&
          !wrongNetwork,

        refetchInterval:
          10000,
      },
    });

  /* ==========================================================
     NFT APPROVAL
  ========================================================== */

  const {
    data: isNFTApproved,
    refetch:
      refetchNFTApproval,
  } =
    useReadContract({
      address:
        NFT_CONTRACT,

      abi:
        erc721Abi,

      functionName:
        "isApprovedForAll",

      args:
        address
          ? [
              address,
              HYC_STAKING_CONTRACT,
            ]
          : undefined,

      chainId:
        ROBINHOOD_CHAIN_ID,

      query: {
        enabled:
          Boolean(address) &&
          !wrongNetwork,
      },
    });

  /* ==========================================================
     REWARD POOL
  ========================================================== */

  const {
    data: rewardPool,
  } =
    useReadContract({
      address:
        HYC_STAKING_CONTRACT,

      abi:
        stakingAbi,

      functionName:
        "rewardPoolBalance",

      chainId:
        ROBINHOOD_CHAIN_ID,

      query: {
        refetchInterval:
          10000,
      },
    });

  /* ==========================================================
     AVAILABLE REWARD
  ========================================================== */

  const {
    data: availableRewards,
  } =
    useReadContract({
      address:
        HYC_STAKING_CONTRACT,

      abi:
        stakingAbi,

      functionName:
        "availableRewards",

      chainId:
        ROBINHOOD_CHAIN_ID,

      query: {
        refetchInterval:
          10000,
      },
    });

  /* ==========================================================
     SELECTED DURATION
  ========================================================== */

  const selectedDurationData =
    useMemo(
      () =>
        REWARD_OPTIONS.find(
          (item) =>
            item.id ===
            selectedDuration
        ) ??
        REWARD_OPTIONS[0],

      [selectedDuration]
    );

  /* ==========================================================
     FORMATTED VALUES
  ========================================================== */

  const formattedYachtBalance =
    formatNumber(
      yachtBalance
    );

  const formattedRewardPool =
    formatInteger(
      rewardPool
    );

  const formattedAvailableRewards =
    formatInteger(
      availableRewards
    );

  /* ==========================================================
     LOAD REAL NFT OWNERSHIP
  ========================================================== */

  const loadOwnedNFTs =
    useCallback(
      async () => {
        if (
          !address ||
          wrongNetwork ||
          !publicClient
        ) {
          setOwnedNFTs([]);
          return;
        }

        setIsLoadingNFTs(
          true
        );

        setNFTLoadError("");

        try {
          /*
           * Production-safe ownership lookup.
           *
           * We do NOT scan the entire Transfer history anymore.
           * We first use ERC721Enumerable when available.
           * Otherwise the loader falls back to direct ownerOf() calls.
           *
           * HYC supply = 5,555, so the fallback is bounded and does not
           * depend on eth_getLogs block-range limits or Multicall3.
           */
          let ownedTokenIds =
            await findOwnedTokenIds(
              publicClient,
              address,
              1,
              NFT_SUPPLY
            );

          /*
           * Fallback for collections minted from token ID 0.
           * This costs another bounded scan only when the first
           * convention returns zero NFTs.
           */
          if (
            ownedTokenIds.length ===
            0
          ) {
            ownedTokenIds =
              await findOwnedTokenIds(
                publicClient,
                address,
                0,
                NFT_SUPPLY - 1
              );
          }

          ownedTokenIds.sort(
            (a, b) =>
              a < b
                ? -1
                : a > b
                ? 1
                : 0
          );

          /*
           * Fetch metadata in controlled parallel batches so a wallet
           * holding many NFTs does not flood the IPFS gateways.
           */
          const metadataResults =
            await mapWithConcurrency(
              ownedTokenIds,
              async (tokenId) => {
                const metadata =
                  await fetchMetadata(
                    tokenId
                  );

                const rawImage =
                  metadata.image ??
                  "";

                const rawAnimation =
                  metadata.animation_url ??
                  "";

                const image =
                  ipfsToHttp(
                    rawImage
                  );

                const animationUrl =
                  ipfsToHttp(
                    rawAnimation
                  );

                return {
                  tokenId,

                  name:
                    metadata.name ??
                    `HYC #${tokenId.toString()}`,

                  image:
                    image ||
                    "/1.gif",

                  animationUrl:
                    animationUrl ||
                    undefined,
                };
              },
              8
            );

          setOwnedNFTs(
            metadataResults
          );
        } catch (
          error
        ) {
          console.error(
            "HYC NFT loading failed:",
            error
          );

          setNFTLoadError(
            error instanceof
              Error
              ? error.message
              : "Unable to load your HYC NFTs."
          );

          setOwnedNFTs([]);
        } finally {
          setIsLoadingNFTs(
            false
          );
        }
      },
      [
        address,
        wrongNetwork,
        publicClient,
      ]
    );


  /* ==========================================================
     LOAD NFTS
  ========================================================== */

  useEffect(() => {
    loadOwnedNFTs();
  }, [
    loadOwnedNFTs,
  ]);

  /* ==========================================================
     CLOCK
  ========================================================== */

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setCurrentTimestamp(
            Math.floor(
              Date.now() /
                1000
            )
          );
        },
        1000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  /* ==========================================================
     REFRESH AFTER TX
  ========================================================== */

  useEffect(() => {
    if (
      !isTransactionConfirmed
    ) {
      return;
    }

    setActionStatus(
      "TRANSACTION CONFIRMED."
    );

    setSelectedNFTs([]);

    refetchNFTApproval();

    refetchYachtBalance();

    refetchStakedTokenIds();

    refetchStakedCount();

    loadOwnedNFTs();
  }, [
    isTransactionConfirmed,
    refetchNFTApproval,
    refetchYachtBalance,
    refetchStakedTokenIds,
    refetchStakedCount,
    loadOwnedNFTs,
  ]);

  /* ==========================================================
     SWITCH NETWORK
  ========================================================== */

  function ensureRobinhoodChain():
    boolean {
    if (
      chainId !==
      ROBINHOOD_CHAIN_ID
    ) {
      switchChain({
        chainId:
          ROBINHOOD_CHAIN_ID,
      });

      return false;
    }

    return true;
  }

  /* ==========================================================
     SELECT / DESELECT NFT
  ========================================================== */

  function toggleNFT(
    tokenId: bigint
  ) {
    setSelectedNFTs(
      (current) => {
        const exists =
          current.some(
            (id) =>
              id ===
              tokenId
          );

        if (
          exists
        ) {
          return current.filter(
            (id) =>
              id !==
              tokenId
          );
        }

        return [
          ...current,
          tokenId,
        ];
      }
    );
  }

  /* ==========================================================
     SELECT ALL
  ========================================================== */

  function selectAllNFTs() {
    if (
      selectedNFTs.length ===
      ownedNFTs.length
    ) {
      setSelectedNFTs([]);
      return;
    }

    setSelectedNFTs(
      ownedNFTs.map(
        (item) =>
          item.tokenId
      )
    );
  }

  /* ==========================================================
     APPROVE STAKING CONTRACT
  ========================================================== */

  function approveStaking() {
    if (
      !isConnected ||
      !address
    ) {
      return;
    }

    if (
      !ensureRobinhoodChain()
    ) {
      return;
    }

    setActionStatus(
      "APPROVING HYC STAKING..."
    );

    writeContract({
      address:
        NFT_CONTRACT,

      abi:
        erc721Abi,

      functionName:
        "setApprovalForAll",

      args: [
        HYC_STAKING_CONTRACT,
        true,
      ],

      chainId:
        ROBINHOOD_CHAIN_ID,
    });
  }

  /* ==========================================================
     STAKE SELECTED
  ========================================================== */

  function stakeSelected() {
    if (
      selectedNFTs.length ===
      0
    ) {
      return;
    }

    if (
      !ensureRobinhoodChain()
    ) {
      return;
    }

    if (
      !isNFTApproved
    ) {
      approveStaking();
      return;
    }

    setActionStatus(
      "STAKING YOUR YACHT..."
    );

    if (
      selectedNFTs.length ===
      1
    ) {
      writeContract({
        address:
          HYC_STAKING_CONTRACT,

        abi:
          stakingAbi,

        functionName:
          "stake",

        args: [
          selectedNFTs[0],
          selectedDuration,
        ],

        chainId:
          ROBINHOOD_CHAIN_ID,
      });

      return;
    }

    writeContract({
      address:
        HYC_STAKING_CONTRACT,

      abi:
        stakingAbi,

      functionName:
        "stakeBatch",

      args: [
        selectedNFTs,
        selectedDuration,
      ],

      chainId:
        ROBINHOOD_CHAIN_ID,
    });
  }

  /* ==========================================================
     CLAIM
  ========================================================== */

  function claimNFT(
    tokenId: bigint
  ) {
    if (
      !ensureRobinhoodChain()
    ) {
      return;
    }

    setActionStatus(
      "CLAIMING $YACHT..."
    );

    writeContract({
      address:
        HYC_STAKING_CONTRACT,

      abi:
        stakingAbi,

      functionName:
        "claim",

      args: [
        tokenId,
      ],

      chainId:
        ROBINHOOD_CHAIN_ID,
    });
  }

  /* ==========================================================
     UNSTAKE
  ========================================================== */

  function unstakeNFT(
    tokenId: bigint
  ) {
    if (
      !ensureRobinhoodChain()
    ) {
      return;
    }

    setActionStatus(
      "TAKING YACHT OFF DECK..."
    );

    writeContract({
      address:
        HYC_STAKING_CONTRACT,

      abi:
        stakingAbi,

      functionName:
        "unstake",

      args: [
        tokenId,
      ],

      chainId:
        ROBINHOOD_CHAIN_ID,
    });
  }

  /* ==========================================================
     SELECTED TOTAL REWARD
  ========================================================== */

  const selectedTotalReward =
    selectedNFTs.length *
    selectedDurationData.totalReward;

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main className="site-shell">

      {/* ======================================================
          NAVBAR
      ====================================================== */}

      <nav className="nav">

        <div className="nav-brand">

          <img
            src="/1.gif"
            alt="Hood Yacht Club"
          />

          <span>
            HYC
          </span>

        </div>

        <div className="nav-right">
          <ConnectButton />
        </div>

      </nav>


      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="hero">

        <div className="hero-copy">

          <div className="eyebrow">
            HOOD YACHT CLUB
            <br />
            ROBINHOOD CHAIN
          </div>

          <h1>
            YOUR YACHT
            <br />
            GOES
            <br />
            ON DECK.
          </h1>

          <p>
            stake it.
            <br />
            earn $YACHT.
          </p>

          {!isConnected && (
            <ConnectButton />
          )}

          {isConnected &&
            wrongNetwork && (
              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  switchChain({
                    chainId:
                      ROBINHOOD_CHAIN_ID,
                  })
                }
                disabled={
                  isSwitchingChain
                }
              >
                {isSwitchingChain
                  ? "SWITCHING..."
                  : "SWITCH TO ROBINHOOD"}
              </button>
            )}

        </div>


        <div
          className="hero-art"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100%",
            overflow: "hidden",
          }}
        >
          <div
            className="hero-logo"
            aria-label="HYC — Hood Yacht Club"
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              width: "100%",
              padding: "2rem",
            }}
          >
            <div
              style={{
                fontSize: "clamp(7rem, 15vw, 13rem)",
                lineHeight: 0.78,
                fontWeight: 900,
                letterSpacing: "-0.09em",
                color: "#ccff00",
                textShadow: "0 0 1px #ccff00",
              }}
            >
              HYC
            </div>

            <div
              style={{
                marginTop: "1.5rem",
                fontSize: "clamp(0.9rem, 1.35vw, 1.25rem)",
                lineHeight: 1,
                fontWeight: 700,
                letterSpacing: "0.16em",
                color: "#ccff00",
                textTransform: "uppercase",
              }}
            >
              HOOD YACHT CLUB
            </div>
          </div>
        </div>

      </section>


      {/* ======================================================
          STATS
      ====================================================== */}

      <section className="stats">

        <div className="stat">
          <span>
            WALLET
          </span>

          <strong>
            {isConnected &&
            address
              ? `${address.slice(
                  0,
                  6
                )}...${address.slice(
                  -4
                )}`
              : "—"}
          </strong>
        </div>


        <div className="stat">
          <span>
            FLEET
          </span>

          <strong>
            {ownedNFTs.length}
          </strong>
        </div>


        <div className="stat">
          <span>
            ON DECK
          </span>

          <strong>
            {formatInteger(
              stakedCount
            )}
          </strong>
        </div>


        <div className="stat">
          <span>
            $YACHT
          </span>

          <strong>
            {formattedYachtBalance}
          </strong>
        </div>

      </section>


      {/* ======================================================
          FLEET
      ====================================================== */}

      <section
        className="deck"
        id="fleet"
      >

        <div className="section-heading">

          <div>

            <span className="eyebrow">
              YOUR FLEET
            </span>

            <h2>
              PICK A YACHT.
            </h2>

          </div>

          <p>
            pick a yacht.
            <br />
            put it on deck.
          </p>

        </div>


        {/* ====================================================
            NOT CONNECTED
        ==================================================== */}

        {!isConnected && (
          <div className="empty-state">

            <img
              src="/1.gif"
              alt=""
            />

            <h3>
              CONNECT YOUR WALLET
            </h3>

            <p>
              Your HYC fleet
              will appear here.
            </p>

            <ConnectButton />

          </div>
        )}


        {/* ====================================================
            WRONG NETWORK
        ==================================================== */}

        {isConnected &&
          wrongNetwork && (
            <div className="empty-state">

              <h3>
                WRONG NETWORK
              </h3>

              <p>
                HYC runs on Robinhood
                Chain.
              </p>

              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  switchChain({
                    chainId:
                      ROBINHOOD_CHAIN_ID,
                  })
                }
              >
                SWITCH TO ROBINHOOD
              </button>

            </div>
          )}


        {/* ====================================================
            LOADING
        ==================================================== */}

        {isConnected &&
          !wrongNetwork &&
          isLoadingNFTs && (
            <div className="empty-state">

              <h3>
                SCANNING FLEET...
              </h3>

              <p>
                Reading your HYC
                NFTs from the chain.
              </p>

            </div>
          )}


        {/* ====================================================
            ERROR
        ==================================================== */}

        {isConnected &&
          !wrongNetwork &&
          !isLoadingNFTs &&
          nftLoadError && (
            <div className="empty-state">

              <h3>
                FLEET ERROR
              </h3>

              <p>
                {nftLoadError}
              </p>

              <button
                type="button"
                className="secondary-btn"
                onClick={
                  loadOwnedNFTs
                }
              >
                RETRY
              </button>

            </div>
          )}


        {/* ====================================================
            NO NFT
        ==================================================== */}

        {isConnected &&
          !wrongNetwork &&
          !isLoadingNFTs &&
          !nftLoadError &&
          ownedNFTs.length ===
            0 && (
            <div className="empty-state">

              <h3>
                NO YACHTS FOUND
              </h3>

              <p>
                This wallet does not
                currently hold a HYC NFT.
              </p>

            </div>
          )}


        {/* ====================================================
            NFT GRID
        ==================================================== */}

        {isConnected &&
          !wrongNetwork &&
          !isLoadingNFTs &&
          ownedNFTs.length > 0 && (
            <>

              <div className="fleet-toolbar">

                <div>
                  <span>
                    {selectedNFTs.length}
                  </span>

                  <small>
                    /{" "}
                    {
                      ownedNFTs.length
                    }{" "}
                    SELECTED
                  </small>
                </div>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={
                    selectAllNFTs
                  }
                >
                  {selectedNFTs.length ===
                  ownedNFTs.length
                    ? "CLEAR ALL"
                    : "SELECT ALL"}
                </button>

              </div>


              <div className="nft-grid">

                {ownedNFTs.map(
                  (nft) => {
                    const selected =
                      selectedNFTs.some(
                        (id) =>
                          id ===
                          nft.tokenId
                      );

                    return (
                      <button
                        key={
                          nft.tokenId.toString()
                        }
                        type="button"
                        className={`nft-card ${
                          selected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          toggleNFT(
                            nft.tokenId
                          )
                        }
                      >

                        <div className="nft-image">

                          {nft.animationUrl ? (
                            <img
                              src={
                                nft.animationUrl
                              }
                              alt={
                                nft.name
                              }
                              loading="lazy"
                            />
                          ) : (
                            <img
                              src={
                                nft.image
                              }
                              alt={
                                nft.name
                              }
                              loading="lazy"
                            />
                          )}

                        </div>


                        <div className="nft-info">

                          <span>
                            {nft.name}
                          </span>

                          <strong>
                            #
                            {
                              nft.tokenId.toString()
                            }
                          </strong>

                        </div>


                        <div className="nft-check">
                          {selected
                            ? "✓"
                            : "+"}
                        </div>

                      </button>
                    );
                  }
                )}

              </div>


              {/* ==============================================
                  STAKE PANEL
              ============================================== */}

              {selectedNFTs.length >
                0 && (
                <div className="stake-panel">

                  <div className="stake-panel-head">

                    <div>

                      <span className="eyebrow">
                        PUT ON DECK
                      </span>

                      <h3>
                        {
                          selectedNFTs.length
                        }{" "}
                        YACHT
                        {
                          selectedNFTs.length >
                          1
                            ? "S"
                            : ""
                        }
                      </h3>

                    </div>


                    <div className="reward-preview">

                      <span>
                        TOTAL REWARD
                      </span>

                      <strong>
                        {
                          selectedTotalReward.toLocaleString(
                            "en-US"
                          )
                        }{" "}
                        $YACHT
                      </strong>

                    </div>

                  </div>


                  <div className="duration-grid">

                    {REWARD_OPTIONS.map(
                      (option) => (
                        <button
                          key={
                            option.id
                          }
                          type="button"
                          className={
                            selectedDuration ===
                            option.id
                              ? "duration active"
                              : "duration"
                          }
                          onClick={() =>
                            setSelectedDuration(
                              option.id
                            )
                          }
                        >

                          <strong>
                            {
                              option.label
                            }
                          </strong>

                          <span>
                            {
                              option.rewardPerDay
                            }{" "}
                            $YACHT/day
                          </span>

                          <small>
                            {
                              option.totalReward
                            }{" "}
                            total
                          </small>

                        </button>
                      )
                    )}

                  </div>


                  <div className="stake-action">

                    <div>
                      <span>
                        SELECTED
                      </span>

                      <strong>
                        {
                          selectedNFTs.length
                        }
                      </strong>
                    </div>


                    <div>
                      <span>
                        LOCK
                      </span>

                      <strong>
                        {
                          selectedDurationData.days
                        }{" "}
                        DAY
                        {
                          selectedDurationData.days >
                          1
                            ? "S"
                            : ""
                        }
                      </strong>
                    </div>


                    {!isNFTApproved ? (
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={
                          approveStaking
                        }
                        disabled={
                          isWriting ||
                          isTransactionConfirming
                        }
                      >
                        {isWriting
                          ? "CONFIRM IN WALLET..."
                          : "APPROVE HYC"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={
                          stakeSelected
                        }
                        disabled={
                          isWriting ||
                          isTransactionConfirming
                        }
                      >
                        {isWriting
                          ? "CONFIRM IN WALLET..."
                          : isTransactionConfirming
                          ? "CONFIRMING..."
                          : "STAKE YACHT"}
                      </button>
                    )}

                  </div>

                </div>
              )}

            </>
          )}

      </section>


      {/* ======================================================
          ON DECK
      ====================================================== */}

      {isConnected &&
        !wrongNetwork &&
        (
          stakedTokenIds?.length ??
          0
        ) > 0 && (
          <section className="staked-section">

            <div className="section-heading">

              <div>

                <span className="eyebrow">
                  ON DECK
                </span>

                <h2>
                  YOUR STAKED YACHTS.
                </h2>

              </div>

              <p>
                rewards accrue
                until unlock.
              </p>

            </div>


            <div className="staked-grid">

              {(
                stakedTokenIds ??
                []
              ).map(
                (tokenId) => (
                  <StakedNFTCard
                    key={
                      tokenId.toString()
                    }
                    tokenId={
                      tokenId
                    }
                    currentTimestamp={
                      currentTimestamp
                    }
                    onClaim={() =>
                      claimNFT(
                        tokenId
                      )
                    }
                    onUnstake={() =>
                      unstakeNFT(
                        tokenId
                      )
                    }
                    disabled={
                      isWriting ||
                      isTransactionConfirming
                    }
                  />
                )
              )}

            </div>

          </section>
        )}


      {/* ======================================================
          TOKENOMICS
      ====================================================== */}

      <Tokenomics />


      {/* ======================================================
          REWARD POOL
      ====================================================== */}

      <section className="reward-section">

        <div>

          <span className="eyebrow">
            REWARD POOL
          </span>

          <h2>
            THE DECK
            <br />
            IS LOADED.
          </h2>

        </div>


        <div className="reward-number">

          <span>
            AVAILABLE POOL
          </span>

          <strong>
            {
              formattedAvailableRewards
            }
          </strong>

          <small>
            $YACHT
          </small>

        </div>

      </section>


      {/* ======================================================
          STATUS BAR
      ====================================================== */}

      {(actionStatus ||
        writeError ||
        transactionHash) && (
        <section className="transaction-bar">

          {actionStatus && (
            <span>
              {actionStatus}
            </span>
          )}


          {writeError && (
            <span>
              {parseWalletError(
                writeError.message
              )}
            </span>
          )}


          {transactionHash && (
            <a
              href={`https://robinhoodchain.blockscout.com/tx/${transactionHash}`}
              target="_blank"
              rel="noreferrer"
            >
              VIEW TX ↗
            </a>
          )}

        </section>
      )}


      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="footer">

        <div className="footer-brand">

          <img
            src="/1.gif"
            alt="Hood Yacht Club"
          />

          <span>
            HOOD YACHT CLUB
          </span>

        </div>


        <div className="footer-contracts">

          <a
            href={`https://robinhoodchain.blockscout.com/address/${NFT_CONTRACT}`}
            target="_blank"
            rel="noreferrer"
          >
            NFT ↗
          </a>

          <a
            href={`https://robinhoodchain.blockscout.com/address/${HYC_STAKING_CONTRACT}`}
            target="_blank"
            rel="noreferrer"
          >
            STAKING ↗
          </a>

          <a
            href={`https://robinhoodchain.blockscout.com/address/${YACHT_CONTRACT}`}
            target="_blank"
            rel="noreferrer"
          >
            YACHT ↗
          </a>

        </div>


        <div className="footer-meta">
          <span>
            {NFT_SUPPLY.toLocaleString()} YACHTS
          </span>

          <span>
            ROBINHOOD CHAIN
          </span>
        </div>

      </footer>

    </main>
  );
}


/* ============================================================
   STAKED NFT CARD
============================================================ */

function StakedNFTCard({
  tokenId,
  currentTimestamp,
  onClaim,
  onUnstake,
  disabled,
}: {
  tokenId: bigint;
  currentTimestamp: number;
  onClaim: () => void;
  onUnstake: () => void;
  disabled: boolean;
}) {
  const {
    data: stakeData,
    isLoading,
  } =
    useReadContract({
      address:
        HYC_STAKING_CONTRACT,

      abi:
        stakingAbi,

      functionName:
        "stakes",

      args: [
        tokenId,
      ],

      chainId:
        ROBINHOOD_CHAIN_ID,

      query: {
        refetchInterval:
          5000,
      },
    });

  const {
    data: pendingReward,
  } =
    useReadContract({
      address:
        HYC_STAKING_CONTRACT,

      abi:
        stakingAbi,

      functionName:
        "pendingReward",

      args: [
        tokenId,
      ],

      chainId:
        ROBINHOOD_CHAIN_ID,

      query: {
        refetchInterval:
          5000,
      },
    });

  /* ==========================================================
     LOADING
  ========================================================== */

  if (
    isLoading ||
    !stakeData
  ) {
    return (
      <article className="staked-card">

        <div className="staked-content">

          <div className="staked-top">

            <div>

              <span className="eyebrow">
                ON DECK
              </span>

              <h3>
                LOADING #{tokenId.toString()}
              </h3>

            </div>

          </div>

        </div>

      </article>
    );
  }

  /* ==========================================================
     READ STAKE DATA
  ========================================================== */

  const owner =
    stakeData[0];

  const startedAt =
    stakeData[1];

  const unlockAt =
    stakeData[3];

  const durationOption =
    Number(
      stakeData[4]
    );

  const rewardPerDay =
    stakeData[5];

  const totalReward =
    stakeData[6];

  const claimedReward =
    stakeData[7];

  /* Avoid unused warning */
  void owner;
  void startedAt;

  /* ==========================================================
     COUNTDOWN
  ========================================================== */

  const now =
    BigInt(
      currentTimestamp
    );

  const remaining =
    unlockAt > now
      ? unlockAt - now
      : 0n;

  const unlocked =
    remaining === 0n;

  const countdown =
    formatCountdown(
      remaining
    );

  /* ==========================================================
     DURATION
  ========================================================== */

  const duration =
    REWARD_OPTIONS.find(
      (item) =>
        item.id ===
        durationOption
    );

  /* ==========================================================
     REWARD VALUES
  ========================================================== */

  const pending =
    pendingReward ??
    0n;

  const totalRewardNumber =
    Number(
      formatUnits(
        totalReward,
        18
      )
    );

  const claimedRewardNumber =
    Number(
      formatUnits(
        claimedReward,
        18
      )
    );

  const pendingRewardNumber =
    Number(
      formatUnits(
        pending,
        18
      )
    );

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <article className="staked-card">

      {/* ====================================================
          ART
      ==================================================== */}

      <div className="staked-art">

        <img
          src="/1.gif"
          alt={`Yacht #${tokenId.toString()}`}
        />

        <span>
          #{tokenId.toString()}
        </span>

      </div>


      {/* ====================================================
          CONTENT
      ==================================================== */}

      <div className="staked-content">

        <div className="staked-top">

          <div>

            <span className="eyebrow">
              ON DECK
            </span>

            <h3>
              YACHT #
              {tokenId.toString()}
            </h3>

          </div>


          <strong>
            {duration?.label ??
              `OPTION ${durationOption}`}
          </strong>

        </div>


        {/* ==================================================
            STATS
        ================================================== */}

        <div className="staked-stats">

          <div>

            <span>
              RATE
            </span>

            <strong>
              {
                Number(
                  formatUnits(
                    rewardPerDay,
                    18
                  )
                ).toLocaleString(
                  "en-US"
                )
              }
            </strong>

          </div>


          <div>

            <span>
              EARNED
            </span>

            <strong>
              {
                (
                  claimedRewardNumber +
                  pendingRewardNumber
                ).toLocaleString(
                  "en-US",
                  {
                    maximumFractionDigits: 4,
                  }
                )
              }
            </strong>

          </div>


          <div>

            <span>
              TOTAL
            </span>

            <strong>
              {
                totalRewardNumber.toLocaleString(
                  "en-US",
                  {
                    maximumFractionDigits: 0,
                  }
                )
              }
            </strong>

          </div>

        </div>


        {/* ==================================================
            COUNTDOWN
        ================================================== */}

        <div className="countdown">

          <span>
            {unlocked
              ? "UNLOCKED"
              : "UNLOCKS IN"}
          </span>


          {!unlocked && (
            <strong>
              {countdown}
            </strong>
          )}

        </div>


        {/* ==================================================
            PENDING
        ================================================== */}

        <div className="staked-reward">

          <span>
            CLAIMABLE
          </span>

          <strong>
            {
              pendingRewardNumber.toLocaleString(
                "en-US",
                {
                  maximumFractionDigits: 6,
                }
              )
            }{" "}
            $YACHT
          </strong>

        </div>


        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div className="staked-actions">

          <button
            type="button"
            className="secondary-btn"
            onClick={
              onClaim
            }
            disabled={
              disabled ||
              pending === 0n
            }
          >
            {pending === 0n
              ? "NO REWARD"
              : "CLAIM"}
          </button>


          <button
            type="button"
            className={
              unlocked
                ? "primary-btn"
                : "secondary-btn"
            }
            onClick={
              onUnstake
            }
            disabled={
              disabled ||
              !unlocked
            }
          >
            {unlocked
              ? "UNSTAKE"
              : "LOCKED"}
          </button>

        </div>

      </div>

    </article>
  );
}


/* ============================================================
   WALLET ERROR PARSER
============================================================ */

function parseWalletError(
  message: string
): string {
  const lower =
    message.toLowerCase();

  if (
    lower.includes(
      "user rejected"
    ) ||
    lower.includes(
      "user denied"
    )
  ) {
    return "TRANSACTION REJECTED.";
  }

  if (
    lower.includes(
      "insufficient funds"
    )
  ) {
    return "INSUFFICIENT ETH FOR GAS.";
  }

  if (
    lower.includes(
      "wrong duration"
    )
  ) {
    return "INVALID STAKING DURATION.";
  }

  if (
    lower.includes(
      "still locked"
    )
  ) {
    return "YACHT IS STILL LOCKED.";
  }

  if (
    lower.includes(
      "not nft owner"
    )
  ) {
    return "YOU DO NOT OWN THIS NFT.";
  }

  if (
    lower.includes(
      "nft already staked"
    )
  ) {
    return "NFT IS ALREADY STAKED.";
  }

  if (
    lower.includes(
      "insufficient reward pool"
    )
  ) {
    return "REWARD POOL IS CURRENTLY INSUFFICIENT.";
  }

  return message;
}