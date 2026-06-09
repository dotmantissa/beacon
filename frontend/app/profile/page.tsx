"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, Shield, Plus } from "lucide-react";
import { Nav } from "@/components/Nav";
import { WalletGate } from "@/components/WalletGate";
import { IncidentCard } from "@/components/IncidentCard";
import { useWallet } from "@/components/WalletProvider";
import type { Incident } from "@/lib/genlayer";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function ProfilePage() {
  const { address, isConnected } = useWallet();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    async function load() {
      try {
        const res = await fetch(`/api/incidents?submitter=${address}`);
        const rows = await res.json() as Array<{ chain_data: Incident }>;
        setIncidents(rows.map(r => r.chain_data).filter(Boolean));
      } catch {
        setIncidents([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [address]);

  const verified = incidents.filter(i => i.status === "VERIFIED").length;
  const pending = incidents.filter(i => i.status === "PENDING").length;
  const closed = incidents.filter(i => i.status === "CLOSED").length;

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav />
      <WalletGate>
        <div style={{ maxWidth: "680px", margin: "0 auto", padding: "32px 24px 80px" }}>
          {/* Profile header */}
          <div style={{ background: "var(--surface)", borderRadius: "16px", padding: "28px", border: "1px solid var(--border)", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "var(--beacon-green-pale)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={24} style={{ color: "var(--beacon-green)" }} />
              </div>
              <div>
                <h1 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "2px" }}>Your account</h1>
                <p style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--muted)" }}>
                  {address ? shortAddr(address) : ""}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {[
                { label: "Total reports", value: incidents.length, color: "var(--foreground)" },
                { label: "Verified", value: verified, color: "var(--beacon-green)" },
                { label: "Pending", value: pending, color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--surface-2)", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "4px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Reports */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Your reports</h2>
            <Link
              href="/report"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--beacon-green)", color: "#fff", borderRadius: "8px", padding: "7px 14px", fontWeight: 600, fontSize: "0.82rem", textDecoration: "none" }}
            >
              <Plus size={13} /> New report
            </Link>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[1, 2].map(i => (
                <div key={i} style={{ background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)", padding: "20px" }}>
                  <div className="skeleton" style={{ height: "14px", width: "40%", marginBottom: "10px" }} />
                  <div className="skeleton" style={{ height: "12px", width: "80%", marginBottom: "6px" }} />
                  <div className="skeleton" style={{ height: "10px", width: "60%" }} />
                </div>
              ))}
            </div>
          ) : incidents.length === 0 ? (
            <div style={{ background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)", padding: "60px 24px", textAlign: "center" }}>
              <Shield size={36} style={{ margin: "0 auto 16px", color: "var(--border)" }} />
              <h3 style={{ fontWeight: 700, marginBottom: "8px" }}>No reports yet</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "20px" }}>
                You have not filed any incidents. Something happened and you did not report it? Sounds like the old system.
              </p>
              <Link href="/report" style={{ display: "inline-block", padding: "10px 24px", background: "var(--beacon-green)", color: "#fff", borderRadius: "8px", fontWeight: 600, textDecoration: "none" }}>
                File your first report
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {incidents.map(incident => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          )}
        </div>
      </WalletGate>
    </div>
  );
}
