"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, MapPin, Clock, Users, Shield, AlertTriangle,
  ExternalLink, CheckCircle, Loader2
} from "lucide-react";
import { Nav } from "@/components/Nav";
import { StatusBadge, SeverityBadge } from "@/components/Badges";
import { WalletGate } from "@/components/WalletGate";
import { useWallet } from "@/components/WalletProvider";
import { readIncident, readIncidentValidation, corroborateIncident, markAuthorityReceived } from "@/lib/genlayer";
import type { Incident, ValidationResult } from "@/lib/genlayer";

const INCIDENT_LABELS: Record<string, string> = {
  antisocial_behaviour: "Antisocial Behaviour",
  criminal_damage: "Criminal Damage",
  theft: "Theft",
  vehicle_crime: "Vehicle Crime",
  assault: "Assault",
  drug_offences: "Drug Offences",
  fly_tipping: "Fly Tipping",
  noise_nuisance: "Noise Nuisance",
  public_safety: "Public Safety Hazard",
  road_hazard: "Road Hazard",
  infrastructure: "Infrastructure Failure",
  other: "Other",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const color = confidence >= 70 ? "var(--beacon-green)" : confidence >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 500 }}>Verification confidence</span>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color }}>{confidence}%</span>
      </div>
      <div style={{ height: "6px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${confidence}%`, background: color, borderRadius: "3px", transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address, walletProvider, isConnected, privyWallet } = useWallet();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [corroborating, setCorroborating] = useState(false);
  const [corroborateMsg, setCorroborateMsg] = useState("");
  const [corroborateError, setCorroborateError] = useState("");
  const [corroborateDone, setCorroborateDone] = useState(false);
  const [authorityRef, setAuthorityRef] = useState("");
  const [markingAuthority, setMarkingAuthority] = useState(false);
  const [authorityDone, setAuthorityDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      // First try DB (has on-chain data cached)
      try {
        const res = await fetch(`/api/incidents?id=${id}`);
        if (res.ok) {
          const row = await res.json() as { chain_data: Incident };
          if (row.chain_data) {
            setIncident(row.chain_data);
          }
        }
      } catch { /* fallback to chain */ }

      // Also try reading fresh from chain
      try {
        const inc = await readIncident(id);
        if (inc) setIncident(inc);
        const val = await readIncidentValidation(id);
        if (val) setValidation(val);
      } catch { /* ignore */ }

      setLoading(false);
    }
    load();
  }, [id]);

  async function handleCorroborate() {
    if (!address || !walletProvider) return;
    setCorroborating(true);
    setCorroborateError("");
    try {
      const receipt = await corroborateIncident(address, walletProvider, id, corroborateMsg || "I witnessed this incident.", privyWallet);
      if (receipt.status === "failed") {
        setCorroborateError("Transaction failed. You may have already corroborated this, or submitted it yourself.");
      } else {
        setCorroborateDone(true);
        if (incident) setIncident({ ...incident, corroboration_count: (incident.corroboration_count ?? 0) + 1 });
      }
    } catch (err) {
      setCorroborateError(String(err));
    } finally {
      setCorroborating(false);
    }
  }

  async function handleMarkAuthority() {
    if (!address || !walletProvider || !authorityRef) return;
    setMarkingAuthority(true);
    try {
      const receipt = await markAuthorityReceived(address, walletProvider, id, authorityRef, privyWallet);
      if (receipt.status !== "failed") setAuthorityDone(true);
    } catch { /* ignore */ }
    finally { setMarkingAuthority(false); }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <Nav />
        <div style={{ maxWidth: "680px", margin: "0 auto", padding: "32px 24px" }}>
          <div className="skeleton" style={{ height: "24px", width: "200px", marginBottom: "24px" }} />
          <div className="skeleton" style={{ height: "40px", width: "70%", marginBottom: "16px" }} />
          <div className="skeleton" style={{ height: "120px", marginBottom: "16px" }} />
          <div className="skeleton" style={{ height: "80px" }} />
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <Nav />
        <div style={{ maxWidth: "680px", margin: "48px auto", padding: "0 24px", textAlign: "center" }}>
          <AlertTriangle size={36} style={{ margin: "0 auto 16px", color: "var(--muted)" }} />
          <h2 style={{ fontWeight: 700, marginBottom: "8px" }}>Incident not found</h2>
          <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
            This incident ID does not exist on-chain yet, or the contract address is not configured.
          </p>
          <Link href="/" style={{ color: "var(--beacon-green)", fontWeight: 600, textDecoration: "none" }}>
            Go back to feed
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = address?.toLowerCase() === incident.submitter?.toLowerCase();

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav />
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "32px 24px 80px" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--muted)", fontSize: "0.85rem", textDecoration: "none", marginBottom: "24px" }}>
          <ChevronLeft size={15} /> Back to feed
        </Link>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {INCIDENT_LABELS[incident.type] ?? incident.type}
            </span>
            <StatusBadge status={incident.status} />
            <SeverityBadge severity={incident.severity} />
          </div>
          <p style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--muted)" }}>{incident.id}</p>
        </div>

        {/* Description */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "14px",
            padding: "24px",
            border: "1px solid var(--border)",
            marginBottom: "16px",
            borderLeft: `4px solid ${getSeverityColor(incident.severity)}`,
          }}
        >
          <p style={{ fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "16px" }}>{incident.description}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "0.8rem", color: "var(--muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <MapPin size={13} /> {incident.location?.label}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={13} /> {timeAgo(incident.submitted_at)}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Users size={13} /> {incident.corroboration_count ?? 0} corroboration{incident.corroboration_count === 1 ? "" : "s"}
            </span>
          </div>
          {incident.location?.lat && incident.location.lat !== "0" && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${incident.location.lat}&mlon=${incident.location.lng}#map=16/${incident.location.lat}/${incident.location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--beacon-green)", marginTop: "12px", textDecoration: "none", fontWeight: 600 }}
            >
              View on map <ExternalLink size={12} />
            </a>
          )}
        </div>

        {/* Validation panel */}
        {validation && (
          <div style={{ background: "var(--surface)", borderRadius: "14px", padding: "24px", border: "1px solid var(--border)", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Shield size={18} style={{ color: "var(--beacon-green)" }} />
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>AI Verification</h3>
            </div>
            <ConfidenceMeter confidence={validation.confidence} />
            <p style={{ fontSize: "0.875rem", lineHeight: 1.6, marginTop: "14px", color: "var(--muted)" }}>
              {validation.reasoning}
            </p>
            {validation.council_data_consulted && (
              <p style={{ fontSize: "0.78rem", color: "var(--beacon-green)", marginTop: "10px", fontWeight: 500 }}>
                Public records were consulted during validation.
              </p>
            )}
          </div>
        )}

        {/* Evidence */}
        {incident.evidence_urls?.length > 0 && (
          <div style={{ background: "var(--surface)", borderRadius: "14px", padding: "24px", border: "1px solid var(--border)", marginBottom: "16px" }}>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "14px" }}>Evidence ({incident.evidence_urls.length})</h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {incident.evidence_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Evidence ${i + 1}`}
                    style={{ width: "120px", height: "90px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border)", cursor: "pointer" }}
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Corroborate section */}
        <WalletGate>
          {!isOwner && incident.status !== "CLOSED" && (
            <div style={{ background: "var(--surface)", borderRadius: "14px", padding: "24px", border: "1px solid var(--border)", marginBottom: "16px" }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "8px" }}>Did you see this too?</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "16px" }}>
                Corroborating reports raise the verification confidence and make this harder to ignore.
              </p>
              {corroborateDone ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--beacon-green)", fontWeight: 600 }}>
                  <CheckCircle size={18} /> Corroborated. Thank you.
                </div>
              ) : (
                <>
                  <textarea
                    placeholder="Add a brief statement about what you witnessed (optional)"
                    value={corroborateMsg}
                    onChange={e => setCorroborateMsg(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid var(--border)",
                      fontSize: "0.875rem",
                      fontFamily: "inherit",
                      resize: "vertical",
                      outline: "none",
                      marginBottom: "12px",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--beacon-green)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border)")}
                  />
                  {corroborateError && (
                    <p style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: "10px" }}>{corroborateError}</p>
                  )}
                  <button
                    onClick={handleCorroborate}
                    disabled={corroborating}
                    style={{
                      padding: "10px 20px",
                      background: corroborating ? "var(--border)" : "var(--beacon-green)",
                      color: corroborating ? "var(--muted)" : "#fff",
                      borderRadius: "8px",
                      border: "none",
                      fontWeight: 600,
                      cursor: corroborating ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {corroborating ? <><Loader2 size={15} className="animate-spin-slow" /> Submitting...</> : "I saw this too"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Authority reference — only for submitter */}
          {isOwner && incident.status !== "CLOSED" && (
            <div style={{ background: "var(--surface)", borderRadius: "14px", padding: "24px", border: "1px solid var(--border)" }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "8px" }}>Mark as received by authority</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "16px" }}>
                If a council officer or police reference number has been issued, record it here permanently.
              </p>
              {authorityDone ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--beacon-green)", fontWeight: 600 }}>
                  <CheckCircle size={18} /> Reference recorded on-chain.
                </div>
              ) : (
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    placeholder="e.g. Police ref: CRM-2024-8821"
                    value={authorityRef}
                    onChange={e => setAuthorityRef(e.target.value)}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: "8px", border: "1.5px solid var(--border)", fontSize: "0.875rem", fontFamily: "inherit", outline: "none" }}
                    onFocus={e => (e.target.style.borderColor = "var(--beacon-green)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border)")}
                  />
                  <button
                    onClick={handleMarkAuthority}
                    disabled={!authorityRef || markingAuthority}
                    style={{ padding: "10px 16px", background: "var(--beacon-green)", color: "#fff", borderRadius: "8px", border: "none", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    {markingAuthority ? "Saving..." : "Record it"}
                  </button>
                </div>
              )}
            </div>
          )}
        </WalletGate>
      </div>
    </div>
  );
}

function getSeverityColor(severity: string) {
  const colors: Record<string, string> = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444", critical: "#7c3aed" };
  return colors[severity?.toLowerCase()] ?? "#e4e4e7";
}
