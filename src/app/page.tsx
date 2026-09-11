"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Sparkles, RotateCcw,
  FileText, QrCode, Lock, ChevronRight, MessageCircleQuestion,
  Lightbulb, Scale, AlertTriangle, User as UserIcon, Leaf,
  HeartPulse, Apple, SmilePlus, Activity, FlaskConical, Info,
  CheckCircle2, LogIn, Database
} from "lucide-react";
import { BRAND, HEALTH_CATEGORIES, STARTER_QUESTIONS } from "@/lib/brand";
import { HealthWord } from "@/lib/gemini";
import { ThemeSelector } from "@/components/ThemeSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { HealthWordsModal } from "@/components/HealthWordsModal";
import { QRCodeModal } from "@/components/QRCodeModal";
import { ReportUploadModal } from "@/components/ReportUploadModal";
import { OnboardingModal, HealthProfile } from "@/components/OnboardingModal";
import { AuthModal } from "@/components/AuthModal";
import {
  supabase,
  getCurrentUser,
  fetchUserProfile,
  saveUserProfile,
  saveChatMessage,
  loadChatMessages,
  UserHealthProfile,
  isSupabaseConfigured,
} from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/* ─── Types ─── */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  category?: string;
  healthWords?: HealthWord[];
  sources?: string[];
  isEmergency?: boolean;
  ts: string;
}

/* ─── Inline text formatter (bold → health word badges) ─── */
function InlineText({ text, words, onWord }: { text: string; words: HealthWord[]; onWord: (w: HealthWord) => void }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          const term = p.slice(2, -2).trim();
          const match = words.find(w => w.term.toLowerCase() === term.toLowerCase());
          return (
            <button
              key={i}
              className="hw-tag mx-0.5 inline-flex items-center gap-1 font-semibold text-xs"
              onClick={() => onWord(match || { term, definition: "A health or medical concept.", function: "", location: "", relatedTerms: [] })}
            >
              {term}
            </button>
          );
        }
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
}

/* ─── Clean, minimal message renderer ─── */
function MsgContent({ text, words, onWord }: { text: string; words: HealthWord[]; onWord: (w: HealthWord) => void }) {
  const blocks = text.split(/\n\n+/);
  return (
    <div className="text-sm leading-relaxed space-y-2 text-slate-800">
      {blocks.map((block, bi) => {
        if (!block.trim()) return null;
        const lines = block.split("\n");
        const isBulletList = lines.every(l => l.trim().startsWith("• ") || l.trim().startsWith("- ") || !l.trim());
        if (isBulletList && lines.some(l => l.trim().startsWith("• ") || l.trim().startsWith("- "))) {
          return (
            <ul key={bi} className="space-y-1.5 pl-1 my-1.5">
              {lines.filter(l => l.trim().startsWith("• ") || l.trim().startsWith("- ")).map((line, li) => {
                const cleanLine = line.replace(/^[•-]\s*/, "");
                return (
                  <li key={li} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>
                      <InlineText text={cleanLine} words={words} onWord={onWord} />
                    </span>
                  </li>
                );
              })}
            </ul>
          );
        }
        return (
          <p key={bi}>
            <InlineText text={block} words={words} onWord={onWord} />
          </p>
        );
      })}
    </div>
  );
}

/* ─── Build health context string from profile ─── */
function buildHealthContext(profile: HealthProfile | null): string {
  if (!profile) return "";
  const parts: string[] = [];
  if (profile.nickname)           parts.push(`Name: ${profile.nickname}`);
  if (profile.ageGroup)           parts.push(`Age group: ${profile.ageGroup}`);
  if (profile.overallHealth)      parts.push(`Overall health: ${profile.overallHealth}`);
  if (profile.allergies?.length)  parts.push(`Allergies: ${profile.allergies.join(", ")}`);
  if (profile.longTermConditions && profile.longTermConditions !== "No") parts.push(`Health conditions: ${profile.longTermConditions}`);
  if (profile.sleepHours)         parts.push(`Sleep: ${profile.sleepHours} hours`);
  if (profile.exerciseFrequency)  parts.push(`Exercise: ${profile.exerciseFrequency}`);
  if (profile.goals?.length)      parts.push(`Health goals: ${profile.goals.join(", ")}`);
  return parts.join(". ");
}

