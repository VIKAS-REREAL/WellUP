"use client";

import React, { useState } from "react";
import {
  X, ChevronRight, ChevronLeft, Heart, Activity, Apple,
  Moon, Droplets, Flame, Target, ShieldCheck, Check
} from "lucide-react";

/* ─── Types ─── */
export interface HealthProfile {
  ageGroup: string;
  overallHealth: string;
  allergies: string[];
  conditions?: string[];
  longTermConditions: string;
  heartBpConcerns: string;
  familyHistory: string;
  sleepHours: string;
  sleepQuality: string;
  exerciseFrequency: string;
  exerciseTypes: string[];
  dietType: string;
  fruitsVeggiesFreq: string;
  waterIntake: string;
  smokingStatus: string;
  alcoholStatus: string;
  sittingTime: string;
  goals: string[];
  storageConsent: boolean;
  nickname: string;
  language: string;
}

const DEFAULT_PROFILE: HealthProfile = {
  ageGroup: "", overallHealth: "", allergies: [], longTermConditions: "",
  heartBpConcerns: "", familyHistory: "", sleepHours: "", sleepQuality: "",
  exerciseFrequency: "", exerciseTypes: [], dietType: "", fruitsVeggiesFreq: "",
  waterIntake: "", smokingStatus: "", alcoholStatus: "", sittingTime: "",
  goals: [], storageConsent: false, nickname: "", language: "en",
};

/* ─── Helpers ─── */
function SingleChoice({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} type="button"
          onClick={() => onChange(value === o ? "" : o)}
          className={`px-3.5 py-2 rounded-xl text-sm border font-medium transition-all ${
            value === o
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-white dark:bg-[#222226] text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-white/10 hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          }`}>
          {value === o && <Check className="inline w-3 h-3 mr-1" />}
          {o}
        </button>
      ))}
    </div>
  );
}

function MultiChoice({ options, values, onChange }: { options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) => onChange(values.includes(o) ? values.filter(v => v !== o) : [...values, o]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} type="button"
          onClick={() => toggle(o)}
          className={`px-3.5 py-2 rounded-xl text-sm border font-medium transition-all ${
            values.includes(o)
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-white dark:bg-[#222226] text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-white/10 hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          }`}>
          {values.includes(o) && <Check className="inline w-3 h-3 mr-1" />}
          {o}
        </button>
      ))}
    </div>
  );
}

/* ─── Step definitions ─── */
const STEPS = [
  { id: "welcome",   title: "Welcome to WellUP 💚",          icon: <Heart className="w-5 h-5" /> },
  { id: "basic",     title: "Basic Health Information",       icon: <Activity className="w-5 h-5" /> },
  { id: "medical",   title: "Medical History",                icon: <ShieldCheck className="w-5 h-5" /> },
  { id: "lifestyle", title: "Sleep & Lifestyle",              icon: <Moon className="w-5 h-5" /> },
  { id: "activity",  title: "Physical Activity",              icon: <Flame className="w-5 h-5" /> },
  { id: "diet",      title: "Food & Hydration",               icon: <Apple className="w-5 h-5" /> },
  { id: "habits",    title: "Habits (Optional)",              icon: <Droplets className="w-5 h-5" /> },
  { id: "goals",     title: "What do you want to improve?",   icon: <Target className="w-5 h-5" /> },
  { id: "privacy",   title: "Privacy & Storage",              icon: <ShieldCheck className="w-5 h-5" /> },
];

/* ─── Main Component ─── */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (profile: HealthProfile) => void;
}

