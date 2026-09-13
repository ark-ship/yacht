import { NextResponse } from "next/server";

import { NFT_CONTRACT } from "@/lib/contracts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALCHEMY_NFT_BASE =
  "https://robinhood-mainnet.g.alchemy.com/nft/v3";

type AlchemyNFT = {
  contract?: {
    address?: string;
  };
  tokenId?: string;
  tokenType?: string;
  name?: string;
  description?: string;
  image?: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    pngUrl?: string;
    originalUrl?: string;
  };
  animation?: {
    cachedUrl?: string;
    originalUrl?: string;
    contentType?: string;
  };
  tokenUri?: string;
  raw?: {
    tokenUri?: string;
    metadata?: {
      name?: string;
      image?: string;
      animation_url?: string;
    };
  };
};

type AlchemyOwnerResponse = {
  ownedNfts?: AlchemyNFT[];
  totalCount?: number;
  pageKey?: string;
};

type ApiNFT = {
  tokenId: string;
  name: string;
  image: string;
  animationUrl?: string;
};

function getAlchemyApiKey(): string {
  const directKey = process.env.ALCHEMY_API_KEY?.trim();

  if (directKey) {
    return directKey;
  }

  const rpcUrl = process.env.NEXT_PUBLIC_RH_RPC_URL?.trim();

  if (rpcUrl) {
    try {
      const pathname = new URL(rpcUrl).pathname.replace(/^\/+/, "");
      const parts = pathname.split("/").filter(Boolean);
      const possibleKey = parts[parts.length - 1];

      if (possibleKey && possibleKey !== "v2") {
        return possibleKey;
      }
    } catch {
      // Ignore malformed RPC env values and fall through to the error below.
    }
  }

  return "";
}

function normalizeUrl(value?: string): string {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner")?.trim();

  if (!owner || !/^0x[a-fA-F0-9]{40}$/.test(owner)) {
    return NextResponse.json(
      { error: "Invalid wallet address." },
      { status: 400 }
    );
  }

  const apiKey = getAlchemyApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Alchemy API key is not configured. Add ALCHEMY_API_KEY to Vercel.",
      },
      { status: 500 }
    );
  }

  const nfts: ApiNFT[] = [];
  let pageKey: string | undefined;

  try {
    do {
      const url = new URL(
        `${ALCHEMY_NFT_BASE}/${encodeURIComponent(apiKey)}/getNFTsForOwner`
      );

      url.searchParams.set("owner", owner);
      url.searchParams.append(
        "contractAddresses[]",
        NFT_CONTRACT
      );
      url.searchParams.set("withMetadata", "true");
      url.searchParams.set("pageSize", "100");

      if (pageKey) {
        url.searchParams.set("pageKey", pageKey);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.text();
        console.error("Alchemy NFT API error", response.status, body);

        return NextResponse.json(
          {
            error: `Alchemy NFT API returned ${response.status}.`,
          },
          { status: 502 }
        );
      }

      const data =
        (await response.json()) as AlchemyOwnerResponse;

      for (const nft of data.ownedNfts ?? []) {
        const contract = nft.contract?.address?.toLowerCase();

        if (
          contract !== NFT_CONTRACT.toLowerCase() ||
          nft.tokenId === undefined
        ) {
          continue;
        }

        const rawMetadata = nft.raw?.metadata;

        const image = normalizeUrl(
          nft.image?.originalUrl ||
            nft.image?.cachedUrl ||
            nft.image?.pngUrl ||
            rawMetadata?.image
        );

        const animationUrl = normalizeUrl(
          nft.animation?.originalUrl ||
            nft.animation?.cachedUrl ||
            rawMetadata?.animation_url
        );

        nfts.push({
          tokenId: nft.tokenId,
          name:
            nft.name ||
            rawMetadata?.name ||
            `HYC #${nft.tokenId}`,
          image,
          animationUrl: animationUrl || undefined,
        });
      }

      pageKey = data.pageKey;
    } while (pageKey);

    const deduped = Array.from(
      new Map(
        nfts.map((nft) => [nft.tokenId, nft])
      ).values()
    ).sort((a, b) => {
      const aa = BigInt(a.tokenId);
      const bb = BigInt(b.tokenId);
      return aa < bb ? -1 : aa > bb ? 1 : 0;
    });

    return NextResponse.json(
      { nfts: deduped },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("HYC NFT API route failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load HYC NFTs.",
      },
      { status: 500 }
    );
  }
}
