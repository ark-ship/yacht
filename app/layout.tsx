import type {
  Metadata,
} from "next";

import "./globals.css";

import Providers from "./providers";

export const metadata: Metadata = {
  title:
    "Hood Yacht Club",

  description:
    "Stake your Hood Yacht Club NFT and earn $YACHT on Robinhood Chain.",

  icons: {
    icon: "/1.gif",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}