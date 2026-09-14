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
  followups: string[];
  options?: string[];
  question?: string;
  sources: string[];
  isEmergency: boolean;
  modelUsed: string;
  apiKeyWarning?: string;
}

/* ═══════════════════════════════════════════════════════════
   SYSTEM PROMPT — Natural, warm, personalized health guide
   ═══════════════════════════════════════════════════════════ */
const SYSTEM_PROMPT = `You are WellUP — a trusted older friend who genuinely knows their health stuff. You talk to teenagers and young adults the way a smart, caring friend would text them.

Respond as if texting a smart, caring friend. No headers, no disclaimers unless truly needed, no repeating the question back.

TONE:
Be warm, direct, and real. Lead with empathy ("that sounds rough", "honestly"), then the actual answer. Everyday language — explain any medical term the moment you use it. Never say "As an AI…" or lecture.

PERSONALIZATION:
If user context is provided (name, age, conditions, allergies, goals), weave it in naturally. The response should feel written for THIS person.

FORMAT:
- When you introduce a medical term worth knowing, wrap it: [HEALTH_WORD: term | simple definition | what it does | where it is | related,terms]
- Use bullet points only for 3+ distinct items.
- For myth/fact questions: start with "🟡 Myth" or "✅ Fact" in bold, then a punchy explanation.
- Usually 120–180 words. Go longer only if the question genuinely needs it.

SAFETY (non-negotiable):
- Never diagnose ("you have X") or prescribe exact medication dosages.
- Never invent medical facts or fabricate sources.
- If someone describes an emergency (chest pain, can't breathe, severe bleeding, self-harm), immediately advise 112/108 (India) or local emergency services. Keep it short.
- Sources: only cite if genuinely applicable. Prefer WHO, NHS, CDC, ICMR.

DIRECT, COMPLETE ANSWERS (NO FOLLOW-UP QUESTIONS OR TRIAGE):
- Always provide a direct, comprehensive, and complete answer to whatever the user asks in your response.
- Do NOT ask follow-up questions at the end of your response.
- Do NOT conduct back-and-forth interview loops or triage quizzes.
- Do NOT output [QUESTION:...], [OPTIONS:...], [QUICK_REPLIES:...], or [FOLLOWUPS:...].
- Give the user actionable, reassuring health guidance immediately in one thorough response.`;

/* ═══════════════════════════════════════════════════════════
   HEALTH WORD PARSER
   ═══════════════════════════════════════════════════════════ */
export function parseHealthWords(raw: string): { cleanText: string; healthWords: HealthWord[] } {
  let clean = raw
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();

  const words: HealthWord[] = [];
  const regex = /\[(?:HEALTH_WORD|[A-Za-z_-]+):\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^\]]+)\]/gi;

  clean = clean.replace(regex, (_, term, def, fn, loc, related) => {
    const t = term.trim();
    // Avoid duplicate terms
    if (!words.find(w => w.term.toLowerCase() === t.toLowerCase())) {
      words.push({
        term: t,
        definition: def.trim(),
        function: fn.trim(),
        location: loc.trim(),
        relatedTerms: related.split(",").map((s: string) => s.trim()).filter(Boolean),
      });
    }
    return `**${t}**`;
  });

  return { cleanText: clean.trim(), healthWords: words };
}

/* ═══════════════════════════════════════════════════════════
   CLEANUP PARSER (Strips any leftover tags)
   ═══════════════════════════════════════════════════════════ */
export function parseFollowups(raw: string): { cleanText: string; followups: string[]; options: string[]; question?: string } {
  let clean = raw;

  // Strip any question/option/followup tags completely
  clean = clean.replace(/(?:\[\s*)?QUESTION:\s*([^\n\r\]]+)(?:\])?/gi, "");
  clean = clean.replace(/(?:\[\s*)?(?:OPTIONS?|QUICK_REPLIES?|FOLLOWUPS?):\s*([^\n\r\]]+)(?:\])?/gi, "");
  clean = clean.replace(/(?:\[\s*)?(?:NEXT_STEP|CLARIFYING_QUESTION):\s*([^\n\r\]]+)(?:\])?/gi, "");
  clean = clean.replace(/^(?:(?:first|second|third|1st|2nd|3rd)\s*question\??[\s:]+)([^\n\r]+)/gim, "");
  clean = clean.replace(/(?:To help narrow this down:?\s*|Quick question:?\s*|Before we go further, can you tell me:?\s*)$/i, "");

  return { cleanText: clean.trim(), followups: [], options: [], question: undefined };
}

