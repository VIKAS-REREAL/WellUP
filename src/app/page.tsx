"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertTriangle, Sparkles, Info, CheckCircle2,
  Menu, X, FileText, Lock, ExternalLink, PanelLeft
} from "lucide-react";

import { BRAND, HEALTH_CATEGORIES, STARTER_QUESTIONS } from "@/lib/brand";
import { HealthWord } from "@/lib/gemini";
import { Sidebar, ConversationMeta } from "@/components/Sidebar";
import { PromptBar } from "@/components/PromptBar";
import { HealthWordsModal } from "@/components/HealthWordsModal";
import { QRCodeModal } from "@/components/QRCodeModal";
import { ReportUploadModal } from "@/components/ReportUploadModal";
import { OnboardingModal, HealthProfile } from "@/components/OnboardingModal";
import { AuthModal } from "@/components/AuthModal";
import { extractUserDisplayInfo } from "@/lib/userProfile";
import {
  supabase,
  getCurrentUser,
  fetchUserProfile,
  saveUserProfile,
  saveChatMessage,
  signOutUser,
  loadChatMessages,
  getConversations,
  createConversation,
  deleteConversation,
  loadConversationMessages,
  saveChatMessageToConversation,
  isSupabaseConfigured,
} from "@/lib/supabase";

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

/* ─── Inline text: bold → health word badge ─── */
function InlineText({
  text,
  words,
  onWord,
}: {
  text: string;
  words: HealthWord[];
  onWord: (w: HealthWord) => void;
}) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          const term = p.slice(2, -2).trim();
          const match = words.find(
            (w) => w.term.toLowerCase() === term.toLowerCase()
          );
          return (
            <button
              key={i}
              className="hw-tag mx-0.5"
              onClick={() =>
                onWord(
                  match || {
                    term,
                    definition: "A health or medical concept.",
                    function: "",
                    location: "",
                    relatedTerms: [],
                  }
                )
              }
            >
              <Sparkles style={{ width: 10, height: 10 }} />
              {term}
            </button>
          );
        }
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
}

