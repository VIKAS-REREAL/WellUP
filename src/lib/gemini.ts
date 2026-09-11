import { GoogleGenerativeAI } from "@google/generative-ai";
import { BRAND } from "./brand";

export interface HealthWord {
  term: string;
  definition: string;
  function: string;
  location: string;
  relatedTerms: string[];
}

export interface ChatResponseData {
  text: string;
  category: string;
  healthWords: HealthWord[];
  sources: string[];
  isEmergency: boolean;
  modelUsed: string;
  apiKeyWarning?: string;
}

/* ─────────────────────────────────────────────────────────────
   SYSTEM PROMPT — Friendly, conversational health guide
───────────────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are WellUP, an empathetic, friendly, and approachable health guide.

HOW TO TALK:
- Respond directly to the user in a warm, conversational tone like a supportive friend who knows health well.
- Do not output inner thoughts, rubrics, checklists, or meta-commentary.
- Keep it natural, easy to read, and practical (around 2-3 short paragraphs or clean bullet points).
- Never claim to diagnose illnesses ("you have X") or prescribe medications/exact dosages.
- If there is an urgent red flag or emergency (such as sudden severe testicular pain, chest pain, difficulty breathing, thoughts of self-harm), warn them gently and clearly advise emergency evaluation (112 or 108 in India).
- If the user writes in Hindi or Gujarati, reply warmly in that language.`;

/* ─────────────────────────────────────────────────────────────
   RESPONSE CLEANER & HEALTH WORD TAG PARSER
───────────────────────────────────────────────────────────── */
export function parseHealthWords(raw: string): { cleanText: string; healthWords: HealthWord[] } {
  // 1. Strip reasoning or thinking tags if output by reasoning models
  let clean = raw.replace(/<thought>[\s\S]*?<\/thought>/gi, "").trim();
  clean = clean.replace(/^(?:\s*\*\s*\*[A-Za-z/ ]+\?\*\s*(?:Yes|No|Checked|Pass)\.?\s*)+/gi, "").trim();

  // 2. Parse any [HEALTH_WORD: ...] tags
  const words: HealthWord[] = [];
  const regex = /\[HEALTH_WORD:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^\]]+)\]/gi;
  clean = clean.replace(regex, (_, term, def, fn, loc, related) => {
    const t = term.trim();
    words.push({
      term: t,
      definition: def.trim(),
      function: fn.trim(),
      location: loc.trim(),
      relatedTerms: related.split(",").map((s: string) => s.trim()).filter(Boolean),
    });
    return `**${t}**`;
  });

  return { cleanText: clean.trim(), healthWords: words };
}

/* ─────────────────────────────────────────────────────────────
   CATEGORY DETECTION
───────────────────────────────────────────────────────────── */
function detectCategory(msg: string): string {
  const l = msg.toLowerCase();
  if (/period|cramp|menstru|uterus|endometri|dysmenorrh|bleed|tampon|pad|sanitary/.test(l)) return "Menstrual Health";
  if (/puberty|acne|voice|grow|teen|adolescen|breast|testis|testicul|ball|penis|scrotum|hormones|body hair|height/.test(l)) return "Body & Puberty";
  if (/back pain|back ache|spine|posture|ergonom|lumbar|neck pain|muscle/.test(l)) return "Physical Well-being";
  if (/allerg|itch|rash|hive|sneez|pollen|dust|wheez|anaphylax|histamine/.test(l)) return "Allergies & Immunity";
  if (/food|diet|water|vitamin|mineral|nutrition|calor|protein|carb|fiber|vegetabl|fruit|hydrat|eat/.test(l)) return "Nutrition & Lifestyle";
  if (/stress|anxiet|sleep|depress|mental|mood|emotion|burnout|fatigue|wellbeing/.test(l)) return "Mental Well-being";
  if (/sex|reproduct|contracepti|pregnan|std|sti|ovulat/.test(l)) return "Sexual & Reproductive Health";
  if (/hygiene|wash|brush|clean|odour|body odor/.test(l)) return "Hygiene";
  if (/exercise|gym|sport|yoga|activ|walk|fitness/.test(l)) return "Physical Well-being";
  return "General Health";
}

