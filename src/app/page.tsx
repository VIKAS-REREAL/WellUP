"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Heart, Send, Sparkles, ShieldCheck, RotateCcw, BookOpen,
  FileText, QrCode, Lock, ChevronRight, MessageCircleQuestion,
  Lightbulb, Scale, Zap, AlertTriangle, Globe, X,
  HeartPulse, Apple, SmilePlus, Activity, Leaf, FlaskConical
} from "lucide-react";
import { BRAND, HEALTH_CATEGORIES, STARTER_QUESTIONS } from "@/lib/brand";
import { HealthWord } from "@/lib/gemini";
import { ThemeSelector } from "@/components/ThemeSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { HealthWordsModal } from "@/components/HealthWordsModal";
import { QRCodeModal } from "@/components/QRCodeModal";
import { AuthModal } from "@/components/AuthModal";
import { ReportUploadModal } from "@/components/ReportUploadModal";

/* ─── Types ─── */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  category?: string;
  healthWords?: HealthWord[];
  sources?: string[];
  isEmergency?: boolean;
  timestamp: string;
}

/* ─── Category Icon Map ─── */
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  puberty:    <Sparkles className="w-3.5 h-3.5" />,
  menstrual:  <HeartPulse className="w-3.5 h-3.5" />,
  allergies:  <FlaskConical className="w-3.5 h-3.5" />,
  nutrition:  <Apple className="w-3.5 h-3.5" />,
  mental:     <SmilePlus className="w-3.5 h-3.5" />,
  general:    <Activity className="w-3.5 h-3.5" />,
};

