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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <div className="w-full max-w-md animate-scaleUp"
        style={{
          background: "var(--surface)",
          border: "1.5px solid var(--border)",
          borderRadius: "20px",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header gradient strip */}
        <div className="p-5 pb-4" style={{ background: "var(--gradient-hero)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--primary)", boxShadow: "var(--shadow-sm)" }}>
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                  Health Words Dictionary
                </p>
                <h3 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
                  {word.term}
                </h3>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg transition-all"
              style={{ color: "var(--muted)" }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Simple definition pill */}
          <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid var(--border)" }}>
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--primary-dark)" }} />
              <p className="text-sm font-semibold leading-relaxed" style={{ color: "var(--text)" }}>
                {word.definition}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 pt-3 space-y-3">
          {word.function && (
            <div className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <Activity className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--accent)" }} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: "var(--muted)" }}>
                  What it does
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-soft)" }}>{word.function}</p>
              </div>
            </div>
          )}

          {word.location && (
            <div className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--primary)" }} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: "var(--muted)" }}>
                  Where in the body
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-soft)" }}>{word.location}</p>
              </div>
            </div>
          )}

          {word.relatedTerms?.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                <Compass className="w-3.5 h-3.5" /> Related Terms
              </p>
              <div className="flex flex-wrap gap-1.5">
                {word.relatedTerms.map((rt, i) => (
                  <button key={i}
                    onClick={() => { onSelectRelated?.(rt); onClose(); }}
                    className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
                    style={{ border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text-soft)" }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "var(--primary)";
                      e.currentTarget.style.color = "var(--primary-dark)";
                      e.currentTarget.style.background = "var(--primary-light)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.color = "var(--text-soft)";
                      e.currentTarget.style.background = "var(--surface)";
                    }}>
                    {rt} →
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--muted)" }}>
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
            Educational guide — not a diagnosis.
          </div>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all"
            style={{ background: "linear-gradient(135deg, var(--primary-dark), var(--primary))", boxShadow: "var(--shadow-sm)" }}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
