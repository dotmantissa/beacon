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

type WalletState = {
  address: string | null;
  isConnected: boolean;
  isInitializing: boolean;
  wrongNetwork: boolean;
  chainId: number | null;
  error: string;
  walletProvider: EthereumProvider;
  connect: () => void;
  disconnect: () => Promise<void>;
  clearError: () => void;
};

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy();
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

  useEffect(() => {
    if (!authenticated || wallets.length === 0) {
      setWalletProvider(null);
      setWrongNetwork(false);
      return;
    }

    let cancelled = false;

    async function init() {
      const wallet = wallets[0];
      const chainNum = parseInt((wallet.chainId ?? "eip155:0").split(":").pop() ?? "0", 10);

      if (chainNum !== CHAIN_ID) {
        try {
          await wallet.switchChain(CHAIN_ID);
        } catch {
          if (!cancelled) setWrongNetwork(true);
          return;
        }
      }

      if (cancelled) return;
      setWrongNetwork(false);

      try {
        const p = await wallet.getEthereumProvider();
        if (!cancelled) setWalletProvider(p);
      } catch {
        if (!cancelled) setError("Failed to get wallet provider.");
      }
    }

    init();
    return () => { cancelled = true; };
  }, [authenticated, wallets]);

  const primaryWallet = wallets[0] ?? null;
  const address = primaryWallet?.address ?? null;
  const chainNum = primaryWallet
    ? parseInt((primaryWallet.chainId ?? "eip155:0").split(":").pop() ?? "0", 10)
    : null;

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: authenticated && !!primaryWallet && !wrongNetwork,
        isInitializing: !ready,
        wrongNetwork,
        chainId: chainNum,
        error,
        walletProvider,
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