/* ─── Formatted message renderer ─── */
function renderContent(content: string, healthWords: HealthWord[] = [], onWordClick: (w: HealthWord) => void) {
  const paragraphs = content.split(/\n\n+/);

  return (
    <div className="space-y-2.5 text-sm leading-relaxed">
      {paragraphs.map((para, pi) => {
        if (!para.trim()) return null;

        // H3 headings
        if (para.startsWith("### ")) {
          return (
            <h4 key={pi} className="font-bold text-[var(--primary-dark)] text-[13px] pt-1 flex items-center gap-1.5 border-b border-[var(--border)] pb-1">
              <Leaf className="w-3.5 h-3.5 text-[var(--primary)]" />
              {para.replace("### ", "")}
            </h4>
          );
        }

        // Bullet lists starting with "- "
        const bulletLines = para.split("\n").filter(l => l.trim().startsWith("- "));
        if (bulletLines.length > 0 && bulletLines.length === para.split("\n").filter(l => l.trim()).length) {
          return (
            <ul key={pi} className="space-y-1 pl-2">
              {bulletLines.map((line, li) => {
                const text = line.replace(/^[-•]\s*/, "");
                return (
                  <li key={li} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--primary)] flex-shrink-0" />
                    <span>{inlineFormat(text, healthWords, onWordClick)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Normal paragraph with inline formatting
        return (
          <p key={pi} className="text-[var(--text)]">
            {inlineFormat(para, healthWords, onWordClick)}
          </p>
        );
      })}
    </div>
  );
}

function inlineFormat(text: string, healthWords: HealthWord[], onWordClick: (w: HealthWord) => void) {
  // Split on **bold** patterns
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const word = part.slice(2, -2).trim();
      const match = healthWords.find(hw => hw.term.toLowerCase() === word.toLowerCase());
      const onClick = () => onWordClick(
        match || {
          term: word,
          definition: "A relevant health or medical concept.",
          function: "Involved in human physiology and well-being.",
          location: "Human anatomy",
          relatedTerms: ["Health", "Well-being"],
        }
      );
      return (
        <button key={i} onClick={onClick} className="health-word-tag mx-0.5">
          <Sparkles className="w-2.5 h-2.5" />{word}
        </button>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/* ─── Main Page ─── */
export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const [selectedWord, setSelectedWord] = useState<HealthWord | null>(null);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Restore session from localStorage
  useEffect(() => {
    try {
      const h = localStorage.getItem("wellup_chat");
      if (h) setMessages(JSON.parse(h));
      const p = localStorage.getItem("wellup_profile");
      if (p) setUserProfile(JSON.parse(p));
    } catch {}
  }, []);

  // Persist guest chat
  useEffect(() => {
    if (messages.length > 0) localStorage.setItem("wellup_chat", JSON.stringify(messages));
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text?: string, opts?: { explainSimply?: boolean }) => {
    const query = (text || input).trim();
    if (!query || loading) return;
    if (!text) setInput("");

    const userMsg: Message = {
      id: `u${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          language,
          explainSimply: opts?.explainSimply,
          history: messages.slice(-8).map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: m.content,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");

      setMessages(prev => [...prev, {
        id: `a${Date.now()}`,
        role: "assistant",
        content: data.response || "I couldn't generate a response.",
        category: data.category,
        healthWords: data.healthWords || [],
        sources: data.sources || [],
        isEmergency: Boolean(data.isEmergency),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `e${Date.now()}`,
        role: "assistant",
        content: "⚠️ I had a brief connection issue. Please try again — your privacy is maintained.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, language, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    if (messages.length === 0) return;
    setMessages([]);
    localStorage.removeItem("wellup_chat");
  };

  const hasChat = messages.length > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b" style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--primary-dark), var(--primary))", boxShadow: "var(--shadow-md)" }}>
                <Heart className="w-5 h-5 fill-white text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white bg-emerald-400 animate-pulse" />
            </div>
            <div className="leading-none">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
                  {BRAND.name}
                </span>
                <span className="hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--primary-light)", color: "var(--primary-dark)", border: "1px solid var(--border)" }}>
                  SDG 3
                </span>
              </div>
              <p className="text-[10px] hidden sm:block" style={{ color: "var(--muted)" }}>
                Health Awareness · Private · Not a Doctor
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <LanguageSelector language={language} onChange={setLanguage} />
            <ThemeSelector />
            <button onClick={() => setIsQROpen(true)}
              className="p-2 rounded-xl transition-all hover:scale-105"
              style={{ border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--muted)" }}
              title="QR Code for judges">
              <QrCode className="w-4 h-4" style={{ color: "var(--primary)" }} />
            </button>
            <button onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: userProfile?.storageConsent ? "var(--primary)" : "var(--surface)",
                color: userProfile?.storageConsent ? "#fff" : "var(--muted)",
                border: `1.5px solid ${userProfile?.storageConsent ? "var(--primary)" : "var(--border)"}`,
              }}>
              <Lock className="w-3 h-3" />
              <span className="hidden sm:inline">{userProfile?.nickname || "Guest"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-4 py-4 gap-3">

        {/* Safety Notice */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl"
          style={{ background: "var(--primary-light)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" style={{ color: "var(--primary-dark)" }} />
            <p className="text-[11px] font-medium leading-tight" style={{ color: "var(--primary-dark)" }}>
              <strong>Private Guest Mode</strong> — No account needed. Educational AI only, not a doctor.
              Emergencies: call <strong>112 / 108</strong>.
            </p>
          </div>
          <button onClick={() => setIsReportOpen(true)}
            className="flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all"
            style={{ background: "var(--primary-dark)", color: "#fff" }}>
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Report</span>
          </button>
        </div>

        {/* ── MESSAGES AREA ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-4 pb-2 overflow-y-auto" style={{ minHeight: 0 }}>

          {/* EMPTY STATE */}
          {!hasChat && (
            <div className="flex-1 py-6 flex flex-col gap-8 animate-fadeIn">

              {/* Hero */}
              <div className="text-center space-y-3 max-w-lg mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-2"
                  style={{ background: "var(--primary-light)", color: "var(--primary-dark)", border: "1.5px solid var(--border)" }}>
                  <Sparkles className="w-3.5 h-3.5" />
                  SDG 3 — Good Health & Well-being
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight gradient-text">
                  {BRAND.tagline}
                </h1>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  Ask anything about your body, health, or medical terms — privately, clearly, and without judgment.
                  Your question stays in your browser.
                </p>
              </div>

              {/* Category Grid */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-3 text-center" style={{ color: "var(--muted)" }}>
                  Explore Health Topics
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-2xl mx-auto">
                  {HEALTH_CATEGORIES.map((cat, i) => (
                    <button key={cat.id}
                      onClick={() => sendMessage(cat.sampleQuestions[0])}
                      className="starter-card animate-fadeIn"
                      style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: "var(--primary-light)", color: "var(--primary-dark)" }}>
                            {CATEGORY_ICONS[cat.id] || <Activity className="w-3.5 h-3.5" />}
                          </div>
                          <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--muted)" }} />
                        </div>
                        <p className="text-xs font-bold leading-tight" style={{ color: "var(--text)" }}>{cat.name}</p>
                        <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--muted)" }}>{cat.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Starters */}
              <div className="max-w-2xl mx-auto w-full">
                <p className="text-[11px] font-bold uppercase tracking-widest mb-3 text-center" style={{ color: "var(--muted)" }}>
                  Try Asking
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {STARTER_QUESTIONS.map((q, i) => (
                    <button key={i} onClick={() => sendMessage(q)}
                      className="quick-chip animate-fadeIn"
                      style={{ animationDelay: `${i * 40}ms` }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MESSAGES */}
          {hasChat && messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end animate-slideRight" : "justify-start animate-slideLeft"}`}
            >
              {/* Bot avatar */}
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl flex-shrink-0 mt-0.5 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, var(--primary-dark), var(--primary))", boxShadow: "var(--shadow-sm)" }}>
                  <Heart className="w-4 h-4 fill-white text-white" />
                </div>
              )}

              <div className={`max-w-[82%] sm:max-w-[75%] p-4 ${
                msg.role === "user" ? "msg-user" :
                msg.isEmergency ? "msg-emergency" :
                "msg-bot"
              }`}>
                {/* Category + timestamp */}
                {msg.role === "assistant" && msg.category && (
                  <div className="flex items-center justify-between mb-2 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--primary-dark)" }}>
                      {msg.category}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--muted)" }}>{msg.timestamp}</span>
                  </div>
                )}

                {/* Emergency header */}
                {msg.isEmergency && (
                  <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-red-100 border border-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span className="text-xs font-bold text-red-700">URGENT — Seek immediate medical attention</span>
                  </div>
                )}

                {/* Content */}
                {msg.role === "user"
                  ? <p className="text-sm font-medium">{msg.content}</p>
                  : renderContent(msg.content, msg.healthWords || [], setSelectedWord)
                }

                {/* Health Words footer */}
                {msg.role === "assistant" && msg.healthWords && msg.healthWords.length > 0 && (
                  <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1" style={{ color: "var(--muted)" }}>
                      <BookOpen className="w-3 h-3" style={{ color: "var(--primary)" }} />
                      Health Words — Click to explore:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.healthWords.map((hw, i) => (
                        <button key={i} onClick={() => setSelectedWord(hw)} className="health-word-tag">
                          <Sparkles className="w-2.5 h-2.5" />{hw.term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sources */}
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-[10px]" style={{ color: "var(--muted)" }}>
                    <ShieldCheck className="w-3 h-3" style={{ color: "var(--primary)" }} />
                    {msg.sources.join(" • ")}
                  </div>
                )}

                {/* User timestamp */}
                {msg.role === "user" && (
                  <p className="text-[10px] mt-1.5 text-right opacity-70">{msg.timestamp}</p>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3 justify-start animate-fadeIn">
              <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--primary-dark), var(--primary))" }}>
                <Heart className="w-4 h-4 fill-white text-white" />
              </div>
              <div className="msg-bot px-5 py-3.5 flex items-center gap-1.5">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
                <span className="text-xs ml-1" style={{ color: "var(--muted)" }}>Thinking...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── TOOLBAR + INPUT AREA ────────────────────────── */}
        <div className="flex flex-col gap-2 pt-1">

          {/* Quick Actions */}
          {hasChat && (
            <div className="flex items-center justify-between gap-2 overflow-x-auto py-0.5">
              <div className="flex gap-1.5">
                <button onClick={() => {
                  const last = [...messages].reverse().find(m => m.role === "user");
                  if (last) sendMessage(last.content, { explainSimply: true });
                }} disabled={loading} className="quick-chip">
                  <Lightbulb className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                  Explain Simply
                </button>
                <button onClick={() => sendMessage("Is it true that you shouldn't exercise during your period?")}
                  disabled={loading} className="quick-chip">
                  <Scale className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                  Myth vs Fact
                </button>
                <button onClick={() => {
                  const opts = [
                    "What changes happen during puberty?",
                    "Why do periods hurt?",
                    "What are common signs of food allergies?",
                    "What does inflammation mean?",
                    "What should I know about menstrual hygiene?",
                  ];
                  sendMessage(opts[Math.floor(Math.random() * opts.length)]);
                }} disabled={loading} className="quick-chip">
                  <MessageCircleQuestion className="w-3.5 h-3.5" style={{ color: "#6366F1" }} />
                  <span className="hidden sm:inline">I don't know what to ask</span>
                  <span className="sm:hidden">Suggest</span>
                </button>
              </div>
              <button onClick={clearChat}
                className="p-1.5 rounded-lg transition-all flex-shrink-0"
                style={{ color: "var(--muted)" }}
                title="Clear private chat"
                onMouseEnter={e => (e.currentTarget.style.color = "#EF4444")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}>
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Bar */}
          <div className="rounded-2xl overflow-hidden transition-all"
            style={{
              background: "var(--surface)",
              border: "1.5px solid var(--border)",
              boxShadow: "var(--shadow-md)",
            }}
            onFocusCapture={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)";
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md), 0 0 0 3px var(--ring)";
            }}
            onBlurCapture={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
            }}>
            <div className="flex items-center px-4 py-3 gap-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--primary-light)" }}>
                <Heart className="w-3.5 h-3.5 fill-current" style={{ color: "var(--primary)" }} />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  language === "hi" ? "अपना स्वास्थ्य प्रश्न यहाँ पूछें..." :
                  language === "gu" ? "તમારો આરોગ્ય પ્રશ્ન અહીં પૂછો..." :
                  "Ask any health question... e.g. 'Why do periods hurt?' or 'What is the uterus?'"
                }
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: "var(--text)" }}
                disabled={loading}
                autoFocus
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, var(--primary-dark), var(--primary))", color: "#fff", boxShadow: "var(--shadow-sm)" }}>
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Input bottom bar */}
            <div className="px-4 pb-2.5 flex items-center justify-between">
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                {BRAND.name} is for <strong>health education only</strong> — not medical diagnosis. Emergency? Call <strong>112 / 108</strong>.
              </p>
              <div className="flex items-center gap-1 flex-shrink-0">
                {[
                  { label: "Report", icon: <FileText className="w-3 h-3" />, action: () => setIsReportOpen(true) },
                  { label: "QR", icon: <QrCode className="w-3 h-3" />, action: () => setIsQROpen(true) },
                ].map(({ label, icon, action }) => (
                  <button key={label} onClick={action}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-all"
                    style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>
                    {icon}<span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── MODALS ── */}
      <HealthWordsModal word={selectedWord} onClose={() => setSelectedWord(null)}
        onSelectRelated={term => sendMessage(`What does ${term} mean in simple terms?`)} />
      <QRCodeModal isOpen={isQROpen} onClose={() => setIsQROpen(false)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)}
        isLoggedIn={Boolean(userProfile?.storageConsent)}
        onLoginSuccess={p => setUserProfile(p)}
        onLogout={() => { setUserProfile(null); localStorage.removeItem("wellup_profile"); }} />
      <ReportUploadModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)}
        onReportAnalyzed={(s, a) => sendMessage(`📄 Report Summary:\n${s}${a ? `\n\n📅 Appointment: ${a}` : ""}`)} />
    </div>
  );
}