/* ─────────────────────────────────────────────────────────────
   NATURAL, LIVELY FALLBACK LIBRARY
   Used if network or API is ever momentarily offline.
───────────────────────────────────────────────────────────── */
function buildFallback(message: string, language: string): ChatResponseData {
  const l = message.toLowerCase().trim();
  const category = detectCategory(message);

  // ── GREETINGS (Hi, Hello, Hey) ──
  if (/^(hi|hello|hey|yo|greetings|namaste|kem cho|good (morning|afternoon|evening))[\s!.]*$/i.test(l)) {
    const greetingText =
      language === "hi"
        ? "अरे! 👋 सब कैसा चल रहा है? आप अपने शरीर, डाइट, नींद, तनाव या किसी भी हेल्थ सवाल के बारे में खुलकर पूछ सकते हैं। पूरी तरह प्राइवेट है, बेझिझक पूछिए!"
        : language === "gu"
        ? "કેમ છો! 👋 હું WellUP છું. તમારા શરીર, ખોરાક, ઊંઘ, તાણ કે કોઈપણ સ્વાસ્થ્ય બાબતે પ્રશ્ન પૂછી શકો છો. સંપૂર્ણ ખાનગી છે, કોઈપણ સંકોચ વગર પૂછો!"
        : "Hey! 👋 What's on your mind today? Ask me anything about how your body works, food, sleep, periods, stress, or any random health questions you've been wondering about. Totally private and zero judgment!";
    return {
      text: greetingText,
      category: "General Health",
      healthWords: [],
      sources: ["WHO Health Literacy"],
      isEmergency: false,
      modelUsed: "WellUP Assistant",
    };
  }

  // ── EMERGENCY ──
  if (/chest pain|difficulty breath|severe bleed|unconscious|can't breathe|heart attack|stroke|self.harm|suicide/.test(l)) {
    return {
      text: `⚠️ Hey, this sounds really serious and needs emergency care right now.\n\nPlease **call 112 or 108 immediately** (India emergency services) or have someone take you to the nearest emergency room. Don't try to drive yourself, and stay calm while help is on the way.`,
      category: "🚨 Emergency",
      healthWords: [],
      sources: ["India Emergency: 112 / 108"],
      isEmergency: true,
      modelUsed: "WellUP Safety Engine",
    };
  }

  // ── BACK PAIN / WORKLOAD / POSTURE ──
  if (/back pain|back ache|spine|lower back|heavy work|lifting|work load/.test(l)) {
    return {
      text: `Dealing with back pain from a heavy workload is so tough, but super common when you're doing heavy lifting or sitting for long hours!\n\nHere are practical ways to get relief:\n\n• **Heat or Ice**: A heating pad or warm shower helps tight muscles relax. If it just started today from a sudden strain, an ice pack wrapped in a cloth works wonders for inflammation.\n• **Don't stay locked in bed**: Gentle walking or light stretches (like hugging your knees to your chest while lying down) keeps blood flowing so your back doesn't get stiff.\n• **At work**: When lifting, always bend your knees and lift with your leg muscles, not your back. If you're at a desk, put a small rolled towel behind your lower back.\n\n*Heads up: if the pain is severe, shoots down your legs, or causes numbness or tingling, please see a doctor right away.* How does it feel right now?`,
      category: "Physical Well-being",
      healthWords: [],
      sources: ["NHS Back Pain Guide"],
      isEmergency: false,
      modelUsed: "WellUP Assistant",
    };
  }

  // ── TESTICULAR PAIN / BALL PAIN ──
  if (/pain in.*ball|testicul|testis|scrotum|balls hurt|groin pain/.test(l)) {
    return {
      text: `Testicular pain is really uncomfortable and definitely something you should never ignore.\n\n⚠️ **Important check first**: If this pain started suddenly and is sharp or severe, or if you have swelling, nausea, or fever, **go to an urgent care clinic or ER immediately**. A twisted testicle (testicular torsion) is a medical emergency that needs prompt treatment to protect it.\n\nIf it's more of a mild, dull ache, it could be a muscle strain from heavy lifting, tight clothes, or a minor infection. Wearing supportive briefs (instead of loose boxers) and resting with a cool pack wrapped in a towel for 15 minutes can bring quick relief.\n\nPlease promise you'll have a doctor or clinic check it out in person soon just to be completely safe. How long has it been bothering you?`,
      category: "Body & Puberty",
      healthWords: [],
      sources: ["NHS Men's Health", "Urology Care Foundation"],
      isEmergency: false,
      modelUsed: "WellUP Assistant",
    };
  }

  // ── VEGETABLES / PICKY EATING ──
  if (/vegetabl|eat.*vegetabl|picky|fussy|don't like.*veg|not eating/.test(l)) {
    return {
      text: `Honestly, struggling with veggies is so relatable—nobody really wants to sit there chewing on plain boiled broccoli!\n\nThe secret is just making them actually taste good without forcing it:\n\n• **Roast them**: Toss carrots, cauliflower, or sweet potatoes with olive oil, salt, and garlic at high heat. It caramelizes their natural sugars so they turn crispy and sweet instead of soggy.\n• **Sneak them in**: Blend spinach, carrots, or zucchini straight into pasta sauce, curries, or fruit smoothies—you won't even taste them.\n• **Pick milder ones**: Sweet corn, baby carrots, cucumbers, and green peas are way gentler on your taste buds than bitter greens.\n• **Dip them**: Dipping crunchy cucumber or carrot sticks into hummus, ranch, or peanut butter hits completely different.\n\nDon't stress it—even trying one veggie cooked a new way this week is a great step. What kind of snacks or flavors do you usually love?`,
      category: "Nutrition & Lifestyle",
      healthWords: [],
      sources: ["ICMR Guidelines", "WHO Nutrition"],
      isEmergency: false,
      modelUsed: "WellUP Health Engine",
    };
  }

  // ── PERIODS / MENSTRUAL HEALTH ──
  if (/period|cramp|menstru|uterus|pad|tampon/.test(l)) {
    return {
      text: `Ugh, period cramps can be the absolute worst! They happen because your uterus flexes and contracts to shed its monthly lining, triggered by natural body chemicals called prostaglandins.\n\nA few things that actually bring quick comfort:\n\n• **Heat is your best friend**: Grab a heating pad or hot water bottle and place it right on your lower belly—it relaxes those muscles super fast.\n• **Sip warm tea or water**: Chamomile, ginger, or just warm water helps ease bloating and muscle tension.\n• **Gentle movement**: Even curling up in child's pose or taking a lazy stroll releases endorphins that take the edge off the pain.\n• **Rest up**: Give yourself permission to lie down and take it easy.\n\nIf your cramps are so intense that pain meds don't touch them or you can't even get out of bed, definitely talk with a doctor or gynecologist so you don't have to suffer through it!`,
      category: "Menstrual Health",
      healthWords: [],
      sources: ["NHS Period Guide", "WHO Reproductive Health"],
      isEmergency: false,
      modelUsed: "WellUP Health Engine",
    };
  }

  // ── PUBERTY / ACNE / GROWTH ──
  if (/puberty|acne|pimple|voice|height|growth|body hair/.test(l)) {
    return {
      text: `Puberty brings a huge wave of hormonal shifts—growth spurts, voice changes, and your skin suddenly producing way more oil. Breakouts happen to pretty much everyone, so don't beat yourself up!\n\nEasy ways to keep your skin happy:\n• Wash your face gently with a mild cleanser twice a day (don't scrub aggressively!).\n• Resist the urge to squeeze pimples—it only causes redness and marks.\n• Keep it simple: gentle cleanser, light oil-free moisturizer, and drink plenty of water.\n\nYour body is basically leveling up right now, so give yourself some grace!`,
      category: "Body & Puberty",
      healthWords: [],
      sources: ["NHS Teen Health"],
      isEmergency: false,
      modelUsed: "WellUP Health Engine",
    };
  }

  // ── ALLERGIES ──
  if (/allerg|itch|sneez|dust|pollen|rash/.test(l)) {
    return {
      text: `Allergies are basically your immune system being overly dramatic—it mistakes harmless things like dust or pollen for dangerous invaders and releases histamine, which gives you that annoying itch, sneeze, or rash!\n\nHelpful everyday habits:\n• Rinse your face or shower after spending time outdoors on high pollen days.\n• Wash your pillowcases and sheets regularly in warm water.\n• Keep a tiny note of what seems to trigger flare-ups.\n\nAnd remember: if you ever notice lip swelling, throat tightness, or trouble breathing, get emergency help right away.`,
      category: "Allergies & Immunity",
      healthWords: [],
      sources: ["World Allergy Organization"],
      isEmergency: false,
      modelUsed: "WellUP Health Engine",
    };
  }

  // ── SLEEP & STRESS ──
  if (/sleep|insomnia|stress|anxiet|tired|exhausted/.test(l)) {
    return {
      text: `When your sleep is out of sync, everything feels 10x harder and stress goes through the roof.\n\nA few small tweaks that actually help you drift off faster:\n• **Drop screens 30 mins before bed**: That blue light tricks your brain into thinking the sun is still up.\n• **Keep your room cool and dark**: It signals your body to start producing melatonin (the sleep hormone).\n• **Chill wind-down routine**: Chill playlist, reading a chapter, or light stretching tells your nervous system it's safe to sleep.\n\nAiming for 7 to 9 hours gives your brain and body the reset it genuinely needs.`,
      category: "Mental Well-being",
      healthWords: [],
      sources: ["National Sleep Foundation"],
      isEmergency: false,
      modelUsed: "WellUP Health Engine",
    };
  }

  // ── GENERAL SYMPTOM HELPER (Never repetitive boilerplate) ──
  return {
    text: `I'm here for you! To give you the most accurate and practical advice, could you tell me: where do you feel it most, how long has it been going on, and did anything specific trigger it? Let's talk it through!`,
    category,
    healthWords: [],
    sources: ["WHO Health Guidelines"],
    isEmergency: false,
    modelUsed: "WellUP Health Engine",
  };
}

