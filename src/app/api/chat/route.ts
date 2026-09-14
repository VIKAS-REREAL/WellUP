import { NextRequest, NextResponse } from "next/server";
import { generateChatResponse } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      message,
      language = "en",
      history = [],
      explainSimply = false,
      userHealthContext,
      provider = "gemini", // "gemini" | "nvidia"
    } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "A valid 'message' string is required." },
        { status: 400 }
      );
    }

    const preferNvidia = provider === "nvidia";

    const result = await generateChatResponse(
      message.trim(),
      Array.isArray(history) ? history : [],
      language,
      Boolean(explainSimply),
      typeof userHealthContext === "string" ? userHealthContext : undefined,
      preferNvidia,
    );

    return NextResponse.json({
      response: result.text,
      category: result.category,
      healthWords: result.healthWords,
      followups: [],
      options: [],
      question: null,
      sources: result.sources,
      isEmergency: result.isEmergency,
      modelUsed: result.modelUsed,
      apiKeyWarning: result.apiKeyWarning,
      conversationId: body.conversationId || "guest",
      provider: preferNvidia ? "nvidia" : "gemini",
    });
  } catch (err: any) {
    console.error("[WellUP /api/chat]", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
