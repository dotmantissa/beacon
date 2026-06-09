"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, MessageSquare, Clock, ChevronRight, Users } from "lucide-react";
import { StatusBadge, SeverityBadge } from "@/components/Badges";
import type { Incident } from "@/lib/genlayer";

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

interface Props {
  incident: Incident;
  showCorroborate?: boolean;
  onCorroborate?: () => void;
  corroborating?: boolean;
}

export function IncidentCard({ incident, showCorroborate, onCorroborate, corroborating }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasEvidence = incident.evidence_urls?.length > 0;

  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "14px",
        border: "1px solid var(--border)",
        overflow: "hidden",
        transition: "box-shadow 0.2s ease",
        borderLeft: `4px solid ${getSeverityColor(incident.severity)}`,
      }}
      className="hover:shadow-md"
    >
      {/* Main content */}
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Type + badges */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {INCIDENT_LABELS[incident.type] ?? incident.type}
              </span>
              <StatusBadge status={incident.status} />
              <SeverityBadge severity={incident.severity} />
            </div>

            {/* Description */}
            <p
              style={{
                fontSize: "0.9rem",
                lineHeight: 1.55,
                color: "var(--foreground)",
                marginBottom: "10px",
                display: "-webkit-box",
                WebkitLineClamp: expanded ? "none" : 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {incident.description}
            </p>

            {/* Meta */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "0.78rem", color: "var(--muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <MapPin size={12} />
                {incident.location?.label ?? "Unknown location"}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Clock size={12} />
                {timeAgo(incident.submitted_at)}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Users size={12} />
                {incident.corroboration_count ?? 0} corroboration{incident.corroboration_count === 1 ? "" : "s"}
              </span>
              {hasEvidence && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--beacon-green)" }}>
                  <MessageSquare size={12} />
                  {incident.evidence_urls.length} piece{incident.evidence_urls.length === 1 ? "" : "s"} of evidence
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
            <Link
              href={`/incident/${incident.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.8rem",
                color: "var(--beacon-green)",
                fontWeight: 600,
                textDecoration: "none",
                padding: "4px 8px",
                borderRadius: "6px",
                transition: "background 0.15s ease",
              }}
              className="hover:bg-[var(--beacon-green-pale)]"
            >
              View <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* Corroborate button */}
        {showCorroborate && onCorroborate && (
          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
            <button
              onClick={onCorroborate}
              disabled={corroborating}
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: corroborating ? "var(--muted)" : "var(--beacon-green)",
                background: "var(--beacon-green-pale)",
                border: "1.5px solid var(--beacon-green)",
                borderRadius: "8px",
                padding: "6px 14px",
                cursor: corroborating ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
                opacity: corroborating ? 0.6 : 1,
              }}
            >
              {corroborating ? "Submitting..." : "I saw this too"}
            </button>
          </div>
        )}
      </div>

      {/* Evidence thumbnails */}
      {hasEvidence && expanded && (
        <div
          style={{
            padding: "0 20px 16px",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
          }}
        >
          {incident.evidence_urls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`Evidence ${i + 1}`}
              style={{
                width: "100px",
                height: "70px",
                objectFit: "cover",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Expand toggle */}
      {(incident.description.length > 120 || hasEvidence) && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: "100%",
            padding: "8px",
            fontSize: "0.78rem",
            color: "var(--muted)",
            background: "var(--surface-2)",
            border: "none",
            borderTop: "1px solid var(--border)",
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          className="hover:bg-gray-100"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function getSeverityColor(severity: string) {
  const colors: Record<string, string> = {
    low: "#22c55e",
    medium: "#f59e0b",
    high: "#ef4444",
    critical: "#7c3aed",
  };
  return colors[severity?.toLowerCase()] ?? "#e4e4e7";
}
