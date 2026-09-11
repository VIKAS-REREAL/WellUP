import { NextResponse } from "next/server";
import { BRAND } from "@/lib/brand";

export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY || "";
  const nvidiaKey = process.env.NVIDIA_API_KEY || "";

  // Diagnose API key issues
  const geminiDiag =
    !geminiKey ? "missing" :
    geminiKey.startsWith("AQ.") ? `invalid_format — this looks like a Google Cloud service account token, NOT a Gemini API key. Go to aistudio.google.com/app/apikey to get a key starting with "AIza"` :
    !geminiKey.startsWith("AIza") ? `invalid_format (starts with "${geminiKey.slice(0, 4)}…", expected "AIza")` :
    "looks_valid";

  const nvidiaDiag =
    !nvidiaKey ? "missing" :
    !nvidiaKey.startsWith("nvapi-") ? `invalid_format (starts with "${nvidiaKey.slice(0, 6)}…")` :
    "looks_valid";

  return NextResponse.json({
    status: "ok",
    app: BRAND.name,
    sdg: BRAND.sdgGoal,
    timestamp: new Date().toISOString(),
    api_keys: {
      gemini: geminiDiag,
      nvidia: nvidiaDiag,
    },
    ai_provider: geminiDiag === "looks_valid" ? "gemini_primary" :
                 nvidiaDiag === "looks_valid" ? "nvidia_primary" : "local_fallback",
  });
}