/* ═══════════════════════════════════════════════════════════
   CATEGORY DETECTION
   ═══════════════════════════════════════════════════════════ */
function detectCategory(msg: string): string {
  const l = msg.toLowerCase();
  // Multi-word specific matches first
  if (/exercise.*period|workout.*period|period.*exercise|period.*workout/.test(l)) return "Myth vs Fact";
  if (/back pain|back ache|muscle pain|sore muscle/.test(l)) return "Physical Well-being";
  if (/body odor|body odour/.test(l)) return "Hygiene";
  if (/mental health/.test(l)) return "Mental Well-being";
  if (/birth control/.test(l)) return "Sexual & Reproductive Health";
  if (/is it true|does it really/.test(l)) return "Myth vs Fact";
  // Then broader single-word patterns
  if (/period|cramp|menstru|uterus|endometri|dysmenorrh|tampon|pad|sanitary|pms/.test(l)) return "Menstrual Health";
  if (/puberty|acne|pimple|voice change|grow|teen|adolescen|breast develop|testis|testicul|penis|scrotum|body hair|height change|hormones/.test(l)) return "Body & Puberty";
  if (/neck|spine|posture|lumbar|shoulder|stiff/.test(l)) return "Physical Well-being";
  if (/allerg|itch|rash|hive|sneez|pollen|dust|wheez|anaphylax|histamine|hay fever/.test(l)) return "Allergies & Immunity";
  if (/food|diet|nutrition|calor|protein|carb|fiber|vegetabl|fruit|hydrat|eat|meal|vitamin|mineral/.test(l)) return "Nutrition & Lifestyle";
  if (/stress|anxi|worry|overthink|panic|burnout|emotion|depress|mood/.test(l)) return "Mental Well-being";
  if (/sleep|insomnia|tired|exhausted|wake up|rest|nap|cant sleep/.test(l)) return "Sleep";
  if (/sex|reproduct|contracepti|pregnan|std|sti|ovulat|fertility/.test(l)) return "Sexual & Reproductive Health";
  if (/hygiene|wash|brush|clean|odour|sweat|shower/.test(l)) return "Hygiene";
  if (/exercise|gym|sport|yoga|activ|walk|fitness|workout/.test(l)) return "Physical Well-being";
  if (/myth|fact|true|false/.test(l)) return "Myth vs Fact";
  if (/where|resource|information|reliable|source|website|doctor|hospital/.test(l)) return "Health Resources";
  return "General Health";
}

/* ═══════════════════════════════════════════════════════════
   COMPREHENSIVE FALLBACK LIBRARY
   ═══════════════════════════════════════════════════════════ */
