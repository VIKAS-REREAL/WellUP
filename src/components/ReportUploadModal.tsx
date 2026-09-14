"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  FileText,
  UploadCloud,
  CheckCircle2,
  Calendar,
  Sparkles,
  AlertCircle,
  Clock,
  Trash2,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Plus,
  RefreshCw,
  HeartPulse,
  Pill,
  Activity,
  FileCheck
} from "lucide-react";
import {
  MedicalReport,
  MedicalReportFact,
  saveMedicalReport,
  loadMedicalReports,
  deleteMedicalReport,
  saveAppointmentReminder,
} from "@/lib/supabase";
import { HealthProfile } from "./OnboardingModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onReportAnalyzed: (summary: string, appointment?: string, fullReportContext?: string) => void;
  currentUser?: any | null;
  userProfile?: HealthProfile | null;
  onUpdateProfile?: (updated: HealthProfile) => void;
}

export function ReportUploadModal({
  isOpen,
  onClose,
  onReportAnalyzed,
  currentUser,
  userProfile,
  onUpdateProfile,
}: Props) {
  const [activeTab, setActiveTab] = useState<"upload" | "history">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<MedicalReport | null>(null);
  const [savedReports, setSavedReports] = useState<MedicalReport[]>([]);
  const [profileSynced, setProfileSynced] = useState(false);
  const [appointmentSaved, setAppointmentSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load existing reports when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMedicalReports(currentUser?.id).then(setSavedReports);
      setErrorMsg(null);
    }
  }, [isOpen, currentUser?.id]);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selected: File) => {
    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!validTypes.includes(selected.type) && !selected.name.endsWith(".pdf")) {
      setErrorMsg("Please select a PDF document or image file (JPG, PNG).");
      return;
    }
    if (selected.size > 15 * 1024 * 1024) {
      setErrorMsg("File size must be under 15 MB.");
      return;
    }
    setErrorMsg(null);
    setFile(selected);
  };

  const fileToBase64 = (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  };

  const analyzeFile = async () => {
    if (!file) return;
    setAnalyzing(true);
    setErrorMsg(null);
    setProfileSynced(false);
    setAppointmentSaved(false);

    try {
      setAnalysisStep("Reading & encrypting document...");
      const base64 = await fileToBase64(file);

      setAnalysisStep("Analyzing medical data with Gemini AI...");
      const res = await fetch("/api/analyze-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
          fileSize: file.size,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      setAnalysisStep("Formatting clinical summary & facts...");
      const data = await res.json();
      if (!data.success || !data.report) {
        throw new Error(data.error || "Failed to extract report data.");
      }

      // Save report metadata locally and in Supabase
      const saved = await saveMedicalReport(
        {
          fileName: file.name,
          summary: data.report.summary,
          documentType: data.report.documentType,
          extractedFacts: data.report.facts || [],
          appointment: data.report.appointment || undefined,
          hasAppointment: data.report.hasAppointment,
          reportDate: data.report.reportDate || undefined,
          suggestedProfileUpdates: data.report.suggestedProfileUpdates,
        },
        currentUser?.id
      );

      setResult(saved);
      // Refresh saved reports list
      loadMedicalReports(currentUser?.id).then(setSavedReports);
    } catch (err: any) {
      console.error("[WellUP] Report analysis error:", err);
      setErrorMsg(err?.message || "Failed to analyze document. Please try again.");
    } finally {
      setAnalyzing(false);
      setAnalysisStep("");
    }
  };

  const handleSyncToProfile = () => {
    if (!result || !userProfile || !onUpdateProfile) return;

    const updates = result.suggestedProfileUpdates;
    const newProfile: HealthProfile = { ...userProfile };

    // Merge allergies without duplicates
    if (updates?.allergies && updates.allergies.length > 0) {
      const existingAllergies = new Set(
        (newProfile.allergies || []).map(a => a.toLowerCase().trim())
      );
      for (const a of updates.allergies) {
        if (!existingAllergies.has(a.toLowerCase().trim())) {
          newProfile.allergies = [...(newProfile.allergies || []), a.trim()];
        }
      }
    }

    // Merge conditions without duplicates
    if (updates?.conditions && updates.conditions.length > 0) {
      const existingConditions = new Set(
        (newProfile.conditions || []).map(c => c.toLowerCase().trim())
      );
      for (const c of updates.conditions) {
        if (!existingConditions.has(c.toLowerCase().trim())) {
          newProfile.conditions = [...(newProfile.conditions || []), c.trim()];
        }
      }
      if (updates.conditions.length > 0) {
        newProfile.longTermConditions = newProfile.longTermConditions
          ? `${newProfile.longTermConditions}, ${updates.conditions.join(", ")}`
          : updates.conditions.join(", ");
      }
    }

    onUpdateProfile(newProfile);
    setProfileSynced(true);
  };

  const handleSaveAppointment = async () => {
    if (!result?.appointment) return;
    try {
      await saveAppointmentReminder(
        {
          title: `Follow-up: ${result.documentType || result.fileName}`,
          appointmentAt: result.appointment,
          sourceReportId: result.id,
          notes: `Extracted from ${result.fileName}`,
        },
        currentUser?.id
      );
      setAppointmentSaved(true);
    } catch (e) {
      console.warn("Failed to save appointment reminder:", e);
    }
  };

  const handleSendToChat = () => {
    if (!result) return;
    const factsText = result.extractedFacts
      .map(f => `• ${f.label}: ${f.value}`)
      .join("\n");
    const dateLine = result.reportDate ? `\n\n🗓️ **Report Date:** ${result.reportDate}` : "";
    const aptLine = result.appointment ? `\n\n📅 **Follow-up Appointment:** ${result.appointment}` : "";
    const fullText = `📄 **Analyzed Medical Document (${result.fileName})**\n\n**Summary:**\n${result.summary}${dateLine}\n\n**Key Health Facts:**\n${factsText}${aptLine}\n\nCan you explain these findings in more detail and tell me what questions I should ask my doctor?`;

    onReportAnalyzed(result.summary, result.appointment, fullText);
    onClose();
    setResult(null);
    setFile(null);
  };

  const handleDelete = async (id: string) => {
    await deleteMedicalReport(id, currentUser?.id);
    const updated = await loadMedicalReports(currentUser?.id);
    setSavedReports(updated);
    if (result?.id === id) {
      setResult(null);
      setFile(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case "allergy":
        return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)", icon: AlertCircle, text: "Allergy" };
      case "medication":
        return { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", icon: Pill, text: "Medication" };
      case "vital":
        return { color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", icon: HeartPulse, text: "Vital Sign" };
      case "lab":
        return { color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.12)", icon: Activity, text: "Lab Test" };
      default:
        return { color: "var(--primary)", bg: "rgba(16, 185, 129, 0.1)", icon: FileCheck, text: "Health Fact" };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
      style={{
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(12px) saturate(160%)",
        WebkitBackdropFilter: "blur(12px) saturate(160%)",
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl animate-scaleUp rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden transition-all"
        style={{
          background: "var(--surface)",
          border: "1.5px solid var(--border)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          color: "var(--text)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile top pull bar */}
        <div className="w-12 h-1.5 rounded-full bg-zinc-400/40 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* ── HEADER ── */}
        <div
          className="px-5 pt-4 pb-3 flex items-center justify-between border-b shrink-0"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface-2)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="relative w-9 h-9 rounded-xl flex items-center justify-center p-1.5 border border-emerald-500/30 shadow-sm shrink-0"
              style={{
                background: "radial-gradient(circle, #34d399 20%, #10b981 60%, #059669 100%)",
              }}
            >
              <img src="/favicon.svg" alt="WellUP" className="w-6 h-6 rounded-lg object-contain shadow-sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight" style={{ color: "var(--text)" }}>
                  Medical Report Assistant
                </h3>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "var(--primary)",
                  }}
                >
                  AI Powered
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Extract clinical facts, appointments & summaries safely
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:bg-black/10 dark:hover:bg-white/10"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* ── TAB SELECTOR ── */}
        <div className="flex px-5 pt-3 pb-2 gap-2 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "upload"
                ? "shadow-sm"
                : "opacity-70 hover:opacity-100"
            }`}
            style={{
              background: activeTab === "upload" ? "var(--primary)" : "transparent",
              color: activeTab === "upload" ? "#ffffff" : "var(--text)",
            }}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload & Analyze</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "history"
                ? "shadow-sm"
                : "opacity-70 hover:opacity-100"
            }`}
            style={{
              background: activeTab === "history" ? "var(--primary)" : "transparent",
              color: activeTab === "history" ? "#ffffff" : "var(--text)",
            }}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Saved Reports ({savedReports.length})</span>
          </button>
        </div>

        {/* ── BODY (Scrollable) ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === "upload" ? (
            <>
              {/* If no result is analyzed yet */}
              {!result ? (
                <div className="space-y-4">
                  {/* Drag & Drop Zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 group ${
                      dragActive
                        ? "border-emerald-500 scale-[1.01]"
                        : "hover:border-emerald-500/70"
                    }`}
                    style={{
                      background: dragActive
                        ? "rgba(16, 185, 129, 0.08)"
                        : "var(--surface-2)",
                      borderColor: dragActive
                        ? "#10b981"
                        : file
                        ? "var(--primary)"
                        : "var(--border)",
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                      }}
                    />

                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105"
                      style={{
                        background: file ? "rgba(16, 185, 129, 0.15)" : "var(--surface)",
                        color: file ? "var(--primary)" : "var(--text-muted)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {file ? (
                        <FileText className="w-7 h-7 text-emerald-500" />
                      ) : (
                        <UploadCloud className="w-7 h-7" />
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-center mb-1" style={{ color: "var(--text)" }}>
                      {file ? file.name : "Tap to select PDF, JPG or PNG"}
                    </h4>

                    <p className="text-xs text-center mb-3" style={{ color: "var(--text-muted)" }}>
                      {file
                        ? `${formatFileSize(file.size)} · Ready to analyze`
                        : "Drag and drop your medical report here (up to 15 MB)"}
                    </p>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-zinc-500/20 bg-black/5 dark:bg-white/5" style={{ color: "var(--text-secondary)" }}>
                        PDF
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-zinc-500/20 bg-black/5 dark:bg-white/5" style={{ color: "var(--text-secondary)" }}>
                        PNG
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-zinc-500/20 bg-black/5 dark:bg-white/5" style={{ color: "var(--text-secondary)" }}>
                        JPG
                      </span>
                    </div>
                  </div>

                  {/* Error display */}
                  {errorMsg && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-medium animate-fadeIn">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Selected File Card & Actions */}
                  {file && (
                    <div
                      className="p-4 rounded-2xl border flex items-center justify-between"
                      style={{
                        background: "var(--surface-2)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>
                            {file.name}
                          </p>
                          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                            {formatFileSize(file.size)} · Ready for extraction
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setFile(null)}
                        disabled={analyzing}
                        className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Analyze CTA */}
                  {file && (
                    <button
                      onClick={analyzeFile}
                      disabled={analyzing}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-[0.99]"
                      style={{
                        background: "linear-gradient(135deg, #059669, #10b981)",
                      }}
                    >
                      {analyzing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{analysisStep || "Extracting medical facts…"}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Extract Facts & Plain Language Summary</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Security & Privacy Notice */}
                  <div
                    className="p-3 rounded-xl border flex items-start gap-2.5 text-[11px]"
                    style={{
                      background: "rgba(16, 185, 129, 0.05)",
                      borderColor: "rgba(16, 185, 129, 0.2)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p>
                      <strong>Privacy Guaranteed:</strong> Documents are processed locally and through private encrypted AI channels. No diagnoses are invented from ambiguous text.
                    </p>
                  </div>
                </div>
              ) : (
                /* ── EXTRACTED RESULTS VIEW ── */
                <div className="space-y-4 animate-fadeIn">
                  {/* File Banner */}
                  <div
                    className="flex items-center justify-between p-3.5 rounded-2xl border"
                    style={{
                      background: "var(--surface-2)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>
                          {result.fileName}
                        </p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {result.documentType || "Medical Document"} · Analyzed {new Date(result.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setResult(null);
                        setFile(null);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      Upload New
                    </button>
                  </div>

                  {/* Summary Card */}
                  <div
                    className="p-4 rounded-2xl border space-y-2"
                    style={{
                      background: "rgba(16, 185, 129, 0.08)",
                      borderColor: "rgba(16, 185, 129, 0.25)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                      <span>Plain Language Summary</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>
                      {result.summary}
                    </p>
                  </div>

                  {/* Detected Appointment Banner */}
                  {result.appointment && (
                    <div
                      className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
                      style={{
                        background: "rgba(59, 130, 246, 0.08)",
                        borderColor: "rgba(59, 130, 246, 0.25)",
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-5 h-5 text-blue-500 shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">
                            Possible Appointment Found
                          </p>
                          <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                            {result.appointment}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleSaveAppointment}
                        disabled={appointmentSaved}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                          appointmentSaved
                            ? "bg-blue-500/20 text-blue-500"
                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                        }`}
                      >
                        {appointmentSaved ? "✓ Scheduled" : "Add Reminder"}
                      </button>
                    </div>
                  )}

                  {/* Health Profile Sync Confirmation */}
                  {result.suggestedProfileUpdates &&
                    ((result.suggestedProfileUpdates.allergies?.length || 0) > 0 ||
                      (result.suggestedProfileUpdates.conditions?.length || 0) > 0) && (
                      <div
                        className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
                        style={{
                          background: "rgba(245, 158, 11, 0.08)",
                          borderColor: "rgba(245, 158, 11, 0.25)",
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
                          <div>
                            <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
                              Update Health Profile
                            </p>
                            <p className="text-xs font-medium" style={{ color: "var(--text)" }}>
                              Add {result.suggestedProfileUpdates.allergies?.[0] || "findings"} to your profile memory?
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={handleSyncToProfile}
                          disabled={profileSynced}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            profileSynced
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                              : "bg-amber-500 hover:bg-amber-400 text-black shadow-sm"
                          }`}
                        >
                          {profileSynced ? "✓ Saved to Profile" : "Save to Profile"}
                        </button>
                      </div>
                    )}

                  {/* Extracted Facts Section */}
                  {result.extractedFacts && result.extractedFacts.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "var(--text-muted)" }}>
                        Explicit Health Facts ({result.extractedFacts.length})
                      </h5>
                      <div
                        className="rounded-2xl border divide-y overflow-hidden"
                        style={{
                          background: "var(--surface-2)",
                          borderColor: "var(--border)",
                        }}
                      >
                        {result.extractedFacts.map((fact, idx) => {
                          const badge = getCategoryBadge(fact.category);
                          const BadgeIcon = badge.icon;
                          return (
                            <div key={idx} className="flex items-center justify-between p-3 text-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className="p-1 rounded-md"
                                  style={{ background: badge.bg, color: badge.color }}
                                >
                                  <BadgeIcon className="w-3.5 h-3.5" />
                                </span>
                                <span className="font-medium" style={{ color: "var(--text-muted)" }}>
                                  {fact.label}
                                </span>
                              </div>
                              <span className="font-bold text-right" style={{ color: "var(--text)" }}>
                                {fact.value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleSendToChat}
                      className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all"
                      style={{
                        background: "linear-gradient(135deg, #059669, #10b981)",
                      }}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Discuss Report in Chat</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ── SAVED REPORTS TAB ── */
            <div className="space-y-3">
              {savedReports.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-500/10 flex items-center justify-center mx-auto text-zinc-400">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                    No reports saved yet
                  </h4>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Upload a medical report or test result above to analyze and save it securely.
                  </p>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white"
                  >
                    Upload First Report
                  </button>
                </div>
              ) : (
                savedReports.map(rep => (
                  <div
                    key={rep.id}
                    className="p-4 rounded-2xl border transition-all hover:border-emerald-500/40 space-y-2"
                    style={{
                      background: "var(--surface-2)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold" style={{ color: "var(--text)" }}>
                            {rep.fileName}
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {rep.documentType || "Medical Document"} · {new Date(rep.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(rep.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Delete report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "var(--text)" }}>
                      {rep.summary}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                        {rep.extractedFacts?.length || 0} extracted facts
                      </span>
                      <button
                        onClick={() => {
                          setResult(rep);
                          setActiveTab("upload");
                        }}
                        className="text-xs font-bold text-emerald-500 hover:underline flex items-center gap-1"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
