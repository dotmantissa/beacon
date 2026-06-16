"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { CHAIN_ID } from "@/lib/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EthereumProvider = any;

// Minimal interface for what we use from Privy's ConnectedWallet
export type PrivySignerWallet = {
  signTransaction: (
    input: Record<string, unknown>,
    options?: unknown
  ) => Promise<{ signature: `0x${string}` }>;
};

type WalletState = {
  address: string | null;
  isConnected: boolean;
  isInitializing: boolean;
  wrongNetwork: boolean;
  chainId: number | null;
  error: string;
  walletProvider: EthereumProvider;
  isEmbedded: boolean;
  privyWallet: PrivySignerWallet | null;
  connect: () => void;
  disconnect: () => Promise<void>;
  clearError: () => void;
};

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();

  const [walletProvider, setWalletProvider] = useState<EthereumProvider>(null);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [error, setError] = useState("");

  const clearError = useCallback(() => setError(""), []);

  const connect = useCallback(() => {
    clearError();
    login();
  }, [login, clearError]);

  const disconnect = useCallback(async () => {
    await logout();
    setWalletProvider(null);
    setWrongNetwork(false);
    setError("");
  }, [logout]);

  // Determine whether the current session is an email/social user (embedded wallet)
  // or an externally connected wallet user. These must never share the same address.
  const linkedAccounts = user?.linkedAccounts ?? [];
  const hasEmailAccount = linkedAccounts.some((a) => a.type === "email");
  const hasExternalWallet = linkedAccounts.some(
    (a) => a.type === "wallet" && !("walletClientType" in a && (a as { walletClientType?: string }).walletClientType === "privy")
  );

  // For email users: pick only the Privy-managed embedded wallet.
  // For wallet users: pick only external (non-Privy) wallets.
  // This prevents an email login from ever seeing or using a previously linked MetaMask address.
  const activeWallet = (() => {
    if (!authenticated || wallets.length === 0) return null;
    if (hasEmailAccount && !hasExternalWallet) {
      // Pure email user — must use embedded wallet
      return (
        wallets.find(
          (w) => w.walletClientType === "privy" || w.walletClientType === "privy-v2"
        ) ?? null
      );
    }
    if (hasExternalWallet && !hasEmailAccount) {
      // Pure wallet user — use external wallet only
      return (
        wallets.find(
          (w) => w.walletClientType !== "privy" && w.walletClientType !== "privy-v2"
        ) ?? wallets[0]
      );
    }
    // Mixed account (shouldn't happen with our login config, but handle gracefully):
    // prefer embedded for safety so email identity is always used
    return (
      wallets.find(
        (w) => w.walletClientType === "privy" || w.walletClientType === "privy-v2"
      ) ?? wallets[0]
    );
  })();

  const isEmbedded =
    activeWallet?.walletClientType === "privy" ||
    activeWallet?.walletClientType === "privy-v2";

  useEffect(() => {
    if (!authenticated || !activeWallet) {
      setWalletProvider(null);
      setWrongNetwork(false);
      return;
    }

    let cancelled = false;

    async function init() {
      if (!activeWallet) return;
      const chainNum = parseInt(
        (activeWallet.chainId ?? "eip155:0").split(":").pop() ?? "0",
        10
      );

      if (chainNum !== CHAIN_ID) {
        try {
          await activeWallet.switchChain(CHAIN_ID);
        } catch {
          if (!cancelled) setWrongNetwork(true);
          return;
        }
      }

      if (cancelled) return;
      setWrongNetwork(false);

      try {
        const p = await activeWallet.getEthereumProvider();
        if (!cancelled) setWalletProvider(p);
      } catch {
        if (!cancelled) setError("Failed to get wallet provider.");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [authenticated, activeWallet]);

  const address = activeWallet?.address ?? null;
  const chainNum = activeWallet
    ? parseInt(
        (activeWallet.chainId ?? "eip155:0").split(":").pop() ?? "0",
        10
      )
    : null;

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: authenticated && !!activeWallet && !wrongNetwork,
        isInitializing: !ready,
        wrongNetwork,
        chainId: chainNum,
        error,
        walletProvider,
        isEmbedded,
        privyWallet: isEmbedded ? (activeWallet as unknown as PrivySignerWallet) : null,
        connect,
        disconnect,
        clearError,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
