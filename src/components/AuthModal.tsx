"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  signInWithEmail,
  signUpWithEmail,
  sendMagicLink,
  signOutUser,
  saveUserProfile,
  UserHealthProfile,
} from "@/lib/supabase";
import { BRAND } from "@/lib/brand";
import { ShieldCheck, Mail, Lock, User as UserIcon, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

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

  const initials = (userProfile?.nickname || currentUser?.email || "U")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 bg-white border border-border shadow-xl rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              {currentUser ? "Account & Health Profile" : "Sign In to WellUP"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {currentUser
              ? "Your chat history and health context are safely synced with Supabase."
              : "Sign in to save your chat history and personalized health context across devices."}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {currentUser ? (
          /* Logged In View */
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <Avatar className="w-10 h-10 border border-slate-300">
                <AvatarFallback className="bg-emerald-600 text-white font-bold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">
                  {userProfile?.nickname || currentUser.email?.split("@")[0] || "User"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{currentUser.email}</p>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]">
                DB Connected
              </Badge>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-950">Health Context</span>
                <button
                  onClick={() => {
                    onClose();
                    onOpenOnboarding();
                  }}
                  className="text-emerald-700 font-bold hover:underline"
                >
                  Edit Profile →
                </button>
              </div>
              <div className="text-[11px] text-emerald-800 space-y-0.5">
                <p>• Age group: <strong>{userProfile?.ageRange || "Not specified"}</strong></p>
                {userProfile?.allergies && userProfile.allergies.length > 0 && (
                  <p>• Allergies: <strong>{userProfile.allergies.join(", ")}</strong></p>
                )}
                {userProfile?.goals && userProfile.goals.length > 0 && (
                  <p>• Goals: <strong>{userProfile.goals.join(", ")}</strong></p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
              <Button
                variant="default"
                size="sm"
                className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={onClose}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Auth Form Tabs */
          <Tabs value={activeTab} onValueChange={(val: any) => { setActiveTab(val); setErrorMsg(null); }} className="w-full pt-1">
            <TabsList className="grid grid-cols-3 mb-3 bg-slate-100 p-1 rounded-lg">
              <TabsTrigger value="signin" className="text-xs font-semibold">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-xs font-semibold">Sign Up</TabsTrigger>
              <TabsTrigger value="magic" className="text-xs font-semibold">Magic Link</TabsTrigger>
            </TabsList>

            {/* Sign In Tab */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-8 text-xs h-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-8 text-xs h-9"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
                >
                  {loading ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Display Nickname</label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="e.g. Maya, Sam, Alex"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-8 text-xs h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-8 text-xs h-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Password (min 6 characters)</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-8 text-xs h-9"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>

            {/* Magic Link Tab */}
            <TabsContent value="magic">
              <form onSubmit={handleMagicLink} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-8 text-xs h-9"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
                >
                  {loading ? "Sending Link..." : "Send Magic Login Link"}
                </Button>
              </form>
            </TabsContent>

            <div className="pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={onClose}
                className="text-[11px] text-muted-foreground hover:text-foreground font-medium underline"
              >
                Continue as anonymous guest (zero account required)
              </button>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
