"use client";

import {
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";

import {
  WagmiProvider,
} from "wagmi";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  config,
} from "@/lib/wagmi";

import {
  useState,
} from "react";

import "@rainbow-me/rainbowkit/styles.css";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] =
    useState(
      () =>
        new QueryClient({
          defaultOptions: {
            queries: {
              refetchOnWindowFocus: false,
              staleTime: 10_000,
            },
          },
        })
    );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider
        client={queryClient}
      >
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}