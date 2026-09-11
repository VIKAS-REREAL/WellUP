"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  signInWithEmail,
  signUpWithEmail,
  sendMagicLink,
  signOutUser,
  UserHealthProfile,
} from "@/lib/supabase";
import { extractUserDisplayInfo } from "@/lib/userProfile";
import { BRAND } from "@/lib/brand";
import {
  ShieldCheck,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  LogOut,
  Loader2,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any | null;
  userProfile: UserHealthProfile | null;
  onAuthSuccess: (user: any, profile?: UserHealthProfile) => void;
  onLogout: () => void;
  onOpenOnboarding: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onAuthSuccess,
  onLogout,
  onOpenOnboarding,
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetForm = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setEmail("");
    setPassword("");
    setDisplayName("");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!email || !password) {
      setErrorMsg("Please provide both email and password.");
      return;
    }
    setLoading(true);
    const { user, error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      setErrorMsg(error);
    } else if (user) {
      onAuthSuccess(user);
      onClose();
      resetForm();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!email || !password) {
      setErrorMsg("Please provide both email and password.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { user, error } = await signUpWithEmail(email, password, displayName);
    setLoading(false);
    if (error) {
      setErrorMsg(error);
    } else if (user) {
      setSuccessMsg("Account created! Check your email to confirm if required.");
      onAuthSuccess(user, { nickname: displayName || email.split("@")[0] });
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1200);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!email) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    setLoading(true);
    const { success, error } = await sendMagicLink(email);
    setLoading(false);
    if (error) {
      setErrorMsg(error);
    } else if (success) {
      setSuccessMsg("Magic login link sent to your email!");
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    onLogout();
    onClose();
  };

  const userDisplay = extractUserDisplayInfo(currentUser?.email, userProfile?.nickname);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-white/10 shadow-2xl rounded-2xl text-zinc-900 dark:text-zinc-100 overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="space-y-1.5 pb-1">
          <div className="flex items-center gap-2.5">
            <div
              className="relative w-8 h-8 rounded-xl flex items-center justify-center p-1 border border-emerald-500/25 shrink-0 shadow-sm"
              style={{ background: "radial-gradient(circle, #34d399 20%, #10b981 60%, #059669 100%)" }}
            >
              <img src="/favicon.svg" alt="WellUP" className="w-5 h-5 rounded-md object-contain" />
            </div>
            <DialogTitle className="text-base font-bold text-zinc-900 dark:text-white">
              {currentUser ? "Account & Health Profile" : "Sign In to WellUP"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            {currentUser
              ? "Your chat history and health context are safely synced with Supabase."
              : "Sign in to save your chat history and personalized health context across devices."}
          </DialogDescription>
        </DialogHeader>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 my-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-800/40">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 my-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl border border-emerald-200 dark:border-emerald-800/40">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {currentUser ? (
          /* ─── LOGGED IN PROFILE VIEW ─── */
          <div className="flex flex-col space-y-4 pt-2 w-full">
            {/* User Details Card */}
            <div className="flex items-center gap-3.5 p-3.5 bg-zinc-50 dark:bg-[#222226] rounded-2xl border border-zinc-200/80 dark:border-white/10">
              <div className="relative shrink-0 w-12 h-12">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-emerald-500/30 ring-2 ring-emerald-500/20 bg-emerald-600 flex items-center justify-center">
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
                    <span className="text-white font-bold text-sm select-none">
                      {userDisplay.initials}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#222226]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {userDisplay.displayName}
                  </p>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5">
                    Synced
                  </Badge>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                  {currentUser.email}
                </p>
              </div>
            </div>

            {/* Health Context Summary */}
            <div className="p-4 bg-emerald-500/[0.07] dark:bg-emerald-950/25 rounded-2xl border border-emerald-500/20 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Personalized Health Context</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOnboarding();
                  }}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-bold hover:underline text-[11px] inline-flex items-center gap-1"
                >
                  <span>Edit Profile</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-[11px] pt-1">
                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-emerald-500/10">
                  <p className="text-zinc-500 dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Age Group</p>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-100 mt-1">
                    {(userProfile as any)?.ageGroup || userProfile?.ageRange || "Not specified"}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-emerald-500/10">
                  <p className="text-zinc-500 dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider">Allergies</p>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-100 mt-1 truncate">
                    {userProfile?.allergies?.length ? userProfile.allergies.join(", ") : "None reported"}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions Grid: Perfect 2-column balance with zero overflow */}
            <div className="grid grid-cols-2 gap-3 pt-2 mt-1">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold border border-red-500/20 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ─── AUTH FORM TABS (Bulletproof Segmented Control) ─── */
          <div className="flex flex-col w-full pt-1">
            {/* Top Segmented Tabs: 3 Equal Columns */}
            <div className="grid grid-cols-3 p-1 rounded-xl bg-zinc-100 dark:bg-[#222226] border border-zinc-200/80 dark:border-white/5 gap-1 mb-4">
              <button
                type="button"
                onClick={() => { setActiveTab("signin"); setErrorMsg(null); }}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "signin"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("signup"); setErrorMsg(null); }}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "signup"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("magic"); setErrorMsg(null); }}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "magic"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                Magic Link
              </button>
            </div>

            {/* TAB CONTENT: Sign In */}
            {activeTab === "signin" && (
              <form onSubmit={handleSignIn} className="flex flex-col space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-[#222226] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-[#222226] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 mt-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{loading ? "Signing In..." : "Sign In"}</span>
                </button>
              </form>
            )}

            {/* TAB CONTENT: Sign Up */}
            {activeTab === "signup" && (
              <form onSubmit={handleSignUp} className="flex flex-col space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Display Nickname</label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="e.g. Vikas, Maya, Sam"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-[#222226] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-[#222226] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Password (min 6 characters)</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-[#222226] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 mt-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{loading ? "Creating Account..." : "Create Account"}</span>
                </button>
              </form>
            )}

            {/* TAB CONTENT: Magic Link */}
            {activeTab === "magic" && (
              <form onSubmit={handleMagicLink} className="flex flex-col space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-[#222226] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 mt-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{loading ? "Sending Link..." : "Send Magic Login Link"}</span>
                </button>
              </form>
            )}

            {/* Guest Option Footer */}
            <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-white/5 text-center">
              <button
                type="button"
                onClick={onClose}
                className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white font-medium underline transition-colors"
              >
                Continue as anonymous guest (zero account required)
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
