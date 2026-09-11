"use client";

import React, { useState } from "react";
import { X, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { BRAND } from "@/lib/brand";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  onLoginSuccess: (p: any) => void;
  onLogout: () => void;
}

export function AuthModal({ isOpen, onClose, isLoggedIn, onLoginSuccess, onLogout }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [nickname, setNickname] = useState("");
  const [ageRange, setAgeRange] = useState("16-19");
  const [allergies, setAllergies] = useState("");
  const [consent, setConsent] = useState(false);

  if (!isOpen) return null;

  const save = () => {
    const profile = {
      nickname: nickname.trim() || "Explorer",
      ageRange,
      allergies: allergies.split(",").map(s => s.trim()).filter(Boolean),
      storageConsent: consent,
    };
    if (consent) localStorage.setItem("wellup_profile", JSON.stringify(profile));
    else localStorage.removeItem("wellup_profile");
    onLoginSuccess(profile);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "13px",
    borderRadius: "12px",
    border: "1.5px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
    outline: "none",
    transition: "border-color 0.2s",
  };

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

        {/* Header */}
        <div className="p-5 pb-4 flex items-start justify-between gap-3" style={{ background: "var(--gradient-hero)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--primary)", boxShadow: "var(--shadow-sm)" }}>
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Privacy & Profile
              </p>
              <h3 className="text-lg font-extrabold" style={{ color: "var(--text)" }}>
                {isLoggedIn ? "Your Profile" : "Set Up Profile"}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Privacy notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl text-xs"
            style={{ background: "var(--primary-light)", border: "1px solid var(--border)" }}>
            <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--primary-dark)" }} />
            <p style={{ color: "var(--primary-dark)" }}>
              <strong>Default: 100% Private.</strong> Your chat lives only in your browser.
              {BRAND.name} never silently uploads your health data.
            </p>
          </div>

          {isLoggedIn ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl text-xs"
                style={{ background: "var(--primary-light)", border: "1px solid var(--border)" }}>
                <CheckCircle2 className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <span style={{ color: "var(--primary-dark)" }}>Health context saved for personalised responses.</span>
              </div>
              <button onClick={() => { onLogout(); onClose(); }}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{ background: "#FEF2F2", color: "#991B1B", border: "1.5px solid #FECACA" }}>
                Switch to Anonymous Guest Mode
              </button>
            </div>
          ) : step === 1 ? (
            <>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                    Nickname (Optional)
                  </label>
                  <input type="text" value={nickname} onChange={e => setNickname(e.target.value)}
                    placeholder="e.g. Alex, Sam, Maya" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                    Age Range
                  </label>
                  <select value={ageRange} onChange={e => setAgeRange(e.target.value)} style={inputStyle}>
                    <option value="13-15">13–15 (Early Teen)</option>
                    <option value="16-19">16–19 (Late Teen)</option>
                    <option value="20-25">20–25 (Young Adult)</option>
                    <option value="26+">26+ (Adult)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                    Known Allergies (Optional, comma separated)
                  </label>
                  <input type="text" value={allergies} onChange={e => setAllergies(e.target.value)}
                    placeholder="e.g. Penicillin, Peanuts, Dust" style={inputStyle} />
                </div>
              </div>
              <button onClick={() => setStep(2)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all"
                style={{ background: "linear-gradient(135deg, var(--primary-dark), var(--primary))", boxShadow: "var(--shadow-sm)" }}>
                Next: Privacy Consent →
              </button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-xs font-bold" style={{ color: "var(--text)" }}>
                  Should WellUP remember your health context across chats?
                </p>
                {[
                  { value: false, title: "Keep 100% Private (Recommended)", desc: "Nothing saved. Wiped when you close the browser." },
                  { value: true, title: "Remember My Health Context", desc: "Saves nickname & allergies locally to personalise answers." },
                ].map(opt => (
                  <label key={String(opt.value)}
                    className="flex items-start gap-2.5 p-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      border: `1.5px solid ${consent === opt.value ? "var(--primary)" : "var(--border)"}`,
                      background: consent === opt.value ? "var(--primary-light)" : "var(--surface-2)",
                    }}>
                    <input type="radio" name="consent" checked={consent === opt.value}
                      onChange={() => setConsent(opt.value)} className="mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold" style={{ color: "var(--text)" }}>{opt.title}</p>
                      <p style={{ color: "var(--muted)" }}>{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={{ border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}>
                  ← Back
                </button>
                <button onClick={save}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
                  style={{ background: "linear-gradient(135deg, var(--primary-dark), var(--primary))" }}>
                  Save Preferences
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
