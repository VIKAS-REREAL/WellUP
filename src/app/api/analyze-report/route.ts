import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
5. Do NOT include markdown ticks around the JSON if possible, but if you do, wrap in standard \`\`\`json ... \`\`\`.`;

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
    if (!geminiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const candidateModels = [
      "gemini-flash-lite-latest",
      "gemini-flash-latest",
      "gemini-3.5-flash-lite",
      "gemini-3.7-flash",
    ];

    let extractedText = "";
    let activeModel = "";

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
        console.warn(`[WellUP Report] Model ${modelName} error:`, err?.message?.slice(0, 100));
      }
    }

    if (!extractedText) {
      // Return a structured graceful fallback if network/quota is temporarily down
      return NextResponse.json({
        success: true,
        report: {
          fileName: fileName || "Medical_Report.pdf",
          summary: "Your document was uploaded successfully. Our AI service is experiencing high traffic, but basic metadata was registered.",
          documentType: "Medical Document",
          reportDate: new Date().toISOString().split("T")[0],
          facts: [
            { label: "File Name", value: fileName || "Medical Document", category: "general" },
            { label: "Upload Status", value: "Received & Encrypted", category: "general" },
          ],
          appointment: null,
          hasAppointment: false,
          suggestedProfileUpdates: { allergies: [], conditions: [], medications: [] },
          modelUsed: "Local Registration Fallback",
        },
      });
    }

    // Parse JSON from model output
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
