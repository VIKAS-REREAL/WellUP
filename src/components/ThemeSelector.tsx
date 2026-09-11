"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeSelector({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("wellup_theme_mode");
      if (saved) {
        const dark = saved === "dark";
        setIsDark(dark);
        applyTheme(dark, false);
      } else {
        // Default to dark mode as requested by user
        setIsDark(true);
        applyTheme(true, true);
      }
    } catch {
      setIsDark(true);
      applyTheme(true, false);
    }
  }, []);

  function applyTheme(dark: boolean, save = true) {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    // Remove obsolete color-theme classes if present
    root.classList.remove("theme-ocean", "theme-clay", "theme-sage");

    if (save) {
      try {
        localStorage.setItem("wellup_theme_mode", dark ? "dark" : "light");
      } catch {}
    }
  }

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next, true);
  }

  if (!mounted) {
    return (
      <div className={`w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] text-zinc-400 text-xs ${className || ""}`}>
        <span className="flex items-center gap-2">
          <Moon className="w-4 h-4" />
          <span>Dark mode</span>
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${
        isDark
          ? "bg-[#1c1c1f] hover:bg-[#232327] text-zinc-300 border border-white/[0.05]"
          : "bg-black/[0.04] hover:bg-black/[0.07] text-zinc-700 border border-black/[0.06]"
      } ${className || ""}`}
      title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
    >
      <div className="flex items-center gap-2.5">
        {isDark ? (
          <Moon className="w-4 h-4 text-emerald-400 transition-transform group-hover:-rotate-12" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 transition-transform group-hover:rotate-45" />
        )}
        <span className="text-xs font-medium tracking-tight">
          {isDark ? "Dark mode" : "Light mode"}
        </span>
      </div>

      {/* Pill Toggle Switch */}
      <div
        className={`w-8 h-4.5 rounded-full p-0.5 flex items-center transition-colors ${
          isDark ? "bg-emerald-600 justify-end" : "bg-zinc-300 justify-start"
        }`}
        style={{ width: 34, height: 20 }}
      >
        <div
          className="w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform"
          style={{ width: 14, height: 14 }}
        />
      </div>
    </button>
  );
}

