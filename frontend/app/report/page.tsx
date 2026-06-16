"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, AlertTriangle, CheckCircle, Loader2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { WalletGate } from "@/components/WalletGate";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { useWallet } from "@/components/WalletProvider";
import { submitIncident } from "@/lib/genlayer";
import { INCIDENT_TYPES, SEVERITY_LEVELS } from "@/lib/constants";

type Step = "details" | "location" | "evidence" | "review" | "submitting" | "done" | "error";

interface FormData {
  incident_type: string;
  description: string;
  severity: string;
  location_lat: string;
  location_lng: string;
  location_label: string;
  neighbourhood_id: string;
  evidence_urls: string[];
}

const EMPTY: FormData = {
  incident_type: "",
  description: "",
  severity: "medium",
  location_lat: "",
  location_lng: "",
  location_label: "",
  neighbourhood_id: "default",
  evidence_urls: [],
};

function ProgressBar({ step }: { step: Step }) {
  const steps: Step[] = ["details", "location", "evidence", "review"];
  const idx = steps.indexOf(step);
  const progress = idx < 0 ? (step === "submitting" || step === "done" ? 100 : 0) : ((idx + 1) / steps.length) * 100;

  return (
    <div style={{ width: "100%", height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "var(--beacon-green)",
          borderRadius: "2px",
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

function StepDetails({ data, onChange, onNext }: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
  onNext: () => void;
}) {
  const canNext = data.incident_type && data.description.length >= 30;

  return (
    <div className="animate-fade-up">
      <h2 style={{ fontWeight: 700, fontSize: "1.2rem", marginBottom: "6px" }}>What happened?</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "28px" }}>
        Be specific. Vague reports are hard to verify and easy to dismiss.
      </p>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: "8px" }}>
          Incident type
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "8px" }}>
          {INCIDENT_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ incident_type: t.value })}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1.5px solid",
                borderColor: data.incident_type === t.value ? "var(--beacon-green)" : "var(--border)",
                background: data.incident_type === t.value ? "var(--beacon-green-pale)" : "var(--surface)",
                color: data.incident_type === t.value ? "var(--beacon-green)" : "var(--foreground)",
                fontWeight: data.incident_type === t.value ? 600 : 500,
                fontSize: "0.8rem",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: "8px" }}>
          Severity
        </label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {SEVERITY_LEVELS.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange({ severity: s.value })}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1.5px solid",
                borderColor: data.severity === s.value ? s.color : "var(--border)",
                background: data.severity === s.value ? `${s.color}18` : "var(--surface)",
                color: data.severity === s.value ? s.color : "var(--muted)",
                fontWeight: data.severity === s.value ? 700 : 500,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "28px" }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: "8px" }}>
          Description <span style={{ color: "var(--muted)", fontWeight: 400 }}>({data.description.length}/30 min)</span>
        </label>
        <textarea
          value={data.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Describe exactly what you saw — time, what was happening, how many people were involved, any distinguishing details."
          rows={5}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "1.5px solid var(--border)",
            fontSize: "0.9rem",
            lineHeight: 1.6,
            resize: "vertical",
            fontFamily: "inherit",
            outline: "none",
            transition: "border-color 0.15s ease",
          }}
          onFocus={e => (e.target.style.borderColor = "var(--beacon-green)")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
        />
        {data.description.length > 0 && data.description.length < 30 && (
          <p style={{ color: "#ef4444", fontSize: "0.78rem", marginTop: "4px" }}>
            Add a bit more detail ({30 - data.description.length} chars to go)
          </p>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={!canNext}
        style={{
          width: "100%",
          padding: "12px",
          background: canNext ? "var(--beacon-green)" : "var(--border)",
          color: canNext ? "#fff" : "var(--muted)",
          borderRadius: "10px",
          border: "none",
          fontWeight: 700,
          fontSize: "1rem",
          cursor: canNext ? "pointer" : "not-allowed",
          transition: "all 0.15s ease",
        }}
      >
        Continue
      </button>
    </div>
  );
}

function StepLocation({ data, onChange, onNext, onBack }: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [detecting, setDetecting] = useState(false);
  const [geoError, setGeoError] = useState("");
  const canNext = data.location_label.length > 0;

  function detectLocation() {
    if (!navigator.geolocation) { setGeoError("Geolocation not supported in this browser"); return; }
    setDetecting(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        onChange({ location_lat: lat, location_lng: lng });
        setDetecting(false);
      },
      () => {
        setGeoError("Location access denied. Enter an address manually below.");
        setDetecting(false);
      }
    );
  }

  return (
    <div className="animate-fade-up">
      <h2 style={{ fontWeight: 700, fontSize: "1.2rem", marginBottom: "6px" }}>Where did this happen?</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "28px" }}>
        Location data makes the pattern analysis actually useful.
      </p>

      <button
        type="button"
        onClick={detectLocation}
        disabled={detecting}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "10px",
          border: "2px dashed var(--border)",
          background: "var(--surface-2)",
          cursor: detecting ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          fontWeight: 600,
          fontSize: "0.9rem",
          color: detecting ? "var(--muted)" : "var(--foreground)",
          marginBottom: "16px",
          transition: "all 0.15s ease",
        }}
        className="hover:border-[var(--beacon-green)] hover:bg-[var(--beacon-green-pale)]"
      >
        {detecting ? (
          <Loader2 size={18} className="animate-spin-slow" style={{ color: "var(--beacon-green)" }} />
        ) : (
          <MapPin size={18} style={{ color: "var(--beacon-green)" }} />
        )}
        {detecting ? "Detecting your location..." : "Use my current location"}
      </button>

      {(data.location_lat || data.location_lng) && (
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "12px", textAlign: "center" }}>
          Coordinates locked: {data.location_lat}, {data.location_lng}
        </p>
      )}

      {geoError && (
        <p style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: "12px" }}>{geoError}</p>
      )}

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <input
          placeholder="Latitude (optional)"
          value={data.location_lat}
          onChange={e => onChange({ location_lat: e.target.value })}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1.5px solid var(--border)",
            fontSize: "0.875rem",
            fontFamily: "inherit",
            outline: "none",
          }}
          onFocus={e => (e.target.style.borderColor = "var(--beacon-green)")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
        />
        <input
          placeholder="Longitude (optional)"
          value={data.location_lng}
          onChange={e => onChange({ location_lng: e.target.value })}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1.5px solid var(--border)",
            fontSize: "0.875rem",
            fontFamily: "inherit",
            outline: "none",
          }}
          onFocus={e => (e.target.style.borderColor = "var(--beacon-green)")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: "8px" }}>
          Address or description of location <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          placeholder="e.g. Corner of Oak Street and High Road, near the newsagent"
          value={data.location_label}
          onChange={e => onChange({ location_label: e.target.value })}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "1.5px solid var(--border)",
            fontSize: "0.9rem",
            fontFamily: "inherit",
            outline: "none",
            transition: "border-color 0.15s ease",
          }}
          onFocus={e => (e.target.style.borderColor = "var(--beacon-green)")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
        />
      </div>

      <div style={{ marginBottom: "28px" }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: "8px" }}>
          Neighbourhood ID <span style={{ color: "var(--muted)", fontWeight: 400 }}>(leave as default if unsure)</span>
        </label>
        <input
          placeholder="e.g. hackney-central or SW1A"
          value={data.neighbourhood_id}
          onChange={e => onChange({ neighbourhood_id: e.target.value || "default" })}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "1.5px solid var(--border)",
            fontSize: "0.9rem",
            fontFamily: "inherit",
            outline: "none",
          }}
          onFocus={e => (e.target.style.borderColor = "var(--beacon-green)")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
        />
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={onBack}
          style={{ flex: 1, padding: "12px", background: "var(--surface-2)", color: "var(--foreground)", borderRadius: "10px", border: "1.5px solid var(--border)", fontWeight: 600, fontSize: "1rem", cursor: "pointer" }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canNext}
          style={{ flex: 2, padding: "12px", background: canNext ? "var(--beacon-green)" : "var(--border)", color: canNext ? "#fff" : "var(--muted)", borderRadius: "10px", border: "none", fontWeight: 700, fontSize: "1rem", cursor: canNext ? "pointer" : "not-allowed" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function StepEvidence({ data, onChange, onNext, onBack }: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="animate-fade-up">
      <h2 style={{ fontWeight: 700, fontSize: "1.2rem", marginBottom: "6px" }}>Got any evidence?</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "28px" }}>
        Photos and video dramatically increase verification confidence. Totally optional, but worth it.
      </p>

      <EvidenceUploader
        value={data.evidence_urls}
        onChange={urls => onChange({ evidence_urls: urls })}
      />

      <div style={{ display: "flex", gap: "10px", marginTop: "28px" }}>
        <button onClick={onBack} style={{ flex: 1, padding: "12px", background: "var(--surface-2)", color: "var(--foreground)", borderRadius: "10px", border: "1.5px solid var(--border)", fontWeight: 600, cursor: "pointer" }}>
          Back
        </button>
        <button onClick={onNext} style={{ flex: 2, padding: "12px", background: "var(--beacon-green)", color: "#fff", borderRadius: "10px", border: "none", fontWeight: 700, fontSize: "1rem", cursor: "pointer" }}>
          {data.evidence_urls.length === 0 ? "Skip, continue without" : "Continue with evidence"}
        </button>
      </div>
    </div>
  );
}

