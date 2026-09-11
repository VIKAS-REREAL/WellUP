"use client";

import React, { useRef, useEffect, useState, useCallback, KeyboardEvent } from "react";
import {
  ArrowUp, Plus, Lightbulb, Scale, HelpCircle, FileText,
  Globe, Loader2, Check, Sparkles, X
} from "lucide-react";

interface PromptBarProps {
  value: string;
  onChange: (v: string) => void;
  onSend: (opts?: { explainSimply?: boolean }) => void;
  onSuggest: () => void;
  onMythFact: () => void;
  onUploadReport: () => void;
  loading: boolean;
  language: string;
  onLanguageChange: (lang: string) => void;
  disabled?: boolean;
  sidebarCollapsed?: boolean;
}

const LANG_OPTIONS = [
  { code: "en", label: "EN", full: "English" },
  { code: "hi", label: "हि", full: "Hindi" },
  { code: "gu", label: "ગુ", full: "Gujarati" },
];

const PLACEHOLDER: Record<string, string> = {
  en: "Ask anything",
  hi: "यहाँ कुछ भी पूछें…",
  gu: "અહીં કંઈપણ પૂછો…",
};

export function PromptBar({
  value,
  onChange,
  onSend,
  onSuggest,
  onMythFact,
  onUploadReport,
  loading,
  language,
  onLanguageChange,
  disabled = false,
  sidebarCollapsed = false,
}: PromptBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [explainMode, setExplainMode] = useState(false);

  const hasContent = value.trim().length > 0;

  /* Auto-resize textarea */
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newH = Math.min(Math.max(el.scrollHeight, 40), 160);
    el.style.height = `${newH}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => textareaRef.current?.focus(), 40);
    }
  }, [loading]);

  /* Close popup menu on outside click */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasContent && !loading && !disabled) {
        onSend({ explainSimply: explainMode });
      }
    }
  };

  const handleSendClick = () => {
    if (hasContent && !loading && !disabled) {
      onSend({ explainSimply: explainMode });
    }
  };

  return (
    <div className="chat-prompt-area">
      <div className={`chat-layout-wrapper ${sidebarCollapsed ? "collapsed" : ""} relative`}>
        {/* Ambient Frosted Blur (Localized to PromptBar perimeter with natural feather fade) */}
        <div className="prompt-bar-ambient-blur" />

        <div className="relative z-10">
          {/* Active Mode indicator chips above bar */}
          {explainMode && (
            <div className="flex items-center px-2 mb-2">
              <span
                onClick={() => setExplainMode(false)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/25 transition-colors"
              >
                <Lightbulb className="w-3 h-3" />
                <span>Explain Simply Active</span>
                <X className="w-2.5 h-2.5 ml-0.5 opacity-70" />
              </span>
            </div>
          )}

      {/* ── PROMPT BAR CAPSULE (Matches Reference Images 2 & 3) ── */}
      <div
        className={`prompt-bar relative ${isFocused ? "focused" : ""}`}
      >
        {/* ── Tool Menu Popover (Triggered by '+') ── */}
        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute bottom-full left-3 mb-2 z-50 rounded-2xl overflow-hidden shadow-2xl anim-scaleIn p-1.5 min-w-[220px]"
            style={{
              background: "var(--surface-raised, #18181b)",
              border: "1px solid var(--border, #27272a)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Health Tools
            </p>

            <button
              onClick={() => {
                setMenuOpen(false);
                onUploadReport();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors text-left"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Upload Medical Report</span>
            </button>

            <button
              onClick={() => {
                setExplainMode(!explainMode);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors text-left"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Explain Simply</span>
              {explainMode && <Check className="w-3.5 h-3.5 ml-auto text-emerald-400" />}
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                onMythFact();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors text-left"
            >
              <Scale className="w-3.5 h-3.5 text-teal-400" />
              <span>Myth vs Fact Check</span>
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                onSuggest();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors text-left"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>Suggest Question</span>
            </button>

            {/* Language Selection */}
            <div className="mt-1 pt-1 border-t border-white/[0.06] px-2 py-1 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> Language
              </span>
              <div className="flex items-center gap-1">
                {LANG_OPTIONS.map(l => (
                  <button
                    key={l.code}
                    onClick={() => {
                      onLanguageChange(l.code);
                      setMenuOpen(false);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      language === l.code
                        ? "bg-emerald-600 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Textarea: "Ask anything" placeholder ── */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={PLACEHOLDER[language] || PLACEHOLDER.en}
          disabled={loading || disabled}
          className="prompt-textarea"
          rows={1}
          style={{ outline: "none", border: "none", boxShadow: "none" }}
        />

        {/* ── Bottom Bar: '+' on left, circular arrow on right ── */}
        <div className="prompt-bottom-bar">
          {/* Plus button at bottom-left */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="prompt-plus-btn"
            title="Attach or Health Tools"
          >
            <Plus className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
          </button>

          {/* Circular Up Arrow Send Button at bottom-right */}
          <button
            type="button"
            onClick={handleSendClick}
            disabled={!hasContent || loading || disabled}
            className={`prompt-send-circle ${hasContent ? "active" : ""}`}
            title={loading ? "Thinking…" : "Send message"}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <ArrowUp className="w-4 h-4" strokeWidth={2.6} />
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
  );
}