/* ─── Message content renderer ─── */
function MsgContent({
  text,
  words,
  onWord,
}: {
  text: string;
  words: HealthWord[];
  onWord: (w: HealthWord) => void;
}) {
  const blocks = text.split(/\n\n+/);
  return (
    <div
      style={{
        fontSize: "0.875rem",
        lineHeight: 1.65,
        color: "var(--bubble-bot-fg)",
      }}
      className="space-y-2"
    >
      {blocks.map((block, bi) => {
        if (!block.trim()) return null;
        const lines = block.split("\n");
        const isBullet = lines.some(
          (l) => l.trim().startsWith("• ") || l.trim().startsWith("- ")
        );
        if (isBullet) {
          return (
            <ul key={bi} className="space-y-1.5 pl-1">
              {lines
                .filter(
                  (l) =>
                    l.trim().startsWith("• ") || l.trim().startsWith("- ")
                )
                .map((line, li) => {
                  const clean = line.replace(/^[•\-]\s*/, "");
                  return (
                    <li key={li} className="flex items-start gap-2">
                      <span
                        className="mt-2 shrink-0 w-1.5 h-1.5 rounded-full"
                        style={{ background: "var(--primary)" }}
                      />
                      <span>
                        <InlineText text={clean} words={words} onWord={onWord} />
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

/* ─── Build health context string ─── */
function buildHealthContext(profile: HealthProfile | null): string {
  if (!profile) return "";
  const parts: string[] = [];
  if (profile.nickname) parts.push(`Name: ${profile.nickname}`);
  if (profile.ageGroup) parts.push(`Age group: ${profile.ageGroup}`);
  if (profile.overallHealth) parts.push(`Overall health: ${profile.overallHealth}`);
  if (profile.allergies?.length) parts.push(`Allergies: ${profile.allergies.join(", ")}`);
  if (profile.longTermConditions && profile.longTermConditions !== "No")
    parts.push(`Health conditions: ${profile.longTermConditions}`);
  if (profile.sleepHours) parts.push(`Sleep: ${profile.sleepHours} hours`);
  if (profile.exerciseFrequency) parts.push(`Exercise: ${profile.exerciseFrequency}`);
  if (profile.goals?.length) parts.push(`Health goals: ${profile.goals.join(", ")}`);
  return parts.join(". ");
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [selWord, setSelWord] = useState<HealthWord | null>(null);
  const [isQROpen, setQROpen] = useState(false);
  const [isReportOpen, setReportOpen] = useState(false);
  const [isOnboardOpen, setOnboardOpen] = useState(false);
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [apiWarn, setApiWarn] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  /* ── Responsive sidebar ── */
  useEffect(() => {
    const check = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ── Restore from localStorage ── */
  useEffect(() => {
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
  }, []);

  /* ── Supabase Auth ── */
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        await syncUserData(session.user);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setCurrentUser(session.user);
          await syncUserData(session.user);
        } else {
          setCurrentUser(null);
          setConversations([]);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function syncUserData(user: any) {
    const dbProfile = await fetchUserProfile(user.id);
    if (dbProfile) {
      setProfile((prev) => ({
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

    // Load conversations for sidebar
    const convs = await getConversations(user.id);
    setConversations(
      convs.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
      }))
    );

    // Load most recent conversation
    if (convs.length > 0 && msgs.length === 0) {
      const latestId = convs[0].id;
      setActiveConvId(latestId);
      const dbMsgs = await loadConversationMessages(latestId);
      if (dbMsgs.length > 0) {
        setMsgs(
          dbMsgs.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            category: m.category,
            isEmergency: m.isEmergency,
            ts: new Date(m.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }))
        );
      }
    }
  }

  /* ── Persist chat locally ── */
  useEffect(() => {
    if (msgs.length)
      localStorage.setItem("wellup_chat", JSON.stringify(msgs.slice(-60)));
  }, [msgs]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  /* ── New Chat ── */
  const handleNewChat = () => {
    setMsgs([]);
    setActiveConvId(null);
    localStorage.removeItem("wellup_chat");
    if (window.innerWidth < 768) setSidebarCollapsed(true);
  };

  /* ── Select conversation ── */
  const handleSelectConv = async (id: string) => {
    if (id === activeConvId) return;
    setActiveConvId(id);
    setMsgs([]);
    const dbMsgs = await loadConversationMessages(id);
    setMsgs(
      dbMsgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        category: m.category,
        isEmergency: m.isEmergency,
        ts: new Date(m.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }))
    );
    if (window.innerWidth < 768) setSidebarCollapsed(true);
  };

  /* ── Delete conversation ── */
  const handleDeleteConv = async (id: string) => {
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) handleNewChat();
  };

  /* ── Send message ── */
  const send = useCallback(
    async (text?: string, opts?: { explainSimply?: boolean }) => {
      const q = (text ?? input).trim();
      if (!q || loading) return;
      if (!text) setInput("");

      const nowTs = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const userMsg: Message = {
        id: `u${Date.now()}`,
        role: "user",
        content: q,
        ts: nowTs,
      };
      setMsgs((prev) => [...prev, userMsg]);
      setLoading(true);

      // Create conversation in Supabase if needed
      let convId = activeConvId;
      if (currentUser && !convId) {
        const newId = await createConversation(currentUser.id, q);
        if (newId) {
          convId = newId;
          setActiveConvId(newId);
          setConversations((prev) => [
            { id: newId, title: q.slice(0, 60), createdAt: new Date().toISOString() },
            ...prev,
          ]);
        }
      }

      // Save user message
      if (currentUser && convId) {
        saveChatMessageToConversation(convId, currentUser.id, { role: "user", content: q });
      } else if (currentUser) {
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
            history: msgs.slice(-10).map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: m.content,
            })),
            conversationId: convId,
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
        setMsgs((prev) => [...prev, botMsg]);

        // Save bot message
        if (currentUser && convId) {
          saveChatMessageToConversation(convId, currentUser.id, {
            role: "assistant",
            content: botMsg.content,
            category: botMsg.category,
            isEmergency: botMsg.isEmergency,
          });
        } else if (currentUser) {
          saveChatMessage(currentUser.id, {
            role: "assistant",
            content: botMsg.content,
            category: botMsg.category,
            isEmergency: botMsg.isEmergency,
          });
        }
      } catch {
        setMsgs((prev) => [
          ...prev,
          {
            id: `e${Date.now()}`,
            role: "assistant",
            content: "⚠️ Connection issue. Please try again.",
            ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, language, loading, msgs, profile, currentUser, activeConvId]
  );

  const hasChat = msgs.length > 0;
  const userDisplay = extractUserDisplayInfo(currentUser?.email, profile?.nickname);

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <div className="chat-layout">

      {/* ── SIDEBAR ── */}
      <Sidebar
        conversations={conversations}
        activeConvId={activeConvId}
        onNewChat={handleNewChat}
        onSelectConv={handleSelectConv}
        onDeleteConv={handleDeleteConv}
        onCategoryClick={(q) => {
          send(q);
          if (window.innerWidth < 768) setSidebarCollapsed(true);
        }}
        onAuthClick={() => setAuthOpen(true)}
        onProfileClick={() => setOnboardOpen(true)}
        onReportClick={() => setReportOpen(true)}
        onThemeClick={() => {}}
        currentUser={currentUser}
        userNickname={userDisplay.displayName}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarCollapsed(true)}
      />

      {/* ── MAIN COLUMN ── */}
      <div className="chat-main">

        {/* ── FLOATING APPLE-STYLE CORNER BADGES (No full-width topbar) ── */}
        <div className="pointer-events-none absolute top-3.5 left-3 sm:left-5 right-3 sm:right-5 z-20 flex items-center justify-between">
          {/* Top-Left: WellUP Logo + SDG 3 Badge + Sidebar Expand Button */}
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl bg-white/80 dark:bg-black/60 border border-black/10 dark:border-white/10 shadow-lg text-xs font-medium text-zinc-900 dark:text-white select-none transition-all duration-300 ease-out">
            <div
              className={`flex items-center overflow-hidden transition-all duration-300 ease-out ${
                sidebarCollapsed ? "w-6 opacity-100 mr-0.5" : "w-0 opacity-0 mr-0 pointer-events-none"
              }`}
            >
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-1 -ml-1 rounded-full hover:bg-black/10 dark:hover:bg-white/15 text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors shrink-0"
                title="Open sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </div>
            <img
              src="/favicon.svg"
              alt="WellUP"
              className="w-5 h-5 rounded-lg border border-white/10 shadow-sm shrink-0"
            />
            <span className="font-bold tracking-tight text-[13px] text-zinc-900 dark:text-white whitespace-nowrap">
              {BRAND.name}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap shrink-0">
              SDG 3
            </span>
          </div>

          {/* Top-Right: Profile / Sync Status */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setAuthOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl bg-black/40 dark:bg-black/60 border border-white/10 shadow-lg text-xs font-medium text-white hover:border-emerald-500/40 hover:bg-black/60 transition-all select-none"
            >
              {currentUser ? (
                <>
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 overflow-hidden border border-emerald-500/40"
                    style={{ background: "var(--primary)" }}
                  >
                    {userDisplay.avatarUrl ? (
                      <img
                        src={userDisplay.avatarUrl}
                        alt={userDisplay.displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span>{userDisplay.initials}</span>
                    )}
                  </div>
                  <span className="max-w-[120px] truncate text-zinc-200 font-semibold">{userDisplay.displayName}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Synced" />
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </div>
        </div>

        {/* ── API WARN BANNER ── */}
        {apiWarn && (
          <div
            className="flex items-center gap-2.5 px-4 py-2 text-xs"
            style={{
              background: "#FFF7ED",
              borderBottom: "1px solid #FED7AA",
              color: "#9A3412",
            }}
          >
            <Info style={{ width: 13, height: 13, flexShrink: 0 }} />
            <span className="flex-1">
              <strong>Notice:</strong> {apiWarn}
            </span>
            <button
              onClick={() => setApiWarn(null)}
              style={{ color: "#9A3412", fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── MESSAGES ── */}
        <div className="chat-messages">
          {!hasChat ? (
            /* ── EMPTY STATE ── */
            <div className={`chat-layout-wrapper ${sidebarCollapsed ? "collapsed" : ""} py-8 anim-fadeUp flex flex-col items-center`}>
              {/* Hero */}
              <div className="text-center max-w-md space-y-3 mb-8">
                <div
                  className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                  style={{
                    background: "var(--primary)",
                    boxShadow: "0 4px 20px rgba(45,125,103,0.3)",
                  }}
                >
                  <img src="/favicon.svg" alt="WellUP" className="w-9 h-9" />
                </div>
                <h1
                  className="text-2xl font-extrabold tracking-tight"
                  style={{ color: "var(--text)" }}
                >
                  {BRAND.tagline}
                </h1>
                <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.65 }}>
                  Ask about your body, periods, nutrition, sleep, stress — anything health-related.
                  Completely private. Zero judgment.
                </p>

                {!currentUser && (
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => setAuthOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{
                        background: "var(--primary)",
                        color: "#fff",
                        boxShadow: "0 2px 8px rgba(45,125,103,0.25)",
                      }}
                    >
                      Sign in & Save History
                    </button>
                    <button
                      onClick={() => setOnboardOpen(true)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold"
                      style={{
                        background: "var(--primary-light)",
                        color: "var(--primary)",
                        border: "1px solid var(--hw-border)",
                      }}
                    >
                      Set Health Profile
                    </button>
                  </div>
                )}
              </div>

              {/* Category Cards */}
              <div className="w-full max-w-2xl sm:max-w-3xl transition-all duration-300">
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: "var(--text-muted)" }}
                >
                  Explore Topics
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 stagger-children">
                  {HEALTH_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => send(cat.questions[0])}
                      className="category-card text-left anim-fadeUp"
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <p
                        className="font-semibold text-xs"
                        style={{ color: "var(--text)" }}
                      >
                        {cat.name}
                      </p>
                      <p
                        className="text-xs line-clamp-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {cat.questions[0]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Starter questions */}
              <div className="w-full max-w-2xl sm:max-w-3xl mt-6 transition-all duration-300">
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-2.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Popular Questions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STARTER_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => send(q)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: "var(--surface-raised)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)";
                        (e.currentTarget as HTMLElement).style.color = "var(--primary)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── ACTIVE CHAT ── */
            <div className={`chat-layout-wrapper ${sidebarCollapsed ? "collapsed" : ""} space-y-4`}>
              {msgs.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`msg-wrap ${msg.role === "user" ? "user" : "bot"} anim-fadeUp`}
                  style={{ animationDelay: `${Math.min(idx * 20, 200)}ms` }}
                >
                  {/* Bot avatar */}
                  {msg.role === "assistant" && (
                    <img
                      src="/favicon.svg"
                      alt="WellUP"
                      className="w-7 h-7 rounded-lg shrink-0 mt-0.5"
                      style={{ border: "1px solid var(--border)" }}
                    />
                  )}

                  <div
                    className={`bubble ${msg.role === "user" ? "user" : msg.isEmergency ? "emergency" : "bot"}`}
                  >
                    {/* Emergency banner */}
                    {msg.isEmergency && (
                      <div
                        className="flex items-center gap-2 mb-2.5 px-3 py-1.5 rounded-lg"
                        style={{
                          background: "var(--emergency-light)",
                          border: "1px solid var(--emergency-border)",
                        }}
                      >
                        <AlertTriangle
                          style={{ width: 14, height: 14, color: "var(--emergency)", flexShrink: 0 }}
                        />
                        <span
                          className="text-xs font-bold"
                          style={{ color: "var(--emergency)" }}
                        >
                          Emergency: Call 112 or 108 immediately
                        </span>
                      </div>
                    )}

                    {/* Message body */}
                    {msg.role === "user" ? (
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--bubble-user-fg)" }}
                      >
                        {msg.content}
                      </p>
                    ) : (
                      <MsgContent
                        text={msg.content}
                        words={msg.healthWords || []}
                        onWord={setSelWord}
                      />
                    )}

                    {/* Health words tray */}
                    {msg.role === "assistant" &&
                      msg.healthWords &&
                      msg.healthWords.length > 0 && (
                        <div
                          className="mt-2.5 pt-2 flex flex-wrap items-center gap-1.5"
                          style={{
                            borderTop: "1px solid var(--border-subtle)",
                          }}
                        >
                          <span
                            className="text-[10px] font-semibold"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Health Words:
                          </span>
                          {msg.healthWords.map((hw, i) => (
                            <button
                              key={i}
                              onClick={() => setSelWord(hw)}
                              className="hw-tag"
                            >
                              <Sparkles style={{ width: 10, height: 10 }} />
                              {hw.term}
                            </button>
                          ))}
                        </div>
                      )}

                    {/* Sources */}
                    {msg.role === "assistant" &&
                      msg.sources &&
                      msg.sources.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {msg.sources.map((src, i) => (
                            <span key={i} className="source-pill">
                              {src}
                            </span>
                          ))}
                        </div>
                      )}

                    {/* Footer */}
                    <div
                      className="mt-1.5 flex items-center justify-between"
                      style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}
                    >
                      {msg.role === "assistant" && msg.category ? (
                        <span
                          className="font-semibold"
                          style={{ color: "var(--primary)", opacity: 0.8 }}
                        >
                          {msg.category}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span
                        style={{
                          color:
                            msg.role === "user"
                              ? "rgba(255,255,255,0.55)"
                              : "var(--text-muted)",
                        }}
                      >
                        {msg.ts}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="msg-wrap bot anim-fadeIn">
                  <img
                    src="/favicon.svg"
                    alt="WellUP"
                    className="w-7 h-7 rounded-lg shrink-0 mt-0.5"
                    style={{ border: "1px solid var(--border)" }}
                  />
                  <div
                    className="bubble bot flex items-center gap-1.5"
                    style={{ padding: "12px 16px" }}
                  >
                    <div className="dot" />
                    <div className="dot" />
                    <div className="dot" />
                    <span
                      className="ml-1 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Thinking…
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── PROMPT BAR (sticky bottom) ── */}
        <PromptBar
          value={input}
          onChange={setInput}
          onSend={(opts) => send(undefined, opts)}
          onSuggest={() => send("I'm not sure what to ask. Can you suggest some health questions for me?")}
          onMythFact={() => send("Is it true that you shouldn't exercise during your period?")}
          onUploadReport={() => setReportOpen(true)}
          loading={loading}
          language={language}
          sidebarCollapsed={sidebarCollapsed}
          onLanguageChange={(l) => {
            setLanguage(l);
            if (profile) setProfile({ ...profile, language: l });
          }}
        />
      </div>

      {/* ── MODALS ── */}
      <HealthWordsModal
        word={selWord}
        onClose={() => setSelWord(null)}
        onSelectRelated={(t) =>
          send(`What does ${t} mean in simple terms?`)
        }
      />
      <QRCodeModal isOpen={isQROpen} onClose={() => setQROpen(false)} />
      <ReportUploadModal
        isOpen={isReportOpen}
        onClose={() => setReportOpen(false)}
        onReportAnalyzed={(s, a, fullText) =>
          send(
            fullText || `📄 Report summary:\n${s}${a ? `\n📅 Possible appointment: ${a}` : ""}`
          )
        }
        currentUser={currentUser}
        userProfile={profile}
        onUpdateProfile={async (updatedProfile) => {
          setProfile(updatedProfile);
          if (currentUser) {
            await saveUserProfile(currentUser.id, updatedProfile, currentUser.email);
          }
        }}
      />
      <OnboardingModal
        isOpen={isOnboardOpen}
        onClose={() => setOnboardOpen(false)}
        onComplete={async (p) => {
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
        onLogout={async () => {
          await signOutUser();
          setCurrentUser(null);
          setConversations([]);
          setActiveConvId(null);
          setMsgs([]);
          localStorage.removeItem("wellup_chat");
        }}
        onOpenOnboarding={() => {
          setAuthOpen(false);
          setOnboardOpen(true);
        }}
        onAuthSuccess={async (u, prof) => {
          setCurrentUser(u);
          if (prof) {
            setProfile((prev) => ({
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
              language: prof.language || prev?.language || "en",
            }));
          }
        }}
      />
    </div>
  );
}
