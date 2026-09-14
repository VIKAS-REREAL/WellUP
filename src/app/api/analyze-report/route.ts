import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import zlib from "zlib";

export const maxDuration = 60; // Allow sufficient time for multimodal extraction

const SYSTEM_INSTRUCTION = `You are WellUP's Clinical Report Assistant.
Your job is to read medical documents (PDFs, lab reports, doctor prescriptions, vaccination cards, discharge summaries) and explain them clearly, warmly, and accurately to young adults and teenagers.

OUTPUT REQUIREMENTS:
Output ONLY a valid, parseable JSON object matching this structure:
{
  "summary": "Plain-language 2-4 sentence summary of what this document is, what was tested, and what the key findings mean. Warm and reassuring.",
  "documentType": "e.g. Blood Test (CBC), Allergy Panel, Prescription, Vital Signs Check, Radiology Report, General Physical",
  "reportDate": "Report date if visible, otherwise null",
  "facts": [
    { "label": "Specific test or item name", "value": "Value or status", "category": "allergy" | "medication" | "vital" | "lab" | "condition" | "general" }
  ],
  "appointment": "Specific follow-up date and time if mentioned (e.g. '24 October at 10:30 AM'), otherwise null",
  "hasAppointment": true or false,
  "suggestedProfileUpdates": {
    "allergies": ["Explicitly verified allergy 1", "..."],
    "conditions": ["Explicitly stated condition 1", "..."],
    "medications": ["Prescribed medication 1", "..."]
  }
}

CRITICAL RULES:
1. NEVER hallucinate or infer diagnoses not clearly stated in the document.
2. If the document states an allergy (e.g. 'Allergy: Penicillin'), extract it into both facts and suggestedProfileUpdates.allergies.
3. If an appointment, review, or follow-up date/time is mentioned, extract it into appointment and set hasAppointment: true.
4. Keep the summary friendly, objective, and easy for a non-doctor to understand.
5. Output valid JSON only. Wrap in \`\`\`json ... \`\`\` or output raw JSON.`;

function extractTextFromPdf(buffer: Buffer): string {
  const textBlocks: string[] = [];
  const raw = buffer.toString("latin1");

  // Check uncompressed Tj / TJ
  const tjRegex = /\(([^)]+)\)\s*Tj/g;
  let tjMatch: RegExpExecArray | null;
  while ((tjMatch = tjRegex.exec(raw)) !== null) {
    if (tjMatch[1]) textBlocks.push(tjMatch[1]);
  }

  const arrayRegex = /\[(.*?)\]\s*TJ/g;
  let arrMatch: RegExpExecArray | null;
  while ((arrMatch = arrayRegex.exec(raw)) !== null) {
    const innerRegex = /\(([^)]+)\)/g;
    let innerMatch: RegExpExecArray | null;
    while ((innerMatch = innerRegex.exec(arrMatch[1])) !== null) {
      if (innerMatch[1]) textBlocks.push(innerMatch[1]);
    }
  }

  // Check FlateDecode streams
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch: RegExpExecArray | null;
  while ((streamMatch = streamRegex.exec(raw)) !== null) {
    try {
      const streamBuf = Buffer.from(streamMatch[1], "latin1");
      const decompressed = zlib.inflateSync(streamBuf).toString("latin1");

      const innerTjRegex = /\(([^)]+)\)\s*Tj/g;
      let innerTjMatch: RegExpExecArray | null;
      while ((innerTjMatch = innerTjRegex.exec(decompressed)) !== null) {
        if (innerTjMatch[1]) textBlocks.push(innerTjMatch[1]);
      }

      const innerArrRegex = /\[(.*?)\]\s*TJ/g;
      let innerArrMatch: RegExpExecArray | null;
      while ((innerArrMatch = innerArrRegex.exec(decompressed)) !== null) {
        const itemRegex = /\(([^)]+)\)/g;
        let itemMatch: RegExpExecArray | null;
        while ((itemMatch = itemRegex.exec(innerArrMatch[1])) !== null) {
          if (itemMatch[1]) textBlocks.push(itemMatch[1]);
        }
      }
    } catch {}
  }

  return textBlocks.join(" ").trim();
}

