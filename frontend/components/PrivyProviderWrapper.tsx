"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { CHAIN_ID } from "@/lib/constants";

export function PrivyProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? ""}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#37ab2f",
          logo: "/beacon-logo.svg",
        },
        loginMethods: ["email", "wallet", "google"],
        defaultChain: {
          id: CHAIN_ID,
          name: "GenLayer Studio",
          nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
          rpcUrls: { default: { http: ["https://studio.genlayer.com/api"] } },
        },
        supportedChains: [
          {
            id: CHAIN_ID,
            name: "GenLayer Studio",
            nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
            rpcUrls: { default: { http: ["https://studio.genlayer.com/api"] } },
          },
        ],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