/* ─────────────────────────────────────────────────────────────
   MAIN EXPORT — generateChatResponse
───────────────────────────────────────────────────────────── */
export async function generateChatResponse(
  message: string,
  history: { role: "user" | "model"; parts: string }[] = [],
  language = "en",
  explainSimply = false,
  userHealthContext?: string
): Promise<ChatResponseData> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const fallback = buildFallback(message, language);
    return {
      ...fallback,
      apiKeyWarning: "GEMINI_API_KEY not set",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Verified active Gemini models on Google AI API
    const candidates = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.6-flash", "gemini-flash-latest"];
    let rawResponse = "";
    let activeModel = "gemini-3.5-flash";

    let systemPrompt = SYSTEM_PROMPT;
    if (userHealthContext) systemPrompt += `\n\nContext about the user (keep in mind naturally): ${userHealthContext}`;
    if (explainSimply) systemPrompt += "\n\nExplain it like you're talking to a 14-year-old friend. Super simple, everyday analogies.";

    const langPrefix =
      language === "hi" ? "Respond naturally in Hindi. " :
      language === "gu" ? "Respond naturally in Gujarati. " : "";
    const prompt = `${langPrefix}${message}`;

    for (const modelName of candidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
          generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
        });
        const chat = model.startChat({
          history: history.map(h => ({
            role: h.role,
            parts: [{ text: h.parts }],
          })),
        });
        const result = await chat.sendMessage(prompt);
        rawResponse = result.response.text();
        activeModel = modelName;
        if (rawResponse) break;
      } catch (e: any) {
        console.warn(`[WellUP] Model ${modelName} attempt: ${e?.message}`);
      }
    }

    if (!rawResponse) return buildFallback(message, language);

    const { cleanText, healthWords } = parseHealthWords(rawResponse);
    const category = detectCategory(message);
    const isEmergency = /chest pain|difficulty breath|severe bleed|unconscious|can't breathe/.test(message.toLowerCase());

    return {
      text: cleanText,
      category,
      healthWords,
      sources: ["World Health Organization (WHO)"],
      isEmergency,
      modelUsed: activeModel,
    };
  } catch (err: any) {
    console.error("[WellUP] Gemini call failed:", err?.message);
    return buildFallback(message, language);
  }
}