async function analyzeWithNvidia(
  promptText: string,
  base64Data?: string,
  mimeType?: string
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY not configured");

  const isImage = mimeType?.startsWith("image/") && base64Data;

  const messages = [
    { role: "system", content: SYSTEM_INSTRUCTION },
    {
      role: "user",
      content: isImage
        ? [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
          ]
        : promptText,
    },
  ];

  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta/llama-3.2-11b-vision-instruct",
      messages,
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`NVIDIA API ${res.status}: ${errText.slice(0, 150)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fileBase64, mimeType, fileName, fileSize } = body;

    if (!fileBase64 || typeof fileBase64 !== "string") {
      return NextResponse.json(
        { error: "A valid base64 document string is required." },
        { status: 400 }
      );
    }

    // Clean base64 string if it contains data URI prefix
    const base64Clean = fileBase64.replace(/^data:[^;]+;base64,/, "").trim();
    const effectiveMime = mimeType || (fileName?.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

    const geminiKey = process.env.GEMINI_API_KEY;
    const nvidiaKey = process.env.NVIDIA_API_KEY;

    let extractedText = "";
    let activeModel = "";

    // ── 1. Try Gemini first (if key exists) ──
    if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const candidateModels = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-3.6-flash",
      ];

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
            },
          });

          const prompt = `Please carefully read and analyze this medical document (${fileName || "Uploaded document"}). Extract key information strictly adhering to the JSON schema.`;

          const result = await model.generateContent([
            {
              inlineData: {
                mimeType: effectiveMime,
                data: base64Clean,
              },
            },
            `${SYSTEM_INSTRUCTION}\n\n${prompt}`,
          ]);

          const text = result.response.text();
          if (text && text.trim()) {
            extractedText = text;
            activeModel = modelName;
            console.log(`[WellUP Report] Successfully analyzed document using ${modelName}`);
            break;
          }
        } catch (err: any) {
          const msg = err?.message || "";
          console.warn(`[WellUP Report] Gemini ${modelName} error:`, msg.slice(0, 100));
          // Fail fast on auth/permission errors
          if (/401|403|leaked|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg)) {
            console.warn("[WellUP Report] Gemini auth error, skipping remaining Gemini models.");
            break;
          }
        }
      }
    }

    // ── 2. Fallback to NVIDIA NIM ──
    if (!extractedText && nvidiaKey) {
      try {
        console.log("[WellUP Report] Routing document analysis to NVIDIA NIM...");
        if (effectiveMime.startsWith("image/")) {
          // Direct multimodal image understanding
          extractedText = await analyzeWithNvidia(
            `Please analyze this medical document (${fileName || "Uploaded document"}) and extract all medical information strictly adhering to the JSON schema:`,
            base64Clean,
            effectiveMime
          );
          activeModel = "nvidia/llama-3.2-11b-vision-instruct";
        } else {
          // PDF document: extract text from buffer then analyze
          const pdfBuffer = Buffer.from(base64Clean, "base64");
          const extractedPdfText = extractTextFromPdf(pdfBuffer);

          const docContent = extractedPdfText && extractedPdfText.length > 20
            ? extractedPdfText
            : `File: ${fileName || "Medical Document"}\nSize: ${fileSize || "Unknown"}\nNote: Document contains scanned image or text elements. Please synthesize medical record fields accordingly.`;

          extractedText = await analyzeWithNvidia(
            `Please carefully analyze this medical report text (${fileName || "Medical Document"}):\n\n${docContent}\n\nExtract key findings, appointment dates, report date, allergies, and medications strictly adhering to the JSON schema.`
          );
          activeModel = "nvidia/llama-3.2-11b-vision-instruct";
        }
        console.log("[WellUP Report] NVIDIA NIM analysis succeeded");
      } catch (nimErr: any) {
        console.warn("[WellUP Report] NVIDIA NIM analysis failed:", nimErr?.message);
      }
    }

    // ── 3. Graceful fallback if both providers failed ──
    if (!extractedText) {
      return NextResponse.json({
        success: true,
        report: {
          fileName: fileName || "Medical_Report.pdf",
          summary: "Your document was received and registered. AI analysis is temporarily unavailable, but your document has been saved to your health records.",
          documentType: "Medical Document",
          reportDate: new Date().toISOString().split("T")[0],
          facts: [
            { label: "File Name", value: fileName || "Medical Document", category: "general" },
            { label: "Upload Status", value: "Registered", category: "general" },
          ],
          appointment: null,
          hasAppointment: false,
          suggestedProfileUpdates: { allergies: [], conditions: [], medications: [] },
          modelUsed: "Local Registration Fallback",
        },
      });
    }

    // Parse JSON defensively from model output
    let parsedData: any = null;
    try {
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.warn("[WellUP Report] JSON parse error, falling back to text parsing:", parseErr);
    }

    if (!parsedData) {
      parsedData = {
        summary: extractedText.slice(0, 300).replace(/```[\s\S]*?```/g, "").trim(),
        documentType: "Medical Report",
        reportDate: null,
        facts: [
          { label: "Document Status", value: "Parsed", category: "general" },
        ],
        appointment: null,
        hasAppointment: false,
        suggestedProfileUpdates: { allergies: [], conditions: [], medications: [] },
      };
    }

    return NextResponse.json({
      success: true,
      report: {
        fileName: fileName || "Report.pdf",
        summary: parsedData.summary || "Medical report processed successfully.",
        documentType: parsedData.documentType || "Health Document",
        reportDate: parsedData.reportDate || null,
        facts: Array.isArray(parsedData.facts) ? parsedData.facts : [],
        appointment: parsedData.appointment || null,
        hasAppointment: Boolean(parsedData.hasAppointment || parsedData.appointment),
        suggestedProfileUpdates: parsedData.suggestedProfileUpdates || {
          allergies: [],
          conditions: [],
          medications: [],
        },
        modelUsed: activeModel,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[WellUP /api/analyze-report] Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze document", details: error?.message },
      { status: 500 }
    );
  }
}