export function OnboardingModal({ isOpen, onClose, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState<HealthProfile>(DEFAULT_PROFILE);

  if (!isOpen) return null;

  const set = (field: keyof HealthProfile) => (val: any) =>
    setP(prev => ({ ...prev, [field]: val }));

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const finish = () => {
    if (p.storageConsent) {
      localStorage.setItem("wellup_profile", JSON.stringify(p));
    }
    onComplete(p);
    onClose();
  };

  const progress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg bg-white dark:bg-[#18181b] border-t sm:border border-gray-200 dark:border-white/10 text-gray-900 dark:text-zinc-100 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* ─── Progress Bar ─── */}
        <div className="h-1 bg-gray-100 dark:bg-zinc-800">
          <div className="h-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }} />
        </div>

        {/* ─── Header ─── */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="relative w-9 h-9 rounded-xl flex items-center justify-center p-1.5 border border-emerald-500/25 shadow-sm shrink-0"
              style={{ background: "radial-gradient(circle, #34d399 20%, #10b981 60%, #059669 100%)" }}
            >
              <img src="/favicon.svg" alt="WellUP" className="w-6 h-6 rounded-lg object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
                Step {step + 1} of {STEPS.length}
              </p>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{STEPS[step].title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Content ─── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* WELCOME */}
          {step === 0 && (
            <div className="space-y-4 text-center py-4">
              <div
                className="relative w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg p-2.5 border border-white/20"
                style={{ background: "radial-gradient(circle, #34d399 20%, #10b981 60%, #059669 100%)" }}
              >
                <img src="/favicon.svg" alt="WellUP" className="w-11 h-11 rounded-xl object-contain drop-shadow" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                Let's personalise your experience
              </h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                Answer a few optional questions so WellUP can give you more relevant health information.
                You can skip any question you're not comfortable with.
              </p>
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 text-left">
                <strong>🔒 Privacy first:</strong> Your answers stay on your device by default.
                We'll ask about storage at the end — it's always your choice.
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                  What should we call you? (Optional)
                </label>
                <input type="text" value={p.nickname} onChange={e => set("nickname")(e.target.value)}
                  placeholder="e.g. Alex, Sam, Priya..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#121214] text-sm focus:outline-none focus:border-emerald-500 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">Preferred Language</label>
                <div className="flex gap-2 justify-center">
                  {[["en", "English"], ["hi", "हिन्दी"], ["gu", "ગુજરાતી"]].map(([code, label]) => (
                    <button key={code} type="button" onClick={() => set("language")(code)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                        p.language === code ? "bg-emerald-600 text-white border-emerald-600" : "bg-white dark:bg-[#222226] text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-white/10 hover:border-emerald-400"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BASIC HEALTH */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">What is your age group?</label>
                <SingleChoice
                  options={["Under 18", "18–25", "26–40", "41–60", "60+"]}
                  value={p.ageGroup}
                  onChange={set("ageGroup")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">How would you describe your overall health?</label>
                <SingleChoice
                  options={["Excellent", "Good", "Average", "Not very good", "Prefer not to say"]}
                  value={p.overallHealth}
                  onChange={set("overallHealth")}
                />
              </div>
            </div>
          )}

          {/* MEDICAL HISTORY */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">Do you have any allergies?</label>
                <MultiChoice
                  options={["Food", "Medicine", "Environmental", "Other", "None", "Prefer not to say"]}
                  values={p.allergies}
                  onChange={set("allergies")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">Do you have any long-term health conditions?</label>
                <SingleChoice
                  options={["Yes", "No", "Prefer not to say"]}
                  value={p.longTermConditions}
                  onChange={set("longTermConditions")}
                />
                {p.longTermConditions === "Yes" && (
                  <input type="text" placeholder="Optional: briefly describe (e.g. asthma, diabetes)"
                    className="mt-2 w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-green-500 text-gray-900"
                    onChange={e => set("longTermConditions")("Yes: " + e.target.value)} />
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">Any known heart or blood pressure concerns?</label>
                <SingleChoice
                  options={["Yes", "No", "Not sure", "Prefer not to say"]}
                  value={p.heartBpConcerns}
                  onChange={set("heartBpConcerns")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">Family history of major health conditions?</label>
                <SingleChoice
                  options={["Yes", "No", "Not sure", "Prefer not to say"]}
                  value={p.familyHistory}
                  onChange={set("familyHistory")}
                />
              </div>
            </div>
          )}

          {/* LIFESTYLE / SLEEP */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">How many hours do you usually sleep?</label>
                <SingleChoice
                  options={["Less than 5", "5–6", "7–8", "More than 8"]}
                  value={p.sleepHours}
                  onChange={set("sleepHours")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">How would you rate your sleep quality?</label>
                <SingleChoice
                  options={["Poor", "Okay", "Good", "Excellent"]}
                  value={p.sleepQuality}
                  onChange={set("sleepQuality")}
                />
              </div>
            </div>
          )}

          {/* PHYSICAL ACTIVITY */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">How often do you exercise or stay physically active?</label>
                <SingleChoice
                  options={["Rarely", "1–2 days/week", "3–4 days/week", "5+ days/week"]}
                  value={p.exerciseFrequency}
                  onChange={set("exerciseFrequency")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">What type of activity do you enjoy? (Select all that apply)</label>
                <MultiChoice
                  options={["Walking", "Gym", "Sports", "Yoga", "Dancing", "Swimming", "Cycling", "Other", "None"]}
                  values={p.exerciseTypes}
                  onChange={set("exerciseTypes")}
                />
              </div>
            </div>
          )}

          {/* DIET & HYDRATION */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">How would you describe your usual diet?</label>
                <SingleChoice
                  options={["Mostly home-cooked", "Mixed", "Mostly eating out", "Prefer not to say"]}
                  value={p.dietType}
                  onChange={set("dietType")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">How often do you eat fruits and vegetables?</label>
                <SingleChoice
                  options={["Rarely", "Sometimes", "Most days", "Every day"]}
                  value={p.fruitsVeggiesFreq}
                  onChange={set("fruitsVeggiesFreq")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">How would you describe your daily water intake?</label>
                <SingleChoice
                  options={["Low", "Moderate", "High", "Not sure"]}
                  value={p.waterIntake}
                  onChange={set("waterIntake")}
                />
              </div>
            </div>
          )}

          {/* HABITS (Optional) */}
          {step === 6 && (
            <div className="space-y-5">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                These questions are completely optional and personal. Skip this step if you prefer.
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">Do you smoke or use tobacco products?</label>
                <SingleChoice
                  options={["Never", "Occasionally", "Regularly", "Prefer not to say"]}
                  value={p.smokingStatus}
                  onChange={set("smokingStatus")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">Do you consume alcohol?</label>
                <SingleChoice
                  options={["Never", "Occasionally", "Regularly", "Prefer not to say"]}
                  value={p.alcoholStatus}
                  onChange={set("alcoholStatus")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2.5">How much time do you spend sitting or inactive each day?</label>
                <SingleChoice
                  options={["Less than 2 hours", "2–4 hours", "4–6 hours", "6+ hours", "Not sure"]}
                  value={p.sittingTime}
                  onChange={set("sittingTime")}
                />
              </div>
            </div>
          )}

          {/* GOALS */}
          {step === 7 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Select all that apply — this helps WellUP give more relevant answers.</p>
              <MultiChoice
                options={[
                  "Better sleep", "Healthier eating", "More exercise", "Stress management",
                  "Mental well-being", "Better hydration", "Healthy habits",
                  "General health awareness", "Preventive health information",
                  "Understanding my body better",
                ]}
                values={p.goals}
                onChange={set("goals")}
              />
            </div>
          )}

          {/* PRIVACY */}
          {step === 8 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Should WellUP remember your health profile between visits?
              </p>
              {[
                {
                  value: false,
                  title: "Keep Private (Recommended)",
                  desc: "Nothing is saved. Your profile exists only for this session.",
                  badge: "🔒",
                },
                {
                  value: true,
                  title: "Save to my device",
                  desc: "Saves your profile in your browser's local storage to personalise future sessions.",
                  badge: "💾",
                },
              ].map(opt => (
                <label key={String(opt.value)}
                  className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all border-2 ${
                    p.storageConsent === opt.value
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}>
                  <input type="radio" name="consent" checked={p.storageConsent === opt.value}
                    onChange={() => set("storageConsent")(opt.value)}
                    className="mt-1 accent-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{opt.badge} {opt.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
                <strong>Note:</strong> WellUP never sends your health data to a remote server without your explicit consent.
                Even in "Save" mode, data stays in your browser.
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer Navigation ─── */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button onClick={back}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all border border-gray-200 dark:border-white/10">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
              Skip for now
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button onClick={next}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm">
              {step === 0 ? "Let's start" : "Next"} <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={finish}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm">
              <Check className="w-4 h-4" /> All done!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
