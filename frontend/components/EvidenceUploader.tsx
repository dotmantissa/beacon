"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";

export interface EvidenceRef {
  url: string;
  sha256: string;
}

interface Props {
  value: EvidenceRef[];
  onChange: (evidence: EvidenceRef[]) => void;
  maxFiles?: number;
}

export function EvidenceUploader({ value, onChange, maxFiles = 5 }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    if (value.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }
    setUploading(true);
    setError("");

    const newEvidence: EvidenceRef[] = [];
    const remaining = Math.max(0, maxFiles - value.length);
    for (const file of Array.from(files).slice(0, remaining)) {
      try {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          setError("Only JPG, PNG, and WebP evidence is supported");
          continue;
        }
        if (file.size > 750_000) {
          setError("Each evidence image must be 750KB or smaller");
          continue;
        }
        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: base64, fileName: file.name }),
        });
        let data: {
          url?: string;
          sha256?: string;
          error?: string;
        };
        try {
          data = await res.json() as {
            url?: string;
            sha256?: string;
            error?: string;
          };
        } catch {
          data = {};
        }
        if (data.url && data.sha256) {
          newEvidence.push({ url: data.url, sha256: data.sha256 });
        }
        else setError(data.error ?? `Upload failed (${res.status})`);
      } catch {
        setError("Upload failed. Try again.");
      }
    }

    onChange([...value, ...newEvidence]);
    setUploading(false);
  }

  function remove(url: string) {
    onChange(value.filter(item => item.url !== url));
  }

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: "2px dashed var(--border)",
          borderRadius: "10px",
          padding: "24px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.15s ease",
          background: "var(--surface-2)",
        }}
        className="hover:border-[var(--beacon-green)] hover:bg-[var(--beacon-green-pale)]"
      >
        <Upload size={20} style={{ margin: "0 auto 8px", color: "var(--muted)" }} />
        <p style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
          {uploading ? "Uploading..." : "Drop photos here, or click to browse"}
        </p>
        <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "4px" }}>
          JPG, PNG, or WebP up to 750KB each
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />

      {error && (
        <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "6px" }}>{error}</p>
      )}

      {/* Previews */}
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
          {value.map((item, i) => (
            <div
              key={item.url}
              style={{
                position: "relative",
                width: "80px",
                height: "80px",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                flexShrink: 0,
              }}
            >
              {item.url.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                  <ImageIcon size={24} style={{ color: "var(--muted)" }} />
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(item.url)}
                aria-label={`Remove evidence ${i + 1}`}
                style={{
                  position: "absolute",
                  top: "3px",
                  right: "3px",
                  background: "rgba(0,0,0,0.6)",
                  border: "none",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#fff",
                }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
