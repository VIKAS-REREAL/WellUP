"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  signInWithGoogle,
  sendMagicLink,
  signOutUser,
  UserHealthProfile,
} from "@/lib/supabase";
import { extractUserDisplayInfo } from "@/lib/userProfile";
import {
  Mail,
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

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.09C3.25 21.36 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.26C.46 8.18 0 9.99 0 12c0 2.01.46 3.82 1.26 5.41l4.02-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.64 1.26 6.59l4.02 3.09c.95-2.83 3.6-4.93 6.72-4.93z"
      />
    </svg>
  );
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
  const [email, setEmail] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetForm = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setEmail("");
    setGoogleLoading(false);
    setMagicLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setGoogleLoading(true);

    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMsg(error);
      setGoogleLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setMagicLoading(true);
    const { success, error } = await sendMagicLink(email);
    setMagicLoading(false);

    if (error) {
      setErrorMsg(error);
    } else if (success) {
      setSuccessMsg("Magic login link sent! Check your inbox to sign in.");
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    onLogout();
    onClose();
  };

  const userDisplay = extractUserDisplayInfo(currentUser?.email, userProfile?.nickname);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          resetForm();
        }
      }}
    >
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
              {currentUser ? "Account & Health Profile" : "Sign in to WellUP"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            {currentUser
              ? "Your chat history and health context are safely synced with Supabase."
              : "Sign in with Google or a magic link to sync chat history and your health profile across devices."}
          </DialogDescription>
        </DialogHeader>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 my-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-800/40">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 my-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl border border-emerald-200 dark:border-emerald-800/40">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="leading-tight">{successMsg}</span>
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
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-bold hover:underline text-[11px] inline-flex items-center gap-1 cursor-pointer"
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

            {/* Bottom Actions Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2 mt-1">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold border border-red-500/20 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ─── STREAMLINED AUTH: GOOGLE OAUTH + MAGIC LINK ONLY ─── */
          <div className="flex flex-col w-full pt-2 space-y-4">
            {/* 1. Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || magicLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold border border-zinc-200 dark:border-white/10 bg-zinc-50 hover:bg-zinc-100 dark:bg-[#222226] dark:hover:bg-[#2a2a30] text-zinc-900 dark:text-white shadow-sm transition-all hover:shadow active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
              ) : (
                <GoogleIcon className="w-4 h-4 shrink-0" />
              )}
              <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-white/10" />
              </div>
              <div className="relative px-3 bg-white dark:bg-[#18181b] text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                or continue with email
              </div>
            </div>

            {/* 2. Magic Link Flow */}
            <form onSubmit={handleMagicLink} className="flex flex-col space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-[#222226] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={magicLoading || googleLoading || !email.trim()}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {magicLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{magicLoading ? "Sending Magic Link..." : "Send Magic Link"}</span>
              </button>
            </form>

            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center leading-relaxed">
              No passwords to remember. We’ll email you a secure login link.
            </p>

            {/* Guest Option Footer */}
            <div className="pt-2 border-t border-zinc-100 dark:border-white/5 text-center">
              <button
                type="button"
                onClick={onClose}
                className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white font-medium underline transition-colors cursor-pointer"
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