function buildFallback(message: string, language: string): ChatResponseData {
  const l = message.toLowerCase().trim();
  const category = detectCategory(message);

  // ── GREETINGS ──
  if (/^(hi|hello|hey|yo|greetings|namaste|kem cho|good (morning|afternoon|evening))[\s!.]*$/i.test(l)) {
    const txt =
      language === "hi"
        ? "अरे! 👋 क्या चल रहा है? शरीर, डाइट, नींद, तनाव — कुछ भी पूछ सकते हैं। पूरी तरह प्राइवेट है!"
        : language === "gu"
        ? "કેમ છો! 👋 WellUP છું. સ્વાસ્થ્ય, ખોરાક, ઊंઘ, તાણ — ગમે તે પૂछो!"
        : "Hey! 👋 What's on your mind? Ask me anything about your body, food, sleep, stress, periods — totally private and zero judgment.";
    return { text: txt, category: "General Health", healthWords: [], followups: [], sources: [], isEmergency: false, modelUsed: "WellUP Assistant" };
  }

  // ── EMERGENCIES ──
  if (/chest pain|difficulty breath|severe bleed|unconscious|can't breathe|heart attack|stroke|self.harm|suicid/.test(l)) {
    return {
      text: `⚠️ This sounds like it could be serious — please **call 112 or 108 immediately** (India emergency services) or get to the nearest emergency room right now. Don't wait. If you're with someone, ask them to help you.`,
      category: "🚨 Emergency", healthWords: [], followups: [], sources: ["India Emergency: 112 / 108"], isEmergency: true, modelUsed: "WellUP Safety Engine",
    };
  }

  // ── NECK PAIN / SHOULDER PAIN / POSTURE (must come before sleep check!) ──
  if (/neck|shoulder pain|stiff neck|neck ache|sore neck/.test(l)) {
    return {
      text: `Neck pain from long laptop sessions (especially with a poor screen angle) is super common — your neck muscles are basically holding the weight of your head while strained forward for hours.\n\nQuick relief:\n• **Heat it**: A warm towel or heating pad on the neck for 15–20 minutes loosens tight muscles fast.\n• **Gentle stretches**: Slowly tilt your ear toward your shoulder, hold 15 seconds each side. Then chin to chest, hold. Don't force it.\n• **Change position**: Try raising your laptop screen to eye level (stack books under it!) so you're not hunching forward.\n• **Take micro-breaks**: Every 45 mins, stand up, roll your shoulders back, and look away from the screen for a minute.\n\nIf the pain shoots down your arm or causes numbness in your fingers, see a doctor — that can signal nerve involvement. Give your neck steady rest and gentle movement.`,
      category: "Physical Well-being",
      healthWords: [],
      followups: [],
      sources: ["NHS Neck Pain Guide", "WHO Musculoskeletal Health"],
      isEmergency: false,
      modelUsed: "WellUP Health Engine",
    };
  }

  // ── BACK PAIN / POSTURE ──
  if (/back pain|back ache|spine|lower back|posture|lumbar|disc/.test(l)) {
    return {
      text: `Back pain from heavy work or long sitting is really common. A few things that actually help:\n\n• **Heat or Ice**: Warm pad for muscle tightness; ice (wrapped in cloth) if it just started from a strain.\n• **Keep moving gently**: Short walks and gentle knee-to-chest stretches keep blood flowing — don't stay frozen in bed.\n• **Sitting ergonomics**: Sit back in your chair so your lower back is supported. Screen at eye level. Feet flat on the floor.\n• **Lifting**: Always bend your knees, not your back.\n\nIf pain is severe, shoots down your legs, or causes numbness, see a doctor soon — that could be nerve-related. Regular posture breaks make a substantial difference.`,
      category: "Physical Well-being", healthWords: [], followups: [], sources: ["NHS Back Pain Guide"], isEmergency: false, modelUsed: "WellUP Health Engine",
    };
  }

  // ── SLEEP ──
  if (/sleep|insomnia|cant sleep|wake up|fix my sleep/.test(l)) {
    return {
      text: `Fixing your sleep schedule is mostly about consistency — your body runs on a circadian rhythm that syncs to light and time cues.\n\nWhat actually works:\n• **Wake at the same time every day** — even weekends. This is the single most powerful sleep regulator.\n• **No bright screens 30–45 min before bed** — the blue light suppresses melatonin, your sleepiness hormone.\n• **Keep your room cool** (around 18–20°C) and dark — your body temperature needs to drop to fall asleep.\n• **Wind-down ritual**: 5–10 minutes of reading, light stretching, or slow breathing signals your brain it's time.\n\nAim for 7–9 hours of regular rest. A consistent bedtime routine will help reset your body clock over the next few days.`,
      category: "Sleep", healthWords: [], followups: [], sources: ["National Sleep Foundation", "NHS Sleep Advice"], isEmergency: false, modelUsed: "WellUP Health Engine",
    };
  }

  // ── STRESS & ANXIETY ──
  if (/stress|anxi|worry|overthink|panic|burnout|overwhelm/.test(l)) {
    return {
      text: `Stress and anxiety are your nervous system's alarm system firing too often — and there are real ways to turn it down.\n\nThings that genuinely help:\n• **Box breathing**: Breathe in 4 counts, hold 4, out 4, hold 4. Do it 3–4 times. It activates your parasympathetic nervous system and calms the alarm response within minutes.\n• **Name what's stressing you**: Writing it down (even a quick list) moves it from swirling in your head to something you can actually look at and address.\n• **Limit doom-scrolling**: Your brain can't distinguish between real threats and things you read online — every alarming headline triggers a small stress response.\n• **Move your body**: Even a 10-minute walk releases tension hormones.\n\nIf anxiety is constant and affecting your daily life, talking to a counselor or doctor makes a real difference — it's not weakness, it's just getting the right tool for the job.`,
      category: "Mental Well-being", healthWords: [], followups: [], sources: ["WHO Mental Health", "NHS Anxiety Guide"], isEmergency: false, modelUsed: "WellUP Health Engine",
    };
  }

  // ── PERIODS ──
  if (/period|cramp|menstru|pms|tampon|pad|heavy bleed/.test(l)) {
    return {
      text: `Period cramps are caused by your uterus contracting to shed its lining, triggered by natural chemicals called prostaglandins. The more prostaglandins, the more intense the cramps.\n\nWhat actually helps:\n• **Heat first**: Warm pad or hot water bottle on your lower belly — works faster than most people expect.\n• **Gentle movement**: Light walking or child's pose yoga releases endorphins that reduce pain naturally.\n• **Stay warm and hydrated**: Warm ginger or chamomile tea helps ease muscle tension and bloating.\n• **OTC options**: Ibuprofen (taken at the start of cramps, with food) works well for most people since it reduces prostaglandins — ask a pharmacist about dosage.\n\nIf cramps are so severe they knock you out of school or work regularly, see a gynecologist — conditions like endometriosis can cause that level of pain and are very treatable.`,
      category: "Menstrual Health", healthWords: [], followups: [], sources: ["NHS Period Health Guide", "WHO Reproductive Health"], isEmergency: false, modelUsed: "WellUP Health Engine",
    };
  }

  // ── MYTH vs FACT: exercise during period ──
  if (/exercise.*period|workout.*period|period.*exercise|period.*workout/.test(l)) {
    return {
      text: `**✅ Fact — exercise during your period is actually good for you.**\n\nThis is one of the most common health myths out there. Light to moderate exercise during your period can:\n• Release endorphins that act as natural pain relievers for cramps\n• Reduce bloating\n• Improve mood (helpful when PMS has you feeling low)\n\nYou don't have to go for a run — even a short walk, gentle yoga, or stretching counts. What you should avoid is anything so intense it leaves you exhausted, especially on heavy flow days. Listen to your body. Rest is also valid.\n\nThe old idea that exercise during menstruation is harmful has no scientific basis.`,
      category: "Menstrual Health", healthWords: [], followups: [], sources: ["NHS Women's Health", "American College of Obstetricians and Gynecologists"], isEmergency: false, modelUsed: "WellUP Health Engine",
    };
  }

  // ── PUBERTY ──
  if (/puberty|acne|pimple|voice change|body hair|growth spurt/.test(l)) {
    return {
      text: `Puberty is your body going through a major hormonal upgrade — and it happens at different rates for everyone, so comparing yourself to others isn't helpful or fair to yourself.\n\nThe big changes: growth spurts, body hair, skin getting oilier (acne), voice deepening (guys), breast development (girls), and all the hormonal mood swings that come with it.\n\n**For acne specifically:**\n• Wash your face twice a day with a gentle cleanser — no harsh scrubbing\n• Don't pop pimples (spreads bacteria and causes scars)\n• Use a light, non-comedogenic moisturizer\n• Give any new product 4–6 weeks before judging it\n\nIf acne is affecting your confidence significantly, a dermatologist can help — there are very effective treatments. You don't have to just "wait it out."`,
      category: "Body & Puberty", healthWords: [], followups: [], sources: ["NHS Teen Health"], isEmergency: false, modelUsed: "WellUP Health Engine",
    };
  }

  // ── ALLERGIES ──
  if (/allerg|itch|sneez|dust|pollen|rash|hive/.test(l)) {
    return {
      text: `Allergies happen when your immune system overreacts to something harmless — like dust, pollen, or certain foods — and releases histamine, which causes the familiar sneezing, itching, or rash.\n\n**How to know if it's an allergy:**\n• Symptoms happen consistently around specific triggers (certain foods, seasons, animals, environments)\n• Symptoms improve when you're away from the trigger\n• Antihistamines help\n\n**Practical tips:**\n• Keep a simple log of when symptoms flare — patterns reveal triggers\n• Rinse your face after being outside during high-pollen days\n• Wash bedding in hot water weekly\n\n⚠️ If you ever experience lip or throat swelling, or difficulty breathing after eating — that's anaphylaxis (a severe allergic reaction) and needs emergency help immediately. Call 112.`,
      category: "Allergies & Immunity", healthWords: [], followups: [], sources: ["World Allergy Organization", "NHS Allergy Guide"], isEmergency: false, modelUsed: "WellUP Health Engine",
    };
  }

  // ── NUTRITION / DIET ──
  if (/food|diet|nutrition|eat|meal|what should i eat|healthy food|balanced diet|vegetabl|fruit/.test(l)) {
    return {
      text: `A healthy daily diet doesn't have to be complicated. Here's what actually matters:\n\n• **Eat the rainbow**: Different colored vegetables and fruits give you different vitamins and antioxidants — aim for variety, not perfection.\n• **Protein at every meal**: Keeps you full longer and supports muscle. Eggs, lentils, paneer, chicken, fish, beans all count.\n• **Complex carbs**: Brown rice, whole wheat, oats — they release energy slowly, no blood sugar spikes.\n• **Healthy fats**: Nuts, seeds, avocado, ghee in moderation — your brain needs fat.\n• **Water**: 2–3 liters daily. Most people are mildly dehydrated without knowing it.\n\n**The biggest win**: cook at home more often than you eat processed food. You don't need to be perfect — 80% of meals being whole foods is genuinely enough.`,
      category: "Nutrition & Lifestyle", healthWords: [], followups: [], sources: ["ICMR Dietary Guidelines", "WHO Nutrition"], isEmergency: false, modelUsed: "WellUP Health Engine",
    };
  }

  // ── HYGIENE ──
  if (/hygiene|wash|brush|clean|odour|body odor|sweat|shower|oral health|teeth/.test(l)) {
    return {
      text: `Good daily hygiene is simpler than most people make it — here's what actually matters:\n\n**Body:**\n• Shower daily or every other day, especially after sweating\n• Use a gentle, fragrance-free soap on your skin (strong soaps disrupt your skin's natural barrier)\n• Change and wash clothes regularly, especially underwear and socks\n\n**Face:**\n• Wash morning and night with a gentle cleanser — just water is fine in between\n• Moisturize after washing (yes, even if you have oily skin)\n\n**Oral:**\n• Brush twice a day for 2 minutes (most people rush this)\n• Floss once a day — this is where most bacteria hide\n• Replace your toothbrush every 3 months\n\n**Hands:**\n• Wash before eating and after using the bathroom — this single habit prevents most infections.`,
      category: "Hygiene", healthWords: [], followups: [], sources: ["WHO Hygiene Guidelines", "NHS Self-care"], isEmergency: false, modelUsed: "WellUP Health Engine",
    };
  }

  // ── REPRODUCTIVE HEALTH ──
  if (/reproduct|sex|contracepti|pregnan|std|sti|ovulat|fertility|birth control/.test(l)) {
    return {
      text: `Reproductive health covers how your reproductive system works, staying healthy, and understanding your options — and it's important for everyone to know this stuff without embarrassment.\n\n**Key things everyone should know:**\n• Regular check-ups with a doctor (gynecologist for people with female reproductive systems, urologist/GP for all) are important even when nothing feels wrong\n• STIs (sexually transmitted infections) often have NO symptoms — testing is the only way to know\n• Contraception options vary widely: hormonal (pills, implants, injections), barrier (condoms), and others — a doctor can help find the right fit\n• Your menstrual cycle is a health indicator — irregular periods can signal hormonal imbalances worth checking out.\n\nKnowing your body and having open conversations with healthcare providers is the best way to stay protected and healthy.`,
      category: "Sexual & Reproductive Health", healthWords: [], followups: [], sources: ["WHO Reproductive Health", "NHS Sexual Health"], isEmergency: false, modelUsed: "WellUP Health Engine",
    };
  }

  // ── HEALTH RESOURCES ──
  if (/reliable.*information|resource|information|source|website|where.*find|trustworthy/.test(l)) {
    return {
      text: `Great question — and it matters a lot because health misinformation is everywhere online.\n\n**Reliable health sources:**\n• **WHO (who.int)** — global health guidance, very trustworthy\n• **NHS (nhs.uk)** — UK's National Health Service, excellent plain-language guides\n• **CDC (cdc.gov)** — US Centers for Disease Control, great for diseases and prevention\n• **ICMR (icmr.gov.in)** — India-specific health research and guidelines\n• **Mayo Clinic (mayoclinic.org)** — detailed, doctor-reviewed condition info\n• **MedlinePlus (medlineplus.gov)** — from the US National Library of Medicine\n\n**Red flags for unreliable sources:**\n• Selling you something\n• Claiming to cure everything\n• No author or references\n• "Doctors don't want you to know…"\n\nAlways cross-check health information across 2–3 of the above before acting on it. And for anything personal to your health, a real doctor who knows your history beats any website.`,
      category: "Health Resources", healthWords: [], followups: [], sources: ["WHO", "NHS", "CDC", "ICMR"], isEmergency: false, modelUsed: "WellUP Health Engine",
    };
  }

  // ── MENTAL HEALTH / DEPRESSION ──
  if (/depress|sad|empty|hopeless|worthless|no motivation|mental health/.test(l)) {
    return {
      text: `Feeling persistently sad, empty, or like things won't get better is really hard — and you don't have to just push through it alone.\n\nSome things that can genuinely help:\n• **Talk to someone**: A trusted friend, family member, or counselor. Just saying how you feel out loud to another person releases some of the pressure.\n• **Small movement**: A 10-minute walk outdoors can measurably improve mood — not because it solves everything, but because it breaks the static.\n• **Don't isolate completely**: Low motivation makes isolation easy, but isolation makes low mood worse. Even a short social interaction helps.\n• **Sunlight**: Natural light in the morning regulates your mood hormones.\n\nIf this has been going on for more than 2 weeks, or it's affecting your ability to function, please see a doctor or counselor. Depression is a medical condition — not a character flaw — and it responds very well to treatment.`,
      category: "Mental Well-being", healthWords: [], followups: [], sources: ["WHO Mental Health", "iCall India (icallhelpline.org)"], isEmergency: false, modelUsed: "WellUP Health Engine",
    };
  }

  // ── TESTICULAR PAIN ──
  if (/testicul|testis|scrotum|ball|balls hurt|groin pain/.test(l)) {
    return {
      text: `Testicular pain is something you should never ignore — it has too many possible causes, some of which are time-sensitive.\n\n⚠️ **Urgent check first**: If the pain started suddenly, is sharp or severe, or comes with swelling, nausea, or fever — go to urgent care or an ER immediately. Testicular torsion (a twisted testicle) is a medical emergency that needs treatment within hours to prevent permanent damage.\n\nIf it's a dull, mild ache that came on gradually:\n• Wearing supportive underwear (briefs) instead of loose boxers helps\n• A cool pack wrapped in cloth for 15 min can reduce mild discomfort\n• Could be a minor strain from lifting or prolonged sitting\n\nRegardless of intensity — please get it checked by a doctor in person soon. It's quick, not embarrassing, and important.`,
      category: "Body & Puberty", healthWords: [], followups: [], sources: ["NHS Men's Health", "Urology Care Foundation"], isEmergency: false, modelUsed: "WellUP Health Engine",
    };
  }

  // ── HEADACHE / MIGRAINE ──
  if (/headache|migraine|head pain|head hurt/.test(l)) {
    return {
      text: `Headaches have many causes — dehydration, tension, poor posture, too much screen time, lack of sleep, or skipped meals are the most common for young people.\n\n**Quick relief:**\n• Drink a full glass of water first — mild dehydration causes a lot of headaches\n• Rest in a quiet, dark room if possible\n• Gentle massage at your temples and the base of your skull\n• A warm or cool compress on your forehead (whichever feels better)\n\n**Tension headaches** (feel like a tight band around your head) are usually from screen tension or stress. Short breaks and posture correction help a lot.\n\n**See a doctor if:** headaches are frequent (more than 2x per week), very severe ("worst of your life"), or come with vision changes, vomiting, or fever — those need evaluation.`,
      category: "General Health", healthWords: [], followups: [], sources: ["NHS Headache Guide", "WHO"], isEmergency: false, modelUsed: "WellUP Health Engine",
    };
  }

  // ── "I don't know what to ask" / suggest ──
  if (/don't know what to ask|no idea|suggest|where do i start|what can i ask/.test(l)) {
    return {
      text: `No worries at all — here are some questions people commonly wonder about but don't always feel comfortable asking:\n\n• Why do I get cramps during my period, and what actually helps?\n• What's happening to my body during puberty — is what I'm experiencing normal?\n• How do I know if my sleep schedule is affecting my health?\n• What does a genuinely healthy diet look like without being obsessive?\n• How do I deal with stress and anxiety before it becomes overwhelming?\n• What should I know about reproductive health and sexual health?\n• Are there signs that I should see a doctor vs. just wait it out?\n\nFeel free to ask about any of these, or anything else on your mind!`,
      category: "General Health", healthWords: [], followups: [], sources: [], isEmergency: false, modelUsed: "WellUP Assistant",
    };
  }

  // ── GENERIC FALLBACK ──
  return {
    text: `I'm here to give you straightforward, helpful health guidance. Feel free to describe any symptoms, habits, nutrition questions, or bodily changes you're wondering about, and I'll give you clear, actionable information right away.`,
    category,
    healthWords: [],
    followups: [],
    sources: [],
    isEmergency: false,
    modelUsed: "WellUP Health Engine",
  };
}

