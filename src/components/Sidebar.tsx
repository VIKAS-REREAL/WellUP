"use client";

import React, { useState, useMemo } from "react";
import {
  MessageSquare, PlusCircle, Trash2,
  Sparkles, Search, PanelLeft, X, ChevronDown, ChevronRight,
  LogIn, FileText
} from "lucide-react";
import { ThemeSelector } from "./ThemeSelector";
import { extractUserDisplayInfo } from "@/lib/userProfile";

export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: string;
  isActive?: boolean;
}

interface SidebarProps {
  conversations: ConversationMeta[];
  activeConvId: string | null;
  onNewChat: () => void;
  onSelectConv: (id: string) => void;
  onDeleteConv: (id: string) => void;
  onCategoryClick: (question: string) => void;
  onAuthClick: () => void;
  onProfileClick: () => void;
  onReportClick?: () => void;
  onThemeClick?: () => void;
  currentUser: any | null;
  userNickname?: string;
  collapsed: boolean;
  onClose: () => void;
}

const NORMAL_TOPICS = [
  { emoji: "🩸", label: "Period pain & cramps", q: "Why do period cramps happen and what actually relieves them fast?" },
  { emoji: "😴", label: "Fix sleep schedule", q: "I have trouble sleeping and wake up tired. How can I fix my sleep cycle?" },
  { emoji: "🧘", label: "Neck & laptop strain", q: "I have neck and shoulder pain from working on my laptop. What exercises help?" },
  { emoji: "🥗", label: "Active energy nutrition", q: "What should I eat daily to keep consistent energy throughout the day?" },
  { emoji: "🧠", label: "Stress & overthinking", q: "What are effective, quick ways to manage stress and calm down anxiety?" },
  { emoji: "🌿", label: "Puberty & growth", q: "What normal physical and hormonal changes happen during puberty?" },
  { emoji: "⚖️", label: "Myth vs Fact", q: "Is it true that you shouldn't exercise or shower during your period?" },
];

