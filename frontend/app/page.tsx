"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Shield, Zap, Database, Plus, ArrowRight } from "lucide-react";
import { Nav } from "@/components/Nav";
import { IncidentCard } from "@/components/IncidentCard";
import type { Incident } from "@/lib/genlayer";

function HeroSection() {
  return (
    <section
      style={{
        background: "linear-gradient(135deg, #000 0%, #0d1a0c 100%)",
        color: "#fff",
        padding: "80px 24px 100px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", top: "-60px", right: "-60px",
        width: "320px", height: "320px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(55,171,47,0.15) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-40px", left: "-40px",
        width: "200px", height: "200px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(55,171,47,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div className="animate-pulse-beacon" style={{ margin: "0 auto 28px", width: "72px", height: "72px" }}>
          <Image src="/beacon-logo.svg" alt="Beacon" width={72} height={72} />
        </div>

        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.2rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            marginBottom: "20px",
          }}
          className="animate-fade-up"
        >
          Your neighbourhood deserves{" "}
          <span style={{ color: "#37ab2f" }}>the truth.</span>
        </h1>

        <p
          style={{
            fontSize: "1.1rem",
            color: "rgba(255,255,255,0.7)",
            lineHeight: 1.7,
            marginBottom: "36px",
            maxWidth: "520px",
            margin: "0 auto 36px",
          }}
          className="animate-fade-up"
        >
          Submit an incident. The AI cross-checks it against public records and corroborating reports.
          Verified. On-chain. Impossible to quietly ignore.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }} className="animate-fade-up">
          <Link
            href="/report"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#37ab2f",
              color: "#fff",
              borderRadius: "10px",
              padding: "12px 28px",
              fontWeight: 700,
              fontSize: "1rem",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
            className="hover:opacity-90"
          >
            <Plus size={18} />
            Report an incident
          </Link>
          <Link
            href="#feed"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              borderRadius: "10px",
              padding: "12px 28px",
              fontWeight: 600,
              fontSize: "1rem",
              textDecoration: "none",
              transition: "all 0.15s ease",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            See what&apos;s happening <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { icon: Plus, title: "You submit", body: "Describe what happened. Add photos or video, your location. Takes two minutes." },
    { icon: Zap, title: "The AI verifies", body: "GenLayer's AI cross-references your report against public council records and corroborating submissions." },
    { icon: Shield, title: "It goes on the record", body: "Verified incidents live on-chain. Immutable. The authority gets a structured report they cannot claim not to have received." },
    { icon: Database, title: "Patterns surface", body: "Recurring incidents in the same area automatically cluster. Neighbourhood-wide trends become undeniable." },
  ];

  return (
    <section style={{ padding: "72px 24px", background: "var(--background)" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "8px", textAlign: "center" }}>
          How it works
        </h2>
        <p style={{ color: "var(--muted)", textAlign: "center", marginBottom: "48px" }}>
          Four steps. No bureaucracy. No waiting to see if someone read your email.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                background: "var(--surface)",
                borderRadius: "14px",
                padding: "24px",
                border: "1px solid var(--border)",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "var(--beacon-green-pale)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "14px",
                }}
              >
                <step.icon size={20} style={{ color: "var(--beacon-green)" }} />
              </div>
              <div style={{ position: "absolute", top: "16px", right: "20px", fontSize: "2rem", fontWeight: 900, color: "var(--border)", lineHeight: 1 }}>
                {i + 1}
              </div>
              <h3 style={{ fontWeight: 700, marginBottom: "8px", fontSize: "1rem" }}>{step.title}</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.6 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeedSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)", padding: "20px" }}>
          <div className="skeleton" style={{ height: "14px", width: "40%", marginBottom: "10px" }} />
          <div className="skeleton" style={{ height: "12px", width: "90%", marginBottom: "6px" }} />
          <div className="skeleton" style={{ height: "12px", width: "70%", marginBottom: "14px" }} />
          <div className="skeleton" style={{ height: "10px", width: "60%" }} />
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/incidents");
        const rows = await res.json() as Array<{ chain_data: Incident }>;
        const parsed = rows.map(r => r.chain_data).filter(Boolean).slice(0, 20);
        setIncidents(parsed);
      } catch {
        setIncidents([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav />
      <HeroSection />
      <HowItWorksSection />

      <section id="feed" style={{ padding: "48px 24px 80px", background: "var(--surface-2)" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Recent reports</h2>
              <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginTop: "4px" }}>
                {loading ? "Loading..." : `${incidents.length} incident${incidents.length === 1 ? "" : "s"} on record`}
              </p>
            </div>
            <Link
              href="/report"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--beacon-green)",
                color: "#fff",
                borderRadius: "8px",
                padding: "8px 18px",
                fontWeight: 600,
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              <Plus size={15} />
              Report incident
            </Link>
          </div>

          {loading ? (
            <FeedSkeleton />
          ) : incidents.length === 0 ? (
            <div style={{ background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)", padding: "60px 24px", textAlign: "center" }}>
              <Shield size={36} style={{ margin: "0 auto 16px", color: "var(--border)" }} />
              <h3 style={{ fontWeight: 700, marginBottom: "8px" }}>Nothing to see here yet</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                Good news, or nobody&apos;s filed a report. Either way, be the first.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {incidents.map(incident => (
                <div key={incident.id} className="animate-fade-up">
                  <IncidentCard incident={incident} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