/* ═══════════════════════════════════════════════════════════
   NVIDIA NIM PROVIDER
   ═══════════════════════════════════════════════════════════ */
async function generateWithNvidia(
  message: string,
  history: { role: "user" | "model"; parts: string }[],
  systemPrompt: string,
  language: string,
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY not set");

  const langPrefix =
    language === "hi" ? "Respond naturally in Hindi. " :
    language === "gu" ? "Respond naturally in Gujarati. " : "";

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-8).map(h => ({
      role: h.role === "model" ? "assistant" : "user",
      content: h.parts,
    })),
    { role: "user", content: `${langPrefix}${message}` },
  ];

  // Try current NVIDIA NIM models in order
  const nvidiaModels = [
    "meta/llama-3.2-11b-vision-instruct",
    "meta/llama-3.2-90b-vision-instruct",
    "mistralai/mistral-7b-instruct-v0.3",
  ];

  for (const model of nvidiaModels) {
    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.72,
          top_p: 0.9,
          max_tokens: 1500,
          stream: false,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        // 410 = model EOL, try next
        if (res.status === 410) {
          console.warn(`[WellUP] NVIDIA ${model} EOL, trying next...`);
          continue;
        }
        throw new Error(`NVIDIA API ${res.status}: ${err.slice(0, 200)}`);
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";
      if (text) {
        console.log(`[WellUP] NVIDIA ${model} succeeded`);
        return text;
      }
    } catch (e: any) {
      if (e.message?.includes("410") || e.message?.includes("EOL")) {
        console.warn(`[WellUP] NVIDIA ${model} EOL, trying next...`);
        continue;
      }
      throw e;
    }
  }

  throw new Error("All NVIDIA models unavailable");
}

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT — generateChatResponse
   ═══════════════════════════════════════════════════════════ */
