"use client";

import { useWallet } from "@/components/WalletProvider";
import { Shield, Wifi } from "lucide-react";

export function WalletGate({ children }: { children: React.ReactNode }) {
  const { isConnected, isInitializing, wrongNetwork, connect } = useWallet();

  if (isInitializing) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="animate-spin-slow" style={{ margin: "0 auto 16px", width: "32px", height: "32px", borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--beacon-green)" }} />
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Checking your connection...</p>
        </div>
      </div>
    );
  }

  if (wrongNetwork) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", padding: "24px" }}>
        <div
          style={{
            textAlign: "center",
            maxWidth: "380px",
            background: "var(--surface)",
            borderRadius: "16px",
            padding: "40px 32px",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ margin: "0 auto 16px", width: "48px", height: "48px", borderRadius: "12px", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wifi size={24} style={{ color: "#92400e" }} />
          </div>
          <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "8px" }}>Wrong network</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "24px" }}>
            Beacon runs on the GenLayer Studio network. Switch over and you are good to go.
          </p>
          <button
            onClick={connect}
            style={{
              background: "var(--beacon-green)",
              color: "#fff",
              borderRadius: "8px",
              padding: "10px 24px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Switch network
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", padding: "24px" }}>
        <div
          style={{
            textAlign: "center",
            maxWidth: "380px",
            background: "var(--surface)",
            borderRadius: "16px",
            padding: "40px 32px",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ margin: "0 auto 16px", width: "48px", height: "48px", borderRadius: "12px", background: "var(--beacon-green-pale)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={24} style={{ color: "var(--beacon-green)" }} />
          </div>
          <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "8px" }}>Connect your wallet to continue</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "24px" }}>
            Beacon is on-chain. Your reports are yours. Connect to submit, corroborate, or track incidents.
          </p>
          <button
            onClick={connect}
            style={{
              background: "var(--beacon-green)",
              color: "#fff",
              borderRadius: "8px",
              padding: "10px 24px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Connect wallet
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