/* ─── Main Page ─── */
export default function HomePage() {
  const [msgs, setMsgs]                 = useState<Message[]>([]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [language, setLanguage]         = useState("en");
  const [profile, setProfile]           = useState<HealthProfile | null>(null);
  const [selWord, setSelWord]           = useState<HealthWord | null>(null);
  const [isQROpen, setQROpen]           = useState(false);
  const [isReportOpen, setReportOpen]   = useState(false);
  const [isOnboardOpen, setOnboardOpen] = useState(false);
  const [isAuthOpen, setAuthOpen]       = useState(false);
  const [currentUser, setCurrentUser]   = useState<any | null>(null);
  const [apiWarn, setApiWarn]           = useState<string | null>(null);
  const [dbStatus, setDbStatus]         = useState<"connected" | "offline">("connected");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  /* ── 1. Check Supabase Auth & Restore Session ── */
  useEffect(() => {
    // Local storage fallback restore
    try {
      const h = localStorage.getItem("wellup_chat");
      if (h) setMsgs(JSON.parse(h));
      const p = localStorage.getItem("wellup_profile");
      if (p) {
        const parsed = JSON.parse(p) as HealthProfile;
        setProfile(parsed);
        if (parsed.language) setLanguage(parsed.language);
      }
    } catch {}

    // Check Supabase Auth
    if (supabase) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          setCurrentUser(session.user);
          // Sync profile from Supabase DB
          const dbProfile = await fetchUserProfile(session.user.id);
          if (dbProfile) {
            setProfile(prev => ({
              ...prev,
              nickname: dbProfile.nickname || prev?.nickname || "",
              ageGroup: dbProfile.ageRange || prev?.ageGroup || "",
              allergies: dbProfile.allergies || prev?.allergies || [],
              conditions: dbProfile.conditions || [],
              storageConsent: true,
              overallHealth: dbProfile.overallHealth || prev?.overallHealth || "",
              sleepHours: dbProfile.sleepHours || prev?.sleepHours || "",
              exerciseFrequency: dbProfile.exerciseFrequency || prev?.exerciseFrequency || "",
              goals: dbProfile.goals || prev?.goals || [],
              dietType: dbProfile.dietPreference || prev?.dietType || "",
              longTermConditions: prev?.longTermConditions || "",
              heartBpConcerns: prev?.heartBpConcerns || "",
              familyHistory: prev?.familyHistory || "",
              sleepQuality: prev?.sleepQuality || "",
              exerciseTypes: prev?.exerciseTypes || [],
              fruitsVeggiesFreq: prev?.fruitsVeggiesFreq || "",
              waterIntake: prev?.waterIntake || "",
              smokingStatus: prev?.smokingStatus || "",
              alcoholStatus: prev?.alcoholStatus || "",
              sittingTime: prev?.sittingTime || "",
              language: dbProfile.language || prev?.language || "en",
            }));
          }
          // Sync chat history from Supabase DB
          const dbChats = await loadChatMessages(session.user.id);
          if (dbChats && dbChats.length > 0) {
            setMsgs(dbChats.map(c => ({
              id: c.id,
              role: c.role,
              content: c.content,
              category: c.category,
              isEmergency: c.isEmergency,
              ts: new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            })));
          }
        }
      });

      // Listen to auth changes
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setCurrentUser(session.user);
          const dbProfile = await fetchUserProfile(session.user.id);
          if (dbProfile) {
            setProfile(prev => ({
              ...prev,
              nickname: dbProfile.nickname || prev?.nickname || "",
              ageGroup: dbProfile.ageRange || prev?.ageGroup || "",
              allergies: dbProfile.allergies || prev?.allergies || [],
              storageConsent: true,
              overallHealth: dbProfile.overallHealth || prev?.overallHealth || "",
              sleepHours: dbProfile.sleepHours || prev?.sleepHours || "",
              exerciseFrequency: dbProfile.exerciseFrequency || prev?.exerciseFrequency || "",
              goals: dbProfile.goals || prev?.goals || [],
              dietType: dbProfile.dietPreference || prev?.dietType || "",
              longTermConditions: prev?.longTermConditions || "",
              heartBpConcerns: prev?.heartBpConcerns || "",
              familyHistory: prev?.familyHistory || "",
              sleepQuality: prev?.sleepQuality || "",
              exerciseTypes: prev?.exerciseTypes || [],
              fruitsVeggiesFreq: prev?.fruitsVeggiesFreq || "",
              waterIntake: prev?.waterIntake || "",
              smokingStatus: prev?.smokingStatus || "",
              alcoholStatus: prev?.alcoholStatus || "",
              sittingTime: prev?.sittingTime || "",
              language: dbProfile.language || prev?.language || "en",
            }));
          }
          const dbChats = await loadChatMessages(session.user.id);
          if (dbChats && dbChats.length > 0) {
            setMsgs(dbChats.map(c => ({
              id: c.id,
              role: c.role,
              content: c.content,
              category: c.category,
              isEmergency: c.isEmergency,
              ts: new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            })));
          }
        } else {
          setCurrentUser(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  /* Persist chat locally */
  useEffect(() => {
    if (msgs.length) localStorage.setItem("wellup_chat", JSON.stringify(msgs));
  }, [msgs]);

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  /* Send message */
  const send = useCallback(async (text?: string, opts?: { explainSimply?: boolean }) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    if (!text) setInput("");

    const nowTs = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: Message = {
      id: `u${Date.now()}`,
      role: "user",
      content: q,
      ts: nowTs,
    };
    setMsgs(prev => [...prev, userMsg]);
    setLoading(true);

    // Save to Supabase if logged in
    if (currentUser) {
      saveChatMessage(currentUser.id, { role: "user", content: q });
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          language,
          explainSimply: opts?.explainSimply ?? false,
          userHealthContext: buildHealthContext(profile),
          history: msgs.slice(-8).map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: m.content,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.apiKeyWarning) setApiWarn(data.apiKeyWarning);

      const botMsg: Message = {
        id: `a${Date.now()}`,
        role: "assistant",
        content: data.response || "No response received.",
        category: data.category,
        healthWords: data.healthWords || [],
        sources: data.sources || [],
        isEmergency: Boolean(data.isEmergency),
        ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMsgs(prev => [...prev, botMsg]);

      // Save bot reply to Supabase if logged in
      if (currentUser) {
        saveChatMessage(currentUser.id, {
          role: "assistant",
          content: botMsg.content,
          category: botMsg.category,
          isEmergency: botMsg.isEmergency,
        });
      }
    } catch {
      setMsgs(prev => [...prev, {
        id: `e${Date.now()}`,
        role: "assistant",
        content: "⚠️ Connection issue. Please try again.",
        ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, language, loading, msgs, profile, currentUser]);

  const clearChat = () => {
    if (!msgs.length) return;
    if (confirm("Clear your private chat history?")) {
      setMsgs([]);
      localStorage.removeItem("wellup_chat");
    }
  };

  const hasChat = msgs.length > 0;
  const userInitials = (profile?.nickname || currentUser?.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">

      {/* ──────── NAVBAR ──────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

          {/* Logo & Favicon */}
          <div className="flex items-center gap-2.5">
            <img
              src="/favicon.svg"
              alt="WellUP Logo"
              className="w-8 h-8 rounded-lg shadow-sm border border-emerald-100"
            />
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                {BRAND.name}
              </span>
              <Badge variant="secondary" className="ml-1.5 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 py-0 px-1.5 font-bold">
                SDG 3
              </Badge>
            </div>
          </div>

          {/* Controls with real shadcn components */}
          <div className="flex items-center gap-1.5">
            <LanguageSelector
              language={language}
              onChange={l => {
                setLanguage(l);
                if (profile) setProfile({ ...profile, language: l });
              }}
            />
            <ThemeSelector />

            {/* Auth / Account Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAuthOpen(true)}
              className="h-8 gap-1.5 text-xs font-semibold border-border hover:bg-slate-100"
              title={currentUser ? "View account & Supabase DB sync" : "Sign in / Save health profile"}
            >
              {currentUser ? (
                <>
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className="text-[10px] bg-emerald-600 text-white font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{profile?.nickname || currentUser.email?.split("@")[0]}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Connected to Supabase DB" />
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Sign In</span>
                </>
              )}
            </Button>

            {/* Onboarding Health Profile */}
            <Button
              variant={profile ? "secondary" : "outline"}
              size="sm"
              onClick={() => setOnboardOpen(true)}
              className="h-8 gap-1.5 text-xs font-semibold"
              title="Health Profile & Onboarding"
            >
              <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">{profile ? "Health Profile ✓" : "Profile"}</span>
            </Button>

            {/* QR Modal */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQROpen(true)}
              className="w-8 h-8 rounded-lg"
              title="QR Code for judges & mobile test"
            >
              <QrCode className="w-3.5 h-3.5 text-slate-600" />
            </Button>
          </div>
        </div>
      </header>

      {/* ──────── MAIN ──────── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-3 flex flex-col gap-3">

        {/* API Key Notice Banner if not configured */}
        {apiWarn && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl text-xs bg-amber-50 border border-amber-200 text-amber-900 anim-fadeUp">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <strong>Notice:</strong> {apiWarn}. Educational fallback engine is active and ready.
            </div>
            <button onClick={() => setApiWarn(null)} className="font-bold text-amber-700 hover:text-amber-900">✕</button>
          </div>
        )}

        {/* Minimal Safe Status Bar */}
        <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl text-xs bg-emerald-50/70 border border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-900">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              {currentUser ? (
                <>
                  Logged in as <strong>{currentUser.email}</strong> • Synced with Supabase DB
                </>
              ) : (
                <>
                  <strong>Private Mode:</strong> 100% confidential. Education only, not medical diagnosis.
                </>
              )}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReportOpen(true)}
            className="h-6 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 gap-1"
          >
            <FileText className="w-3 h-3" />
            <span className="hidden sm:inline">Analyze Report</span>
          </Button>
        </div>

        {/* ──────── MESSAGES / EMPTY STATE ──────── */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pb-2" style={{ minHeight: 0 }}>

          {!hasChat ? (
            /* ── EMPTY STATE ── */
            <div className="flex-1 flex flex-col gap-6 py-4 anim-fadeUp">

              {/* Minimal Hero */}
              <div className="text-center max-w-md mx-auto space-y-2.5">
                <img
                  src="/favicon.svg"
                  alt="WellUP"
                  className="w-12 h-12 rounded-xl mx-auto shadow-sm border border-emerald-100"
                />
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  {BRAND.tagline}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Ask clear, honest health questions about your body, nutrition, puberty, periods, sleep, or stress. No judgment.
                </p>

                {!currentUser && (
                  <div className="pt-1 flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setAuthOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 gap-1.5"
                    >
                      <Database className="w-3.5 h-3.5" />
                      Sign In & Save History
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOnboardOpen(true)}
                      className="text-xs h-8 px-3"
                    >
                      Set Health Profile
                    </Button>
                  </div>
                )}
              </div>

              {/* Category Cards using shadcn Card */}
              <div className="max-w-2xl mx-auto w-full">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                  Explore Topics
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {HEALTH_CATEGORIES.map(cat => (
                    <Card
                      key={cat.id}
                      onClick={() => send(cat.questions[0])}
                      className="cursor-pointer hover:border-emerald-500 hover:shadow-sm transition-all group border-border bg-white"
                    >
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-lg">{cat.emoji}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                        </div>
                        <p className="font-bold text-xs text-slate-800">{cat.name}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{cat.questions[0]}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Quick Starters */}
              <div className="max-w-xl mx-auto w-full">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Popular Questions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STARTER_QUESTIONS.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => send(q)}
                      className="text-xs h-7 px-2.5 bg-white text-slate-700 hover:border-emerald-500 hover:text-emerald-700"
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── ACTIVE CHAT: CLEAN, NORMAL, MINIMAL MESSAGES ── */
            <>
              {msgs.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {/* Bot Logo Avatar */}
                  {msg.role === "assistant" && (
                    <img
                      src="/favicon.svg"
                      alt="WellUP"
                      className="w-7 h-7 rounded-lg shrink-0 mt-0.5 border border-emerald-100 shadow-2xs"
                    />
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[78%] px-4 py-3 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-emerald-600 text-white rounded-tr-xs"
                        : msg.isEmergency
                        ? "bg-rose-50 border border-rose-200 rounded-tl-xs shadow-xs"
                        : "bg-white border border-slate-200 rounded-tl-xs shadow-2xs"
                    }`}
                  >
                    {/* Emergency Alert */}
                    {msg.isEmergency && (
                      <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-lg bg-rose-100/70 border border-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="text-xs font-bold text-rose-800">
                          Emergency assistance: Call 112 or 108 immediately
                        </span>
                      </div>
                    )}

                    {/* Clean Message Content */}
                    {msg.role === "user" ? (
                      <p className="text-sm font-medium text-white">{msg.content}</p>
                    ) : (
                      <MsgContent
                        text={msg.content}
                        words={msg.healthWords || []}
                        onWord={setSelWord}
                      />
                    )}

                    {/* Subtle Health Words if any */}
                    {msg.role === "assistant" && msg.healthWords && msg.healthWords.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-slate-400 font-medium text-[10px]">Explore terms:</span>
                        {msg.healthWords.map((hw, i) => (
                          <button
                            key={i}
                            onClick={() => setSelWord(hw)}
                            className="hw-tag text-[11px]"
                          >
                            <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                            {hw.term}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Subtle bottom info: Category + Timestamp */}
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                      {msg.role === "assistant" && msg.category ? (
                        <span className="font-semibold text-emerald-700/80">{msg.category}</span>
                      ) : <span />}
                      <span className={msg.role === "user" ? "text-emerald-100 ml-auto" : ""}>{msg.ts}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Minimal Thinking Indicator */}
              {loading && (
                <div className="flex gap-2.5 justify-start items-center">
                  <img src="/favicon.svg" alt="WellUP" className="w-7 h-7 rounded-lg border border-emerald-100" />
                  <div className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-2xl rounded-tl-xs flex items-center gap-1.5 shadow-2xs">
                    <div className="dot" /><div className="dot" /><div className="dot" />
                    <span className="text-xs text-slate-400 ml-1">Thinking…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* ──────── QUICK ACTIONS + MINIMAL INPUT BAR ──────── */}
        <div className="flex flex-col gap-2 pt-1">

          {/* Quick action buttons */}
          {hasChat && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                className="h-7 text-xs gap-1 bg-white"
                onClick={() => {
                  const last = [...msgs].reverse().find(m => m.role === "user");
                  if (last) send(last.content, { explainSimply: true });
                }}
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                Explain simply
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                className="h-7 text-xs gap-1 bg-white"
                onClick={() => send("Is it true that you shouldn't exercise during your period?")}
              >
                <Scale className="w-3.5 h-3.5 text-emerald-600" />
                Myth vs Fact
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                className="h-7 text-xs gap-1 bg-white"
                onClick={() => send("I don't know what to ask")}
              >
                <MessageCircleQuestion className="w-3.5 h-3.5 text-indigo-500" />
                Suggest a question
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                className="ml-auto h-7 w-7 text-slate-400 hover:text-red-600"
                title="Clear chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Minimal Input Bar */}
          <div className="bg-white border-2 border-slate-200 focus-within:border-emerald-600 rounded-2xl shadow-xs transition-all">
            <div className="flex items-center px-4 py-2.5 gap-2">
              <input
                ref={inputRef}
                autoFocus
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={
                  language === "hi" ? "यहाँ अपना स्वास्थ्य प्रश्न पूछें…" :
                  language === "gu" ? "અહીં તમારો આરોગ્ય પ્રશ્ન પૂછો…" :
                  "Ask any health question… (e.g. 'Why do periods hurt?')"
                }
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-slate-900 focus:outline-none placeholder:text-slate-400"
              />
              <Button
                size="sm"
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="h-8 w-8 p-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="px-4 pb-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-50 pt-1.5">
              <span>
                {BRAND.name} — Private health awareness. Emergency: <strong className="text-slate-600">112 / 108</strong>
              </span>
              <button
                onClick={() => setReportOpen(true)}
                className="hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                <span>Upload Report</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ──────── MODALS ──────── */}
      <HealthWordsModal
        word={selWord}
        onClose={() => setSelWord(null)}
        onSelectRelated={t => send(`What does ${t} mean in simple terms?`)}
      />
      <QRCodeModal isOpen={isQROpen} onClose={() => setQROpen(false)} />
      <ReportUploadModal
        isOpen={isReportOpen}
        onClose={() => setReportOpen(false)}
        onReportAnalyzed={(s, a) => send(`📄 Report summary:\n${s}${a ? `\n📅 Recommended next step: ${a}` : ""}`)}
      />
      <OnboardingModal
        isOpen={isOnboardOpen}
        onClose={() => setOnboardOpen(false)}
        onComplete={async p => {
          setProfile(p);
          if (p.language) setLanguage(p.language);
          if (currentUser) {
            await saveUserProfile(currentUser.id, p, currentUser.email);
          }
        }}
      />
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setAuthOpen(false)}
        currentUser={currentUser}
        userProfile={profile}
        onAuthSuccess={async (u, prof) => {
          setCurrentUser(u);
          if (prof) {
            setProfile(prev => ({
              ...prev,
              nickname: prof.nickname || prev?.nickname || "",
              ageGroup: prof.ageRange || prev?.ageGroup || "",
              allergies: prof.allergies || prev?.allergies || [],
              storageConsent: true,
              overallHealth: prev?.overallHealth || "",
              sleepHours: prev?.sleepHours || "",
              exerciseFrequency: prev?.exerciseFrequency || "",
              goals: prev?.goals || [],
              dietType: prev?.dietType || "",
              longTermConditions: prev?.longTermConditions || "",
              heartBpConcerns: prev?.heartBpConcerns || "",
              familyHistory: prev?.familyHistory || "",
              sleepQuality: prev?.sleepQuality || "",
              exerciseTypes: prev?.exerciseTypes || [],
              fruitsVeggiesFreq: prev?.fruitsVeggiesFreq || "",
              waterIntake: prev?.waterIntake || "",
              smokingStatus: prev?.smokingStatus || "",
              alcoholStatus: prev?.alcoholStatus || "",
              sittingTime: prev?.sittingTime || "",
              language: prev?.language || "en",
            }));
          }
          // Load existing chats for this user from DB
          const chats = await loadChatMessages(u.id);
          if (chats && chats.length > 0) {
            setMsgs(chats.map(c => ({
              id: c.id,
              role: c.role,
              content: c.content,
              category: c.category,
              isEmergency: c.isEmergency,
              ts: new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            })));
          }
        }}
        onLogout={() => {
          setCurrentUser(null);
        }}
        onOpenOnboarding={() => setOnboardOpen(true)}
      />
    </div>
  );
}
