"use client";

import { useEffect, useState } from "react";
import { MapPin, Filter, AlertCircle } from "lucide-react";
import { Nav } from "@/components/Nav";
import { IncidentCard } from "@/components/IncidentCard";
import type { Incident } from "@/lib/genlayer";
import { INCIDENT_TYPES } from "@/lib/constants";

export default function MapPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [neighbourhood, setNeighbourhood] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const url = neighbourhood
          ? `/api/incidents?neighbourhood=${encodeURIComponent(neighbourhood)}`
          : "/api/incidents";
        const res = await fetch(url);
        const rows = await res.json() as Array<{ chain_data: Incident }>;
        setIncidents(rows.map(r => r.chain_data).filter(Boolean));
      } catch {
        setIncidents([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [neighbourhood]);

  const filtered = incidents.filter(i => {
    if (filter === "all") return true;
    if (filter === "verified") return i.status === "VERIFIED";
    if (filter === "pending") return i.status === "PENDING";
    return i.type === filter;
  });

  // Group incidents with coordinates for "map" display
  const withCoords = filtered.filter(i => i.location?.lat && i.location.lat !== "0");

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav />
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px 80px" }}>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "6px" }}>
            Neighbourhood map
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            Every dot is a verified report. Clusters tell you where the problem actually is.
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <MapPin size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input
              placeholder="Filter by neighbourhood ID..."
              value={neighbourhood}
              onChange={e => { setNeighbourhood(e.target.value); setLoading(true); }}
              style={{ width: "100%", paddingLeft: "30px", paddingRight: "12px", paddingTop: "9px", paddingBottom: "9px", borderRadius: "8px", border: "1.5px solid var(--border)", fontSize: "0.875rem", fontFamily: "inherit", outline: "none" }}
              onFocus={e => (e.target.style.borderColor = "var(--beacon-green)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <div style={{ position: "relative" }}>
            <Filter size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ paddingLeft: "30px", paddingRight: "12px", paddingTop: "9px", paddingBottom: "9px", borderRadius: "8px", border: "1.5px solid var(--border)", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", appearance: "none", background: "var(--surface)" }}
              onFocus={e => (e.target.style.borderColor = "var(--beacon-green)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            >
              <option value="all">All types</option>
              <option value="verified">Verified only</option>
              <option value="pending">Pending</option>
              {INCIDENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Map visual placeholder with incident dots */}
        {withCoords.length > 0 && (
          <div
            style={{
              background: "#e8f4e8",
              borderRadius: "14px",
              padding: "24px",
              marginBottom: "24px",
              border: "1px solid var(--border)",
              position: "relative",
              minHeight: "200px",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, #c8e6c8 1px, transparent 1px)", backgroundSize: "30px 30px", opacity: 0.6 }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {withCoords.slice(0, 20).map(inc => (
                  <a
                    key={inc.id}
                    href={`/incident/${inc.id}`}
                    title={inc.location.label}
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      background: inc.status === "VERIFIED" ? "var(--beacon-green)" : "#f59e0b",
                      border: "2px solid #fff",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                      display: "inline-block",
                      cursor: "pointer",
                      transition: "transform 0.15s ease",
                    }}
                    className="hover:scale-150"
                  />
                ))}
              </div>
              <p style={{ fontSize: "0.75rem", color: "#166534", marginTop: "16px", fontWeight: 500 }}>
                {withCoords.length} incident{withCoords.length === 1 ? "" : "s"} with location data.
                Green = verified. Amber = pending.
              </p>
            </div>
          </div>
        )}

        {/* Incident list */}
        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontWeight: 700, fontSize: "1rem" }}>
            {filtered.length} incident{filtered.length === 1 ? "" : "s"}
            {filter !== "all" ? ` — ${filter}` : ""}
          </h2>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)", padding: "20px" }}>
                <div className="skeleton" style={{ height: "14px", width: "40%", marginBottom: "10px" }} />
                <div className="skeleton" style={{ height: "12px", width: "80%", marginBottom: "6px" }} />
                <div className="skeleton" style={{ height: "10px", width: "60%" }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)", padding: "60px 24px", textAlign: "center" }}>
            <AlertCircle size={36} style={{ margin: "0 auto 16px", color: "var(--border)" }} />
            <h3 style={{ fontWeight: 700, marginBottom: "8px" }}>Nothing here</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              No incidents match that filter. Try broadening it, or be the first to report something.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {filtered.map(incident => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
