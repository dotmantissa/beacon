"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MapPin, Shield, Plus, User, Menu, X, AlertTriangle } from "lucide-react";
import { useWallet } from "@/components/WalletProvider";

const NAV_LINKS = [
  { href: "/", label: "Feed", icon: Shield },
  { href: "/map", label: "Map", icon: MapPin },
  { href: "/report", label: "Report", icon: Plus, highlight: true },
  { href: "/profile", label: "My Reports", icon: User },
];

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function Nav() {
  const { address, isConnected, connect, disconnect } = useWallet();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}
      className="sticky top-0 z-40"
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 flex-shrink-0 group-hover:scale-105 transition-transform">
            <Image src="/beacon-logo.svg" alt="Beacon" width={32} height={32} />
          </div>
          <span style={{ fontWeight: 700, letterSpacing: "-0.02em", fontSize: "1.15rem" }}>
            Beacon
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon, highlight }) => {
            const active = pathname === href;
            if (highlight) {
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    background: "var(--beacon-green)",
                    color: "#fff",
                    borderRadius: "8px",
                    padding: "6px 16px",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                  }}
                  className="hover:opacity-90 ml-2"
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            }
            return (
              <Link
                key={href}
                href={href}
                style={{
                  color: active ? "var(--beacon-green)" : "var(--foreground)",
                  fontWeight: active ? 600 : 500,
                  fontSize: "0.875rem",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: active ? "var(--beacon-green-pale)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
                className="hover:bg-gray-100"
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Wallet */}
        <div className="hidden md:flex items-center gap-3">
          {isConnected && address ? (
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                  background: "var(--surface-2)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontFamily: "monospace",
                }}
              >
                {shortAddr(address)}
              </span>
              <button
                onClick={disconnect}
                style={{
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  background: "transparent",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                className="hover:border-gray-400"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              style={{
                border: "1.5px solid var(--beacon-green)",
                color: "var(--beacon-green)",
                borderRadius: "8px",
                padding: "6px 14px",
                fontWeight: 600,
                fontSize: "0.875rem",
                background: "transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              className="hover:bg-[var(--beacon-green-pale)]"
            >
              Sign in
            </button>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", padding: "12px 16px 16px" }}
          className="md:hidden animate-fade-in"
        >
          {NAV_LINKS.map(({ href, label, icon: Icon, highlight }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  marginBottom: "4px",
                  fontWeight: highlight ? 600 : active ? 600 : 500,
                  color: highlight ? "var(--beacon-green)" : active ? "var(--beacon-green)" : "var(--foreground)",
                  background: active || highlight ? "var(--beacon-green-pale)" : "transparent",
                }}
              >
                <Icon size={17} />
                {label}
                {highlight && <AlertTriangle size={13} style={{ marginLeft: "auto", color: "var(--beacon-green)" }} />}
              </Link>
            );
          })}

          <div style={{ borderTop: "1px solid var(--border)", marginTop: "8px", paddingTop: "12px" }}>
            {isConnected && address ? (
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--muted)" }}>
                  {shortAddr(address)}
                </span>
                <button
                  onClick={() => { disconnect(); setMobileOpen(false); }}
                  style={{ fontSize: "0.8rem", color: "var(--muted)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => { connect(); setMobileOpen(false); }}
                style={{
                  width: "100%",
                  background: "var(--beacon-green)",
                  color: "#fff",
                  borderRadius: "8px",
                  padding: "10px",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
