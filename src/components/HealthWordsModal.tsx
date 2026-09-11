"use client";

import React from "react";
import { X, BookOpen, Activity, MapPin, Compass, ShieldCheck, Sparkles } from "lucide-react";
import { HealthWord } from "@/lib/gemini";

interface Props {
  word: HealthWord | null;
  onClose: () => void;
  onSelectRelated?: (term: string) => void;
}

export function HealthWordsModal({ word, onClose, onSelectRelated }: Props) {
  if (!word) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div className="w-full max-w-md animate-scaleUp rounded-t-3xl sm:rounded-2xl max-h-[88vh] overflow-y-auto"
        style={{
          background: "var(--surface-raised, #18181b)",
          border: "1px solid var(--border, #27272a)",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={e => e.stopPropagation()}>
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header strip */}
        <div className="p-5 pb-4 border-b border-zinc-200 dark:border-white/10" style={{ background: "var(--surface-raised)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 p-1.5 border border-emerald-500/25 shadow-sm"
                style={{ background: "radial-gradient(circle, #34d399 20%, #10b981 60%, #059669 100%)" }}
              >
                <img src="/favicon.svg" alt="WellUP" className="w-7 h-7 rounded-lg object-contain shadow-sm" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Health Dictionary
                </p>
                <h3 className="text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                  {word.term}
                </h3>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Simple definition pill */}
          <div className="mt-3.5 p-3.5 rounded-xl border" style={{ background: "var(--hw-bg)", borderColor: "var(--hw-border)" }}>
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500 dark:text-emerald-400" />
              <p className="text-sm font-semibold leading-relaxed" style={{ color: "var(--text)" }}>
                {word.definition}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 pt-3 space-y-3">
          {word.function && (
            <div className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200 dark:border-white/10"
              style={{ background: "var(--border-subtle, rgba(255,255,255,0.03))" }}>
              <Activity className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-zinc-400">
                  What it does
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{word.function}</p>
              </div>
            </div>
          )}

          {word.location && (
            <div className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200 dark:border-white/10"
              style={{ background: "var(--border-subtle, rgba(255,255,255,0.03))" }}>
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-zinc-400">
                  Where in the body
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{word.location}</p>
              </div>
            </div>
          )}

          {word.relatedTerms?.length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-zinc-400">
                <Compass className="w-3.5 h-3.5 text-emerald-500" /> Related Terms
              </p>
              <div className="flex flex-wrap gap-1.5">
                {word.relatedTerms.map((rt, i) => (
                  <button key={i}
                    onClick={() => { onSelectRelated?.(rt); onClose(); }}
                    className="text-xs font-medium px-3 py-1 rounded-full transition-all border border-zinc-200 dark:border-white/10 hover:border-emerald-500 hover:text-emerald-400"
                    style={{ background: "var(--border-subtle, rgba(255,255,255,0.03))", color: "var(--text)" }}>
                    {rt} →
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3 border-t border-zinc-200 dark:border-white/10 pt-3">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Educational health guide.
          </div>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm"
            style={{ background: "var(--primary)" }}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