export function Sidebar({
  conversations,
  activeConvId,
  onNewChat,
  onSelectConv,
  onDeleteConv,
  onCategoryClick,
  onAuthClick,
  onProfileClick,
  onReportClick,
  currentUser,
  userNickname,
  collapsed,
  onClose,
}: SidebarProps) {
  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [topicsOpen, setTopicsOpen] = useState(true);

  const userDisplay = extractUserDisplayInfo(currentUser?.email, userNickname);

  // Filter conversations by search query
  const filteredConvs = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  // Filter topics if search query is present
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return NORMAL_TOPICS;
    const q = searchQuery.toLowerCase();
    return NORMAL_TOPICS.filter(t => t.label.toLowerCase().includes(q) || t.q.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <>
      {/* Mobile drawer backdrop */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar sidebar-scroll ${collapsed ? "collapsed" : ""} max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-[280px] max-md:shadow-2xl transition-all duration-300 ${collapsed ? "max-md:-translate-x-full" : "max-md:translate-x-0"}`}
        style={{
          width: collapsed ? 0 : 260,
          minWidth: collapsed ? 0 : 260,
          maxWidth: collapsed ? 0 : 260,
          background: "var(--sidebar-bg)",
          borderRight: collapsed ? "none" : "1px solid var(--sidebar-border)",
        }}
      >
        {/* ── TOP HEADER: Logo on left, Search & Collapse on right ── */}
        <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2 shrink-0">
          {/* WellUP Logo & Brand on top left */}
          <div
            onClick={onNewChat}
            className="flex items-center gap-2 cursor-pointer group"
            title="WellUP - Home"
          >
            <div className="relative flex items-center justify-center w-7 h-7">
              <div
                className="absolute inset-0 rounded-full blur-[6px] opacity-70"
                style={{
                  background: "radial-gradient(circle, #34d399 20%, #10b981 60%, #059669 100%)",
                }}
              />
              <img
                src="/favicon.svg"
                alt="WellUP"
                className="relative w-6 h-6 rounded-lg shadow-sm border border-white/20 object-contain"
              />
            </div>
            <span
              className="font-bold text-[14px] tracking-tight group-hover:text-emerald-500 transition-colors"
              style={{ color: "var(--sidebar-fg)" }}
            >
              WellUP
            </span>
          </div>

          {/* Search & Collapse Icons on right */}
          <div className="flex items-center gap-1" style={{ color: "var(--sidebar-muted)" }}>
            <button
              onClick={() => {
                setSearchOpen(v => !v);
                if (searchOpen) setSearchQuery("");
              }}
              className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/[0.08]"
              style={{ color: searchOpen ? "var(--primary)" : "var(--sidebar-muted)" }}
              title="Search chats & topics"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors"
              style={{ color: "var(--sidebar-muted)" }}
              title="Close sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── WORKING SEARCH INPUT (Toggled by Search icon) ── */}
        {searchOpen && (
          <div className="px-3 pb-2 pt-1 shrink-0 anim-fadeIn">
            <div className="relative flex items-center">
              <Search
                className="w-3.5 h-3.5 absolute left-2.5 pointer-events-none"
                style={{ color: "var(--sidebar-muted)" }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search chats or topics…"
                className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs border focus:border-emerald-500 focus:outline-none transition-colors"
                style={{
                  background: "var(--sidebar-hover)",
                  color: "var(--sidebar-fg)",
                  borderColor: "var(--sidebar-border)",
                }}
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 p-0.5 hover:opacity-100"
                  style={{ color: "var(--sidebar-muted)" }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── NEW CHAT BUTTON ── */}
        <div className="px-3 pt-1 pb-2 shrink-0">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all group"
            style={{
              background: "var(--sidebar-hover)",
              color: "var(--sidebar-fg)",
              border: "1px solid var(--sidebar-border)",
            }}
          >
            <PlusCircle className="w-4 h-4 text-emerald-500 group-hover:scale-105 transition-transform" />
            <span>New chat</span>
          </button>
        </div>

        {/* ── SCROLLABLE MIDDLE: Chats & Single-Fold Topics ── */}
        <div className="flex-1 overflow-y-auto sidebar-scroll min-h-0 px-2 space-y-3">

          {/* ── CHATS SECTION ── */}
          <div>
            <div
              className="flex items-center gap-2 px-2.5 py-1 text-[12px] font-medium uppercase tracking-wider"
              style={{ color: "var(--sidebar-muted)" }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chats</span>
              {searchQuery && (
                <span className="text-[10px] ml-auto lowercase opacity-80">
                  ({filteredConvs.length} found)
                </span>
              )}
            </div>

            <div className="space-y-0.5 mt-1">
              {filteredConvs.length > 0 ? (
                filteredConvs.slice(0, 30).map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => onSelectConv(conv.id)}
                    onMouseEnter={() => setHoveredConv(conv.id)}
                    onMouseLeave={() => setHoveredConv(null)}
                    className="group relative flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] cursor-pointer transition-colors"
                    style={{
                      background:
                        activeConvId === conv.id
                          ? "var(--sidebar-active)"
                          : hoveredConv === conv.id
                          ? "var(--sidebar-hover)"
                          : "transparent",
                      color: activeConvId === conv.id ? "var(--sidebar-fg)" : "var(--sidebar-muted)",
                      fontWeight: activeConvId === conv.id ? 600 : 400,
                    }}
                  >
                    <span className="truncate pr-2 select-none" style={{ color: activeConvId === conv.id ? "var(--sidebar-fg)" : undefined }}>
                      {conv.title || "Health discussion"}
                    </span>
                    {hoveredConv === conv.id && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteConv(conv.id);
                        }}
                        className="p-1 rounded hover:text-red-500 transition-all shrink-0"
                        style={{ color: "var(--sidebar-muted)" }}
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-xs italic" style={{ color: "var(--sidebar-muted)" }}>
                  {searchQuery ? "No matching chats found" : "No previous chats yet"}
                </div>
              )}
            </div>
          </div>

          {/* ── SINGLE FOLD: NORMAL TOPICS TO ASK ── */}
          <div className="pt-2 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
            <button
              onClick={() => setTopicsOpen(v => !v)}
              className="w-full flex items-center justify-between px-2.5 py-1 text-[12px] font-medium uppercase tracking-wider transition-colors text-left"
              style={{ color: "var(--sidebar-muted)" }}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Normal topics to ask</span>
              </div>
              {topicsOpen ? (
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              )}
            </button>

            {topicsOpen && (
              <div className="space-y-0.5 mt-1.5 anim-fadeIn">
                {filteredTopics.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => onCategoryClick(topic.q)}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-colors text-left group hover:bg-black/5 dark:hover:bg-white/[0.06]"
                    style={{ color: "var(--sidebar-fg)" }}
                  >
                    <span className="text-sm shrink-0">{topic.emoji}</span>
                    <span className="truncate flex-1 font-normal opacity-90 group-hover:opacity-100">{topic.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── BOTTOM SECTION: Medical Reports + WellUp 101 + Theme + Auth ── */}
        <div className="shrink-0 px-3 py-3 space-y-2 border-t" style={{ borderColor: "var(--sidebar-border)" }}>

          {/* Medical Reports & PDF Upload Button */}
          {onReportClick && (
            <div
              onClick={onReportClick}
              className="w-full p-2.5 rounded-2xl cursor-pointer transition-all border group hover:border-emerald-500/50"
              style={{
                background: "var(--sidebar-hover)",
                borderColor: "var(--sidebar-border)",
              }}
              title="Upload and analyze medical reports & PDFs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-emerald-500">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold tracking-tight leading-tight group-hover:text-emerald-500 transition-colors truncate" style={{ color: "var(--sidebar-fg)" }}>
                      Medical Reports
                    </p>
                    <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--sidebar-muted)" }}>
                      Upload & analyze PDFs
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                  PDF
                </span>
              </div>
            </div>
          )}

          {/* WellUp 101 Card */}
          <div
            onClick={onProfileClick}
            className="w-full p-2.5 rounded-2xl cursor-pointer transition-all border group hover:border-amber-500/50"
            style={{
              background: "var(--sidebar-hover)",
              borderColor: "var(--sidebar-border)",
            }}
          >
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold tracking-tight leading-tight group-hover:text-amber-500 transition-colors" style={{ color: "var(--sidebar-fg)" }}>
                  WellUP 101
                </p>
                <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--sidebar-muted)" }}>
                  Personalize your health profile
                </p>
              </div>
            </div>
          </div>

          {/* Theme Selector */}
          <ThemeSelector />

          {/* Auth / Account Profile */}
          <button
            onClick={onAuthClick}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/[0.05]"
            style={{ color: "var(--sidebar-fg)" }}
          >
            {currentUser ? (
              <>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white overflow-hidden border border-emerald-500/40"
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
                <span className="truncate text-left flex-1 font-semibold" style={{ color: "var(--sidebar-fg)" }}>
                  {userDisplay.displayName}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Synced" />
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 shrink-0" style={{ color: "var(--sidebar-muted)" }} />
                <span style={{ color: "var(--sidebar-fg)" }}>Sign in & Sync</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