function StepReview({ data, onSubmit, onBack, submitting }: {
  data: FormData;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
}) {
  const incidentLabel = INCIDENT_TYPES.find(t => t.value === data.incident_type)?.label ?? data.incident_type;
  const severityLabel = SEVERITY_LEVELS.find(s => s.value === data.severity)?.label ?? data.severity;

  return (
    <div className="animate-fade-up">
      <h2 style={{ fontWeight: 700, fontSize: "1.2rem", marginBottom: "6px" }}>Ready to submit</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "24px" }}>
        Once submitted, this goes on-chain and cannot be altered. Make sure it&apos;s accurate.
      </p>

      <div style={{ background: "var(--surface-2)", borderRadius: "12px", padding: "20px", marginBottom: "24px", border: "1px solid var(--border)" }}>
        <Row label="Type" value={incidentLabel} />
        <Row label="Severity" value={severityLabel} />
        <Row label="Location" value={data.location_label} />
        <Row label="Description" value={data.description} last />
        {data.evidence_urls.length > 0 && (
          <Row label="Evidence" value={`${data.evidence_urls.length} file${data.evidence_urls.length > 1 ? "s" : ""} attached`} last />
        )}
      </div>

      <div style={{ background: "var(--beacon-green-pale)", borderRadius: "10px", padding: "14px 16px", marginBottom: "24px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <AlertTriangle size={16} style={{ color: "var(--beacon-green)", marginTop: "2px", flexShrink: 0 }} />
        <p style={{ fontSize: "0.82rem", color: "#166534", lineHeight: 1.6 }}>
          The AI validator will cross-reference this against public records. It takes about 20 to 40 seconds. Sit tight.
        </p>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={onBack} disabled={submitting} style={{ flex: 1, padding: "12px", background: "var(--surface-2)", color: submitting ? "var(--muted)" : "var(--foreground)", borderRadius: "10px", border: "1.5px solid var(--border)", fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer" }}>
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          style={{ flex: 2, padding: "12px", background: submitting ? "var(--border)" : "var(--beacon-green)", color: submitting ? "var(--muted)" : "#fff", borderRadius: "10px", border: "none", fontWeight: 700, fontSize: "1rem", cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          {submitting ? <><Loader2 size={16} className="animate-spin-slow" /> Submitting to chain...</> : "Submit incident"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", gap: "12px", padding: "8px 0", borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--muted)", width: "90px", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>{value}</span>
    </div>
  );
}

function StepDone({ incidentId }: { incidentId: string }) {
  return (
    <div className="animate-fade-up" style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ margin: "0 auto 20px", width: "60px", height: "60px", borderRadius: "50%", background: "var(--beacon-green-pale)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CheckCircle size={30} style={{ color: "var(--beacon-green)" }} />
      </div>
      <h2 style={{ fontWeight: 700, fontSize: "1.3rem", marginBottom: "8px" }}>It&apos;s on the record.</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "28px" }}>
        Your incident has been submitted and verified on-chain. The AI ran its check.
        Now it cannot be quietly swept under the rug.
      </p>
      <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
        <Link
          href={`/incident/${incidentId}`}
          style={{ display: "inline-block", padding: "10px 24px", background: "var(--beacon-green)", color: "#fff", borderRadius: "8px", fontWeight: 600, textDecoration: "none" }}
        >
          View your report
        </Link>
        <Link
          href="/"
          style={{ display: "inline-block", padding: "10px 24px", background: "var(--surface-2)", color: "var(--foreground)", borderRadius: "8px", fontWeight: 600, textDecoration: "none", border: "1px solid var(--border)" }}
        >
          Back to feed
        </Link>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { address, walletProvider, privyWallet } = useWallet();
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState<FormData>(EMPTY);
  const [incidentId, setIncidentId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  function update(partial: Partial<FormData>) {
    setForm(f => ({ ...f, ...partial }));
  }

  async function handleSubmit() {
    if (!address || !walletProvider) return;
    setStep("submitting");

    try {
      const receipt = await submitIncident(address, walletProvider, {
        incident_type: form.incident_type,
        description: form.description,
        location_lat: form.location_lat || "0",
        location_lng: form.location_lng || "0",
        location_label: form.location_label,
        neighbourhood_id: form.neighbourhood_id,
        evidence_urls: form.evidence_urls,
        severity: form.severity,
      }, privyWallet);

      if (receipt.status === "failed") {
        setErrorMsg("Transaction failed on-chain. Try again.");
        setStep("error");
        return;
      }

      // Save to DB so it shows in the feed
      const generatedId = `BCN-pending-${Date.now()}`;
      const id = generatedId;
      await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          chain_data: {
            id,
            type: form.incident_type,
            description: form.description,
            location: { lat: form.location_lat || "0", lng: form.location_lng || "0", label: form.location_label },
            neighbourhood_id: form.neighbourhood_id,
            evidence_urls: form.evidence_urls,
            severity: form.severity,
            submitter: address,
            submitted_at: new Date().toISOString(),
            status: "PENDING",
            status_code: 0,
            corroboration_count: 0,
          },
          tx_hash: receipt.hash,
          submitter_address: address,
          neighbourhood_id: form.neighbourhood_id,
          evidence_urls: form.evidence_urls,
        }),
      });

      setIncidentId(id);
      setStep("done");
    } catch (err) {
      setErrorMsg(String(err));
      setStep("error");
    }
  }

  const STEP_TITLES: Record<Step, string> = {
    details: "Details",
    location: "Location",
    evidence: "Evidence",
    review: "Review",
    submitting: "Submitting",
    done: "Done",
    error: "Error",
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav />
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          {step !== "done" && step !== "submitting" && step !== "error" && (
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--muted)", fontSize: "0.85rem", textDecoration: "none", marginBottom: "16px" }}>
              <ChevronLeft size={15} /> Back
            </Link>
          )}
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "12px" }}>
            {step === "done" ? "Submitted" : "Report an incident"}
          </h1>
          <ProgressBar step={step} />
          {step !== "done" && step !== "error" && step !== "submitting" && (
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "8px" }}>
              Step {["details", "location", "evidence", "review"].indexOf(step) + 1} of 4 — {STEP_TITLES[step]}
            </p>
          )}
        </div>

        <WalletGate>
          {step === "details" && <StepDetails data={form} onChange={update} onNext={() => setStep("location")} />}
          {step === "location" && <StepLocation data={form} onChange={update} onNext={() => setStep("evidence")} onBack={() => setStep("details")} />}
          {step === "evidence" && <StepEvidence data={form} onChange={update} onNext={() => setStep("review")} onBack={() => setStep("location")} />}
          {step === "review" && <StepReview data={form} onSubmit={handleSubmit} onBack={() => setStep("evidence")} submitting={false} />}
          {step === "submitting" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div className="animate-pulse-beacon" style={{ margin: "0 auto 24px", width: "56px", height: "56px", borderRadius: "50%", background: "var(--beacon-green-pale)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={28} style={{ color: "var(--beacon-green)" }} className="animate-spin-slow" />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "8px" }}>Submitting to GenLayer</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                The AI is running its checks against public records. This usually takes 20 to 40 seconds.
              </p>
            </div>
          )}
          {step === "done" && <StepDone incidentId={incidentId} />}
          {step === "error" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <AlertTriangle size={36} style={{ margin: "0 auto 16px", color: "#ef4444" }} />
              <h3 style={{ fontWeight: 700, marginBottom: "8px" }}>Something went wrong</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "24px" }}>{errorMsg}</p>
              <button
                onClick={() => setStep("review")}
                style={{ padding: "10px 24px", background: "var(--beacon-green)", color: "#fff", borderRadius: "8px", border: "none", fontWeight: 600, cursor: "pointer" }}
              >
                Try again
              </button>
            </div>
          )}
        </WalletGate>
      </div>
    </div>
  );
}
