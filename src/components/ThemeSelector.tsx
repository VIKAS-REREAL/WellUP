"use client";

import React, { useState } from "react";
import { Palette, Check } from "lucide-react";

type ThemeId = "green" | "blue" | "purple";

const THEMES: { id: ThemeId; label: string; color: string }[] = [
  { id: "green",  label: "Mint Sage",      color: "#5FB37B" },
  { id: "blue",   label: "Ocean Breeze",   color: "#3B82F6" },
  { id: "purple", label: "Royal Lavender", color: "#8B5CF6" },
];

function applyTheme(id: ThemeId) {
  document.documentElement.classList.remove("theme-blue", "theme-purple");
  if (id === "blue")   document.documentElement.classList.add("theme-blue");
  if (id === "purple") document.documentElement.classList.add("theme-purple");
  localStorage.setItem("wellup_theme", id);
}

export function ThemeSelector() {
  const [current, setCurrent] = useState<ThemeId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wellup_theme") as ThemeId;
      if (saved) { applyTheme(saved); return saved; }
    }
    return "green";
  });
  const [open, setOpen] = useState(false);

  const select = (id: ThemeId) => { applyTheme(id); setCurrent(id); setOpen(false); };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold transition-all"
        style={{ border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--muted)" }}>
        <Palette className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
        <span className="hidden sm:inline">Theme</span>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: THEMES.find(t => t.id === current)?.color }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 p-1.5 rounded-xl z-50 animate-fadeIn"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
            {THEMES.map(t => (
              <button key={t.id} onClick={() => select(t.id)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  color: current === t.id ? "var(--primary-dark)" : "var(--text)",
                  background: current === t.id ? "var(--primary-light)" : "transparent",
                }}>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border" style={{ background: t.color, borderColor: "rgba(0,0,0,0.1)" }} />
                  {t.label}
                </div>
                {current === t.id && <Check className="w-3 h-3" style={{ color: "var(--primary)" }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
