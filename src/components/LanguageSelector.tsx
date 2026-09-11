"use client";

import React from "react";
import { Globe } from "lucide-react";

interface Props { language: string; onChange: (l: string) => void; }

const LANGS = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हि" },
  { code: "gu", label: "ગુ" },
];

export function LanguageSelector({ language, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 h-8 px-1.5 rounded-xl"
      style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)" }}>
      <Globe className="w-3.5 h-3.5 mx-1 flex-shrink-0" style={{ color: "var(--primary)" }} />
      {LANGS.map(l => (
        <button key={l.code} onClick={() => onChange(l.code)}
          className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
          style={{
            background: language === l.code ? "var(--primary)" : "transparent",
            color:      language === l.code ? "#fff"           : "var(--muted)",
          }}>
          {l.label}
        </button>
      ))}
    </div>
  );
}