export async function generateChatResponse(
  message: string,
  history: { role: "user" | "model"; parts: string }[] = [],
  language = "en",
  explainSimply = false,
  userHealthContext?: string,
  preferNvidia = false,
): Promise<ChatResponseData> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY;

  // Build the personalized system prompt
  let systemPrompt = SYSTEM_PROMPT;
  if (userHealthContext && userHealthContext.trim()) {
    systemPrompt += `\n\n---\nUSER HEALTH PROFILE (use this to personalize your response naturally — don't announce it, just use it):\n${userHealthContext}\n---`;
  }
  if (explainSimply) {
    systemPrompt += "\n\nIMPORTANT: Explain this as simply as possible for a curious 13-year-old. Short sentences. Zero jargon. Use everyday analogies. Keep it under 120 words.";
  }

  const langPrefix =
    language === "hi" ? "Please respond in natural, friendly Hindi. " :
    language === "gu" ? "Please respond in natural, friendly Gujarati. " : "";
  const prompt = `${langPrefix}${message}`;

  let rawResponse = "";
  let activeModel = "";

  // ── Try NVIDIA NIM first if explicitly preferred ──
  if (preferNvidia && nvidiaKey) {
    try {
      rawResponse = await generateWithNvidia(message, history, systemPrompt, language);
      activeModel = "meta/llama-3.2-11b-vision-instruct";
      console.log("[WellUP] NVIDIA NIM succeeded");
    } catch (err: any) {
      console.warn("[WellUP] NVIDIA NIM failed:", err?.message);
    }
  }

  // ── Try Gemini ──
  if (!rawResponse && geminiKey) {
    const candidates = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-3.6-flash",
    ];

    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      for (const modelName of candidates) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt,
            generationConfig: { temperature: 0.72, maxOutputTokens: 2048 },
          });
          const chat = model.startChat({
            history: history.slice(-8).map(h => ({
              role: h.role,
              parts: [{ text: h.parts }],
            })),
          });
          const result = await chat.sendMessage(prompt);
          rawResponse = result.response.text();
          activeModel = modelName;
          if (rawResponse) {
            console.log(`[WellUP] Gemini ${modelName} succeeded`);
            break;
          }
        } catch (e: any) {
          const errMsg = e?.message || "";
          console.warn(`[WellUP] Gemini ${modelName} failed: ${errMsg.slice(0, 80)}`);
          // Any 401/403 or permission/auth error -> break immediately and jump to NVIDIA
          if (/401|403|leaked|API_KEY_INVALID|PERMISSION_DENIED|unauthorized|forbidden/i.test(errMsg)) {
            console.warn("[WellUP] Gemini auth/permission error, skipping remaining Gemini models for this request.");
            break;
          }
        }
      }
    } catch (err: any) {
      console.warn("[WellUP] Gemini provider error:", err?.message);
    }
  }

  // ── Try NVIDIA NIM as fallback (if Gemini failed and not already tried) ──
  if (!rawResponse && !preferNvidia && nvidiaKey) {
    try {
      rawResponse = await generateWithNvidia(message, history, systemPrompt, language);
      activeModel = "meta/llama-3.2-11b-vision-instruct";
      console.log("[WellUP] NVIDIA NIM fallback succeeded");
    } catch (err: any) {
      console.warn("[WellUP] NVIDIA NIM fallback failed:", err?.message?.slice(0, 120));
    }
  }

  // ── Final fallback ──
  if (!rawResponse) {
    console.warn("[WellUP] All AI providers failed, using local fallback");
    const fb = buildFallback(message, language);
    // Parse health words from fallback text too
    const { cleanText, healthWords } = parseHealthWords(fb.text);
    const warning = (!geminiKey && !nvidiaKey)
      ? "No API keys configured. Using local health knowledge."
      : "AI providers temporarily unavailable. Using local health knowledge.";
    return {
      ...fb,
      text: cleanText,
      healthWords,
      followups: [],
      options: [],
      question: undefined,
      apiKeyWarning: warning,
    };
  }

  const { cleanText, healthWords } = parseHealthWords(rawResponse);
  const { cleanText: finalText } = parseFollowups(cleanText);
  const category = detectCategory(message);
  const isEmergency = /chest pain|difficulty breath|severe bleed|unconscious|can't breathe|self.harm|suicid/.test(message.toLowerCase());

  return {
    text: finalText,
    category,
    healthWords,
    followups: [],
    options: [],
    question: undefined,
    sources: ["World Health Organization (WHO)"],
    isEmergency,
    modelUsed: activeModel,
  };
}
