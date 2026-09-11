"use client";

import React, { useState, useEffect } from "react";
import { QrCode, X, Copy, Check } from "lucide-react";
import { BRAND } from "@/lib/brand";

export function QRCodeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && typeof window !== "undefined") setUrl(window.location.href);
  }, [isOpen]);

  if (!isOpen) return null;

  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url || "https://wellup.vercel.app")}&color=246640&bgcolor=F2F9F4&margin=2`;

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <div className="w-full max-w-sm animate-scaleUp text-center"
        style={{
          background: "var(--surface)",
          border: "1.5px solid var(--border)",
          borderRadius: "20px",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-6 pb-4" style={{ background: "var(--gradient-hero)" }}>
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg"
            style={{ color: "var(--muted)", position: "absolute" }}>
            <X className="w-5 h-5" />
          </button>
          <div
            className="relative w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3 p-2 shadow-md border border-white/20"
            style={{ background: "radial-gradient(circle, #34d399 20%, #10b981 60%, #059669 100%)" }}
          >
            <img src="/favicon.svg" alt="WellUP" className="w-8 h-8 rounded-lg object-contain drop-shadow" />
          </div>
          <h3 className="text-lg font-extrabold" style={{ color: "var(--text)" }}>Judge / Mobile Access</h3>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Scan to test {BRAND.name} on any phone — no install needed.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-center p-3 rounded-2xl"
            style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)" }}>
            <img src={qr} alt="QR Code" className="w-44 h-44 rounded-xl" />
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl text-xs"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <span className="flex-1 truncate font-mono text-[11px]" style={{ color: "var(--muted)" }}>
              {url || "https://wellup.vercel.app"}
            </span>
            <button onClick={copy}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
              style={{
                background: copied ? "var(--primary-light)" : "var(--surface)",
                color: copied ? "var(--primary-dark)" : "var(--text)",
                border: "1px solid var(--border)",
              }}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
