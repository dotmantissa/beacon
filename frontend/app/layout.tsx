import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PrivyProviderWrapper } from "@/components/PrivyProviderWrapper";
import { WalletProvider } from "@/components/WalletProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Beacon",
  description: "Neighbourhood safety, verified. Submit incidents with evidence. The AI cross-checks. The record stands.",
  icons: { icon: "/beacon-logo.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <PrivyProviderWrapper>
          <WalletProvider>
            {children}
          </WalletProvider>
        </PrivyProviderWrapper>
      </body>
    </html>
  );
}
