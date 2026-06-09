"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Film } from "lucide-react";

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
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

    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      try {
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
        const data = await res.json() as { url?: string; error?: string };
        if (data.url) newUrls.push(data.url);
        else setError(data.error ?? "Upload failed");
      } catch {
        setError("Upload failed. Try again.");
      }
    }

    onChange([...value, ...newUrls]);
    setUploading(false);
  }

  function remove(url: string) {
    onChange(value.filter(u => u !== url));
  }

  function isVideo(url: string) {
    return /\.(mp4|mov|avi|webm)/i.test(url) || url.startsWith("data:video");
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
          {uploading ? "Uploading..." : "Drop photos or video here, or click to browse"}
        </p>
        <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "4px" }}>
          JPG, PNG, MP4 up to 20MB each
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        multiple
        accept="image/*,video/*"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />

      {error && (
        <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "6px" }}>{error}</p>
      )}

      {/* Previews */}
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
          {value.map((url, i) => (
            <div
              key={i}
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
              {isVideo(url) ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                  <Film size={24} style={{ color: "var(--muted)" }} />
                </div>
              ) : url.startsWith("data:image") || url.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                  <ImageIcon size={24} style={{ color: "var(--muted)" }} />
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(url)}
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
