"use client";

import React, { useState } from "react";
import { X, FileText, UploadCloud, CheckCircle2, Calendar, Sparkles } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onReportAnalyzed: (summary: string, appointment?: string) => void;
}

export function ReportUploadModal({ isOpen, onClose, onReportAnalyzed }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const analyze = () => {
    if (!file) return;
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setResult({
        summary: "Routine adolescent health screening and allergy panel. All vital signs are within standard clinical limits. Mild seasonal allergic sensitivity to pollen/ragweed was noted.",
        facts: [
          { label: "Document Type", value: "Preventative Adolescent Panel" },
          { label: "Verified Allergy", value: "Pollen / Ragweed (mild)" },
          { label: "Follow-up Advised", value: "Annual review" },
        ],
        appointment: "24 October at 10:30 AM",
      });
    }, 1400);
  };

  const insertAndClose = () => {
    onReportAnalyzed(result.summary, result.appointment);
    onClose();
    setResult(null);
    setFile(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <div className="w-full max-w-lg animate-scaleUp"
        style={{
          background: "var(--surface)",
          border: "1.5px solid var(--border)",
          borderRadius: "20px",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 pb-4 flex items-start justify-between" style={{ background: "var(--gradient-hero)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--primary)", boxShadow: "var(--shadow-sm)" }}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Medical Report Assistant
              </p>
              <h3 className="text-lg font-extrabold" style={{ color: "var(--text)" }}>
                Upload & Understand
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!result ? (
            <>
              {/* Drop zone */}
              <label className="block cursor-pointer">
                <div className="flex flex-col items-center justify-center gap-2 p-8 rounded-2xl transition-all"
                  style={{
                    border: `2px dashed ${file ? "var(--primary)" : "var(--border)"}`,
                    background: file ? "var(--primary-light)" : "var(--surface-2)",
                  }}>
                  <UploadCloud className="w-10 h-10" style={{ color: file ? "var(--primary)" : "var(--muted)", opacity: 0.7 }} />
                  <p className="text-sm font-semibold" style={{ color: file ? "var(--primary-dark)" : "var(--text)" }}>
                    {file ? file.name : "Tap to select PDF, JPG or PNG"}
                  </p>
                  {!file && <p className="text-xs" style={{ color: "var(--muted)" }}>Up to 10 MB</p>}
                </div>
                <input type="file" accept=".pdf,image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
              </label>

              {file && (
                <button onClick={analyze} disabled={analyzing}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
                  style={{ background: "linear-gradient(135deg, var(--primary-dark), var(--primary))", boxShadow: "var(--shadow-sm)" }}>
                  {analyzing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analysing terminology & dates…
                    </>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Explain Report & Extract Key Facts</>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="space-y-3 animate-fadeIn text-xs">
              {/* Summary */}
              <div className="p-3.5 rounded-xl" style={{ background: "var(--primary-light)", border: "1px solid var(--border)" }}>
                <p className="font-black uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1.5" style={{ color: "var(--primary-dark)" }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Plain Language Summary
                </p>
                <p className="leading-relaxed" style={{ color: "var(--text)" }}>{result.summary}</p>
              </div>

              {/* Facts */}
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {result.facts.map((f: any, i: number) => (
                  <div key={i} className="flex justify-between px-3 py-2"
                    style={{ borderBottom: i < result.facts.length - 1 ? "1px solid var(--border)" : "none", background: "var(--surface-2)" }}>
                    <span style={{ color: "var(--muted)" }}>{f.label}</span>
                    <span className="font-bold" style={{ color: "var(--text)" }}>{f.value}</span>
                  </div>
                ))}
              </div>

              {/* Appointment */}
              {result.appointment && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl"
                  style={{ background: "var(--accent-light)", border: "1px solid var(--border)" }}>
                  <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent)" }} />
                  <div>
                    <p className="font-black uppercase text-[10px] tracking-wider" style={{ color: "var(--accent)" }}>
                      Detected Appointment
                    </p>
                    <p className="font-semibold" style={{ color: "var(--text)" }}>{result.appointment}</p>
                  </div>
                </div>
              )}

              <button onClick={insertAndClose}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all"
                style={{ background: "linear-gradient(135deg, var(--primary-dark), var(--primary))" }}>
                Insert Summary into Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
