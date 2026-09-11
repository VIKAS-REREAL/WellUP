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
   SYSTEM PROMPT  (sent server-side to Gemini every request)
───────────────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are WellUP, a private, youth-friendly health-awareness AI assistant for SDG 3 (Good Health & Well-being).

CORE MISSION: Help teenagers and curious individuals understand health topics clearly, without fear or embarrassment.

ABSOLUTE RULES:
1. NEVER DIAGNOSE. Never say "You have X." Say "I cannot diagnose, but I can explain..."
2. NEVER PRESCRIBE medications or dosages.
3. EMERGENCY PROTOCOL: For life-threatening symptoms (chest pain, breathing difficulty, severe bleeding, self-harm) → immediately direct to 112/108 (India) or nearest emergency room. NEVER invent numbers.
4. HEALTH WORDS (CRITICAL): When mentioning medical/anatomical terms, wrap them like:
   [HEALTH_WORD: Term | Simple 1-sentence definition | What it does in the body | Where it is | Related terms comma separated]
   Example: [HEALTH_WORD: Uterus | A hollow muscular organ in the female pelvis | Nourishes a fertilized egg; sheds its lining each month as menstruation | Pelvis between bladder and rectum | Menstruation, Endometrium, Cervix, Ovary]
5. LANGUAGE: If language=hi respond fully in Hindi. If language=gu respond fully in Gujarati. Include English medical terms in parentheses.
6. MYTH vs FACT: When responding to "Is it true that...", label clearly **[MYTH]** or **[FACT]** first.
7. EXPLAIN SIMPLY: When asked to explain simply, use everyday analogies for a 14-16 year old.
8. SOURCES: Only cite real organizations (WHO, NHS, ICMR, MoHFW, UNICEF). Never fabricate URLs.
9. If asked something unrelated to health, gently redirect.

RESPONSE FORMAT (use only the sections that apply):
**Short Answer** — answer the question directly
**What it means** — explain the concept
**What you can do** — practical, safe steps
**When to see a professional** — only when relevant
**Health Words** — use the [HEALTH_WORD:...] tags for terms
**Sources** — only real orgs

Use markdown: **bold**, bullet lists with -, ### headings.
Keep responses warm, conversational, and under 400 words unless the question requires more detail.
Be empathetic. The user may be embarrassed. Never judge.`;

/* ─────────────────────────────────────────────────────────────
   HEALTH WORD TAG PARSER
───────────────────────────────────────────────────────────── */
export function parseHealthWords(raw: string): { cleanText: string; healthWords: HealthWord[] } {
  const words: HealthWord[] = [];
  const regex = /\[HEALTH_WORD:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^\]]+)\]/gi;
  const clean = raw.replace(regex, (_, term, def, fn, loc, related) => {
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
  return { cleanText: clean, healthWords: words };
}

/* ─────────────────────────────────────────────────────────────
   CATEGORY DETECTION
───────────────────────────────────────────────────────────── */
function detectCategory(msg: string): string {
  const l = msg.toLowerCase();
  if (/period|cramp|menstru|uterus|endometri|dysmenorrh|bleed|tampon|pad|sanitary/.test(l)) return "Menstrual Health";
  if (/puberty|acne|voice|grow|teen|adolescen|breast|testis|hormones|body hair|height/.test(l)) return "Body & Puberty";
  if (/allerg|itch|rash|hive|sneez|pollen|dust|wheez|anaphylax|histamine/.test(l)) return "Allergies & Immunity";
  if (/food|diet|water|vitamin|mineral|nutrition|calor|protein|carb|fiber|vegetabl|fruit|hydrat|eat/.test(l)) return "Nutrition & Lifestyle";
  if (/stress|anxiet|sleep|depress|mental|mood|emotion|burnout|fatigue|wellbeing/.test(l)) return "Mental Well-being";
  if (/sex|reproduct|contracepti|pregnan|std|sti|ovulat/.test(l)) return "Sexual & Reproductive Health";
  if (/hygiene|wash|brush|clean|odour|body odor/.test(l)) return "Hygiene";
  if (/exercise|gym|sport|yoga|activ|walk|fitness/.test(l)) return "Physical Well-being";
  if (/relationship|friend|family|peer|bully|social/.test(l)) return "Relationships";
  return "General Health";
}

/* ─────────────────────────────────────────────────────────────
   RICH FALLBACK LIBRARY  (used when Gemini is unavailable)
   These are real, WHO/NHS-aligned educational responses.
───────────────────────────────────────────────────────────── */
function buildFallback(message: string, language: string): ChatResponseData {
  const l = message.toLowerCase();
  const category = detectCategory(message);

  // ── EMERGENCY ──
  if (/chest pain|difficulty breath|severe bleed|unconscious|can't breathe|heart attack|stroke|self.harm|suicide/.test(l)) {
    return {
      text: `⚠️ **This sounds like a medical emergency.**\n\n### What to do right now:\n- **Call 112 or 108 immediately** (India emergency services)\n- Go to the **nearest emergency department**\n- Do not drive yourself — call an ambulance or have someone help\n- Stay calm, sit upright if you have chest pain or breathing difficulty\n- Stay on the line with emergency services until help arrives\n\n*WellUP is a health education tool and cannot provide emergency treatment.*`,
      category: "🚨 Emergency",
      healthWords: [],
      sources: ["India Emergency Services: 112 / 108", "WHO Emergency Care Guidelines"],
      isEmergency: true,
      modelUsed: "WellUP Safety Engine",
    };
  }

  // ── DIAGNOSIS REQUEST ──
  if (/diagnose me|do i have|is it (cancer|diabetes|disease)|what disease|am i sick/.test(l)) {
    return {
      text: `I'm not able to diagnose medical conditions — and honestly, no chatbot should claim to.\n\n**What I can do:**\n- Explain what a condition means in simple words\n- Describe what symptoms doctors look for\n- Tell you what kind of doctor to see\n- Help you prepare questions for your appointment\n\nIf you describe what you're experiencing, I'll explain the relevant health concepts and when professional evaluation makes sense. What are you noticing?`,
      category: "General Health",
      healthWords: [{
        term: "Clinical Diagnosis",
        definition: "The process of identifying a condition through physical examination, medical history, and tests.",
        function: "Guides doctors to choose the right treatment plan.",
        location: "Healthcare settings — clinics, hospitals",
        relatedTerms: ["Differential Diagnosis", "Prognosis", "Pathology"],
      }],
      sources: ["WHO Health Literacy Guidelines"],
      isEmergency: false,
      modelUsed: "WellUP Safety Engine",
    };
  }

  // ── PERIODS / MENSTRUAL HEALTH ──
  if (/period|cramp|menstru|uterus/.test(l)) {
    return {
      text: `**Short Answer:** Menstrual cramps happen because of chemicals called **prostaglandins** that cause the **uterus** to contract.\n\n### What it means\nEvery month, the lining inside your uterus (called the **endometrium**) builds up to prepare for a possible pregnancy. When pregnancy doesn't happen, your body releases prostaglandins to help shed this lining — those contractions can feel like cramping in your lower belly.\n\n### What you can do\n- **Warm compress** on the lower abdomen helps relax the muscles\n- **Light movement** like walking releases natural pain-relieving chemicals (**endorphins**)\n- Staying **well-hydrated** reduces bloating\n- Getting enough sleep helps hormone regulation\n\n### When to see a professional\nIf cramps are severe enough to stop your daily activities, or if your period is very irregular or extremely heavy, speak to a doctor. These could sometimes point to **endometriosis** or other treatable conditions.\n\n### Sources\nWHO Menstrual Health Guidelines • NHS Period Pain Guide`,
      category: "Menstrual Health",
      healthWords: [
        { term: "Uterus", definition: "A hollow, pear-shaped muscular organ in the female pelvis.", function: "Nourishes a fertilized egg during pregnancy; sheds its lining each month as menstruation.", location: "Pelvis, between the bladder and rectum", relatedTerms: ["Menstruation", "Endometrium", "Cervix", "Ovary"] },
        { term: "Prostaglandins", definition: "Lipid compounds that act like hormones to trigger muscle contractions.", function: "Cause the uterine wall to contract and shed its lining during menstruation.", location: "Produced inside uterine tissue", relatedTerms: ["Dysmenorrhea", "Inflammation", "Hormones"] },
        { term: "Dysmenorrhea", definition: "The medical term for painful menstrual periods.", function: "Describes pain from uterine contractions or underlying pelvic conditions.", location: "Lower abdomen and pelvic region", relatedTerms: ["Menstruation", "Endometriosis", "Prostaglandins"] },
        { term: "Endometrium", definition: "The inner lining of the uterus that thickens each cycle and sheds during menstruation.", function: "Provides the environment needed for a fertilized egg to implant and grow.", location: "Inside the uterus", relatedTerms: ["Uterus", "Menstruation", "Endometriosis"] },
      ],
      sources: ["WHO Reproductive Health", "NHS Menstrual Health"],
      isEmergency: false,
      modelUsed: "WellUP Health Engine",
    };
  }

  // ── NOT EATING VEGETABLES / PICKY EATING ──
  if (/vegetabl|eat.*vegetabl|picky eater|not eating|don't eat.*food|fussy/.test(l)) {
    return {
      text: `**Short Answer:** Difficulty eating vegetables is extremely common — you're definitely not alone. There are practical strategies that actually work.\n\n### Why it happens\nOur taste preferences are shaped by genetics (some people have more taste buds sensitive to bitter flavors), childhood experiences, and what we grew up eating. **Neophobia** (fear of new foods) is also a real thing.\n\n### What you can do\n- **Start with mild ones** — corn, peas, carrots, and cucumber tend to be less bitter\n- **Change the preparation** — raw and cooked vegetables taste completely different; try roasting, which brings out natural sweetness\n- **Add to things you already like** — blend spinach into a smoothie, add veggies to pasta sauce or rice\n- **Small portions consistently** — research shows repeated exposure (without forcing) gradually increases acceptance\n- **Dip it** — hummus, peanut butter, or yogurt dip makes vegetables more appealing\n- **Make it fun** — eat with others, try new recipes, involve yourself in cooking\n\n### What it means for your health\nVegetables provide **dietary fiber**, **vitamins** (A, C, K, folate), **minerals**, and **antioxidants** that protect against disease. Even 1–2 servings daily makes a meaningful difference.\n\n### When to see a professional\nIf you have extreme food restriction that affects your daily life, a **nutritionist** or therapist specializing in **ARFID** (Avoidant/Restrictive Food Intake Disorder) can help.\n\n### Sources\nWHO Nutrition Guidelines • ICMR Dietary Guidelines for Indians`,
      category: "Nutrition & Lifestyle",
      healthWords: [
        { term: "Dietary Fiber", definition: "Plant-based carbohydrates that the body cannot digest but that feed gut bacteria and aid bowel movements.", function: "Regulates digestion, controls blood sugar, and reduces risk of heart disease.", location: "Found in vegetables, fruits, whole grains, legumes", relatedTerms: ["Gut Microbiome", "Digestion", "Nutrition"] },
        { term: "Antioxidants", definition: "Molecules that neutralize harmful unstable atoms called free radicals.", function: "Protect body cells from damage linked to aging and chronic disease.", location: "Found in colourful vegetables and fruits", relatedTerms: ["Vitamins", "Inflammation", "Phytonutrients"] },
        { term: "ARFID", definition: "Avoidant/Restrictive Food Intake Disorder — extreme, persistent difficulty eating certain foods.", function: "Can lead to nutritional deficiencies when not addressed.", location: "Psychological/behavioural pattern affecting eating", relatedTerms: ["Nutrition", "Food Neophobia", "Dietitian"] },
      ],
      sources: ["WHO Nutrition Fact Sheet", "ICMR Dietary Guidelines 2024", "NHS Eat Well Guide"],
      isEmergency: false,
      modelUsed: "WellUP Health Engine",
    };
  }

  // ── PUBERTY ──
  if (/puberty|adolescen|growing up|teen/.test(l)) {
    return {
      text: `**Short Answer:** Puberty is your body's natural transformation into adulthood, driven by hormones — it's different for everyone and completely normal.\n\n### What it means\nPuberty is triggered by the brain signalling the **pituitary gland** to release hormones like **estrogen** and **testosterone**. This typically starts between ages 8–13 in females and 9–14 in males, though the timing varies widely.\n\n### What changes happen\n- **Growth spurts** — rapid height and weight gain\n- **Skin changes** — oil glands activate, causing **acne** (blackheads, pimples)\n- **Body hair** develops in new areas\n- **Voice changes** — the larynx grows, voice deepens (especially in males)\n- **Reproductive development** — first periods (females); sperm production begins (males)\n- **Emotional changes** — mood swings, stronger feelings — this is hormonal and completely normal\n\n### What you can do\n- Maintain a consistent hygiene routine (wash face twice daily, shower regularly)\n- Get 8–10 hours of sleep — growth hormones release primarily during sleep\n- Eat balanced meals rich in calcium and protein to support growth\n- Talk to a trusted adult, school counselor, or doctor if changes feel confusing\n\n### Sources\nUNICEF Adolescent Health • WHO Adolescent Health`,
      category: "Body & Puberty",
      healthWords: [
        { term: "Hormones", definition: "Chemical messengers produced by glands that travel through the bloodstream and control body functions.", function: "Trigger growth, metabolism, mood changes, and sexual development during puberty.", location: "Produced by endocrine glands (pituitary, ovaries, testes, adrenal glands)", relatedTerms: ["Estrogen", "Testosterone", "Pituitary Gland", "Puberty"] },
        { term: "Estrogen", definition: "The primary female sex hormone produced mainly in the ovaries.", function: "Drives female puberty: breast development, menstruation, bone density, and skin changes.", location: "Produced in the ovaries (mainly)", relatedTerms: ["Ovaries", "Menstruation", "Progesterone"] },
        { term: "Testosterone", definition: "The primary male sex hormone produced in the testes.", function: "Drives male puberty: muscle growth, voice deepening, body hair, and sperm production.", location: "Produced in the testes", relatedTerms: ["Testes", "Puberty", "Androgens"] },
        { term: "Acne", definition: "A skin condition where hair follicles become clogged with oil and dead skin cells.", function: "Not dangerous but can affect self-esteem; treatable with proper skincare.", location: "Face, chest, back — areas with dense oil glands", relatedTerms: ["Sebum", "Pores", "Hormones"] },
      ],
      sources: ["UNICEF Adolescent Development", "WHO Adolescent Health Guidelines"],
      isEmergency: false,
      modelUsed: "WellUP Health Engine",
    };
  }

  // ── ALLERGIES / ITCHING ──
  if (/allerg|itch|rash|hive|sneez|swelling/.test(l)) {
    return {
      text: `**Short Answer:** Itching and rashes are often allergic reactions — your immune system responding to something it sees as a threat.\n\n### What it means\nWhen your body encounters an allergen (like pollen, dust, a food, or a medication), specialized immune cells release a chemical called **histamine**. Histamine causes the classic allergy symptoms: itching, swelling, redness, sneezing.\n\n### Common triggers\n- **Food** — peanuts, tree nuts, shellfish, milk, wheat, eggs\n- **Environmental** — dust mites, pollen, pet dander, mold\n- **Contact** — certain fabrics, soaps, metals (nickel in jewelry)\n- **Medications** — penicillin and NSAIDs are common\n- **Insect stings**\n\n### What you can do\n- Avoid the known trigger if identified\n- Antihistamine medications (ask a pharmacist) can reduce itching — do not self-medicate without guidance\n- Calamine lotion or cool compresses for mild skin itching\n- Keep a diary of when reactions occur to identify patterns\n\n### ⚠️ Seek emergency help if:\n- Throat swelling, difficulty breathing, dizziness — these are signs of **anaphylaxis** (severe allergic reaction). Call **112** immediately.\n\n### Sources\nWHO Allergy Fact Sheet • NHS Allergies Guide • ICMR`,
      category: "Allergies & Immunity",
      healthWords: [
        { term: "Histamine", definition: "A chemical released by immune cells during an allergic reaction.", function: "Causes itching, swelling, redness, and sneezing as part of the immune response.", location: "Released from mast cells throughout the body, especially in skin and airways", relatedTerms: ["Allergic Reaction", "Antihistamine", "Anaphylaxis"] },
        { term: "Allergen", definition: "A substance that triggers an allergic reaction in sensitive individuals.", function: "Activates the immune system unnecessarily, causing allergy symptoms.", location: "Can be inhaled, ingested, touched, or injected", relatedTerms: ["Histamine", "IgE Antibodies", "Sensitization"] },
        { term: "Anaphylaxis", definition: "A severe, rapid, potentially life-threatening allergic reaction.", function: "Causes the immune system to overreact, affecting the whole body simultaneously.", location: "Systemic — affects airways, circulation, and skin", relatedTerms: ["Allergen", "Epinephrine", "Emergency"] },
      ],
      sources: ["WHO Allergy Facts", "NHS Allergy Guidance", "ACAAI Guidelines"],
      isEmergency: false,
      modelUsed: "WellUP Health Engine",
    };
  }

  // ── SLEEP ──
  if (/sleep|insomnia|can't sleep|tired/.test(l)) {
    return {
      text: `**Short Answer:** Sleep is one of the most important, and most underestimated, parts of your health. Teenagers need 8–10 hours; adults need 7–9.\n\n### What it means\nDuring sleep, your brain consolidates memories, your body repairs tissues, and growth hormone is released. Poor sleep affects mood, concentration, immunity, and even appetite.\n\n### What you can do\n- **Consistent schedule** — sleep and wake at the same time daily, even on weekends\n- **Dark, cool room** — light suppresses **melatonin** (your sleep hormone)\n- **No screens 30–60 minutes before bed** — blue light delays melatonin release\n- **Avoid caffeine** after 2 PM\n- **Wind-down routine** — reading, gentle stretching, or journaling\n\n### Sources\nWHO Sleep Guidelines • NHS Sleep Advice • National Sleep Foundation`,
      category: "Mental Well-being",
      healthWords: [
        { term: "Melatonin", definition: "A hormone produced by the pineal gland that regulates the sleep-wake cycle.", function: "Signals to the brain that it's time to sleep; rises in darkness and falls with light.", location: "Produced in the pineal gland (in the brain)", relatedTerms: ["Circadian Rhythm", "Pineal Gland", "Sleep Hygiene"] },
        { term: "Circadian Rhythm", definition: "The body's internal 24-hour biological clock.", function: "Regulates sleep, hunger, body temperature, and hormone release throughout the day.", location: "Controlled by the suprachiasmatic nucleus in the brain", relatedTerms: ["Melatonin", "Sleep", "Jet Lag"] },
      ],
      sources: ["WHO Sleep Guidelines", "NHS Sleep Advice"],
      isEmergency: false,
      modelUsed: "WellUP Health Engine",
    };
  }

  // ── INFLAMMATION ──
  if (/inflamm/.test(l)) {
    return {
      text: `**Short Answer:** Inflammation is your body's natural defense reaction — like a biological alarm system.\n\n### What it means\nWhen your body detects an injury, infection, or irritant, it sends immune cells and extra blood to the area. This causes the classic signs: redness, warmth, swelling, pain. It's a healing process.\n\n- **Acute inflammation** = short-term, useful (e.g., a cut or infection)\n- **Chronic inflammation** = long-term, harmful (linked to diabetes, heart disease, arthritis)\n\n### What you can do\nTo reduce unhelpful chronic inflammation:\n- Eat more **anti-inflammatory foods**: fruits, vegetables, olive oil, whole grains, fatty fish\n- Exercise regularly (even walking 30 minutes daily)\n- Get enough sleep\n- Manage stress\n\n### Sources\nWHO Non-Communicable Disease Facts • NHS Health A-Z`,
      category: "General Health",
      healthWords: [
        { term: "Inflammation", definition: "The immune system's response to injury, infection, or irritation — characterized by redness, heat, swelling, and pain.", function: "Protects the body from pathogens and starts the healing process.", location: "Can occur in any tissue throughout the body", relatedTerms: ["Immune System", "Cytokines", "Chronic Inflammation"] },
        { term: "Cytokines", definition: "Small proteins released by immune cells that coordinate the immune response.", function: "Signal other immune cells to respond to infection or injury.", location: "Released throughout the immune system into the bloodstream", relatedTerms: ["Inflammation", "Immune System", "Fever"] },
      ],
      sources: ["WHO NCDs Fact Sheet", "Harvard Medical School Health Publishing"],
      isEmergency: false,
      modelUsed: "WellUP Health Engine",
    };
  }

  // ── MYTH vs FACT ──
  if (/is it true|myth|fact|shouldn.t|should not.*exercise.*period/.test(l)) {
    return {
      text: `**[FACT]** — Exercise during your period is not only safe, it can actively help relieve cramps.\n\n### Why this is a FACT\nPhysical activity releases **endorphins** — your body's natural pain-relieving chemicals. Research consistently shows that gentle to moderate exercise reduces **dysmenorrhea** (period pain) significantly.\n\n### What works best\n- Light walking, yoga, or swimming\n- You don't have to push hard — even 20 minutes of gentle movement helps\n- Listen to your body — rest if you feel genuinely unwell\n\n### When to take it easy\nIf you have very heavy bleeding, severe cramps, dizziness, or conditions like **endometriosis**, lighter activity is wise and your doctor can advise specifically.\n\n### Sources\nAmerican College of Sports Medicine • NHS Menstrual Health • WHO Physical Activity Guidelines`,
      category: "Menstrual Health",
      healthWords: [
        { term: "Endorphins", definition: "Natural chemicals produced by the brain during exercise, laughter, and other activities.", function: "Act as natural painkillers and mood boosters, reducing the perception of pain.", location: "Produced in the central nervous system and pituitary gland", relatedTerms: ["Exercise", "Pain Relief", "Dopamine"] },
        { term: "Dysmenorrhea", definition: "The medical term for painful menstrual periods.", function: "Caused by prostaglandins triggering uterine contractions.", location: "Lower abdomen and pelvis", relatedTerms: ["Prostaglandins", "Uterus", "Endometriosis"] },
      ],
      sources: ["ACOG Guidelines", "NHS Menstrual Health", "WHO Physical Activity"],
      isEmergency: false,
      modelUsed: "WellUP Health Engine",
    };
  }

  // ── "I DON'T KNOW WHAT TO ASK" ──
  if (/don.t know what to ask|not sure|where to start|help me start/.test(l)) {
    return {
      text: `No worries at all — that's a great place to be, because it means you're curious.\n\nHere are some questions other young people often wonder about:\n\n- **"What actually happens during puberty?"**\n- **"Why do periods hurt, and is the pain normal?"**\n- **"What is the uterus and what does it do?"**\n- **"How do I know if I have a food allergy?"**\n- **"What does inflammation mean in simple terms?"**\n- **"Is it safe to exercise during my period?"**\n- **"How many hours of sleep does a teenager really need?"**\n- **"Why do I feel anxious before exams and is that normal?"**\n- **"What should I know about menstrual hygiene?"**\n- **"What are the most common allergy triggers in India?"**\n\nJust pick any one and ask — or describe something you've been curious about in your own words. There are no wrong questions here. 💚`,
      category: "General Health",
      healthWords: [],
      sources: ["WellUP — SDG 3 Health Awareness"],
      isEmergency: false,
      modelUsed: "WellUP Health Engine",
    };
  }

  // ── GUJARATI ──
  if (language === "gu" || /gujarati|gu/i.test(l)) {
    return {
      text: `**ટૂંકો જવાબ:** WellUP પર આપનું સ્વાગત છે! અહીં તમે કોઈ પણ સ્વાસ્થ્ય વિષે પ્રશ્ન નિ:સ્વાર્થ રીતે પૂછી શકો છો.\n\n### સ્વાસ્થ્ય શ્રેણીઓ:\n- **શારીરિક ફેરફારો** (Puberty) — ઉગ્રરીતે ઉગવાનો સમય\n- **માસિક ધર્મ** (Menstruation) — ગર્ભાશયની ક્રિયા\n- **એલર્જી** — ખોરાક, ધૂળ, પ્રદૂષણ\n- **માનસિક સ્વાસ્થ્ય** — ચિંતા, ઊંઘ, સ્ટ્રેસ\n- **પોષણ** — ખોરાક, પાણી, વ્યાયામ\n\nઉદાહરણ: "**ગર્ભાશય (Uterus)** શું છે?" — ગર્ભાશય એ સ્ત્રી પ્રજનન તંત્રનું સ્નાયુ-ભરેલ અંગ છે, જ્યાં ગર્ભ વૃદ્ધિ પામે છે અને જ્યાંથી માસિક ધર્મ થાય છે.\n\nતમે શું જાણવા માંગો છો?`,
      category: "General Health",
      healthWords: [{ term: "ગર્ભાશય (Uterus)", definition: "સ્ત્રી પ્રજનન તંત્રનું એક સ્નાયુ-ભરેલ અંગ.", function: "ગર્ભ ધારણ કરે છે અને માસિક ચક્ર દ્વારા ગર્ભાશયયુત અસ્તર ઉગાળે છે.", location: "પેલ્વિસ — મૂત્રાશય અને ગુદામાર્ગ વચ્ચે", relatedTerms: ["માસિક ધર્મ", "અંડાશય (Ovary)", "Endometrium"] }],
      sources: ["WHO Reproductive Health", "MoHFW India"],
      isEmergency: false,
      modelUsed: "WellUP Multilingual Engine",
    };
  }

  // ── HINDI ──
  if (language === "hi") {
    return {
      text: `**संक्षिप्त उत्तर:** WellUP में आपका स्वागत है! यहाँ आप किसी भी स्वास्थ्य विषय पर बिना शर्म के सवाल पूछ सकते हैं।\n\n### विषय जो आप पूछ सकते हैं:\n- **यौवन (Puberty)** — शरीर में होने वाले बदलाव\n- **माहवारी (Menstruation)** — माहवारी दर्द और स्वच्छता\n- **एलर्जी** — खाना, धूल, पराग\n- **मानसिक स्वास्थ्य** — तनाव, नींद, चिंता\n- **पोषण** — आहार, हाइड्रेशन, व्यायाम\n\nक्या आप कुछ विशेष पूछना चाहते हैं?`,
      category: "General Health",
      healthWords: [{ term: "गर्भाशय (Uterus)", definition: "महिला प्रजनन तंत्र का एक खोखला, मांसपेशी से बना अंग।", function: "गर्भावस्था के दौरान भ्रूण को पोषण देता है; हर महीने अपनी परत को माहवारी के रूप में बाहर निकालता है।", location: "श्रोणि में — मूत्राशय और मलाशय के बीच", relatedTerms: ["माहवारी", "अंडाशय", "हार्मोन"] }],
      sources: ["WHO Reproductive Health", "MoHFW India"],
      isEmergency: false,
      modelUsed: "WellUP Multilingual Engine",
    };
  }

  // ── DEFAULT GENERIC ──
  return {
    text: `**Short Answer:** That's a great health question — let me help you understand it clearly.\n\n### General wellness tip\nOur bodies are complex and each person is different. The best approach to health is:\n- **Regular movement** — even 30 minutes of walking daily\n- **Balanced nutrition** — vegetables, fruits, protein, whole grains\n- **7–9 hours of sleep** — essential for brain and body repair\n- **Hydration** — 6–8 glasses of water daily\n- **Mental wellbeing** — manage stress, stay connected\n\nCould you be more specific about what you'd like to understand? For example:\n- A body part or organ?\n- A symptom or feeling?\n- A health topic like allergies, periods, or mental health?\n\nThe more specific you are, the better I can help! 💚`,
    category,
    healthWords: [{
      term: "Homeostasis",
      definition: "The body's ability to maintain stable internal conditions despite external changes.",
      function: "Keeps temperature, blood sugar, fluid balance, and other vital signs in the ideal range for life.",
      location: "Maintained across all organ systems throughout the body",
      relatedTerms: ["Metabolism", "Immune System", "Endocrine System"],
    }],
    sources: ["World Health Organization (WHO)", "NHS Health A-Z"],
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

  // Validate key format — Gemini API keys start with "AIza"
  if (!apiKey || !apiKey.startsWith("AIza")) {
    console.warn(
      apiKey
        ? `[WellUP] GEMINI_API_KEY looks invalid (should start with "AIza"). Got: ${apiKey.slice(0, 6)}...`
        : "[WellUP] GEMINI_API_KEY is not set."
    );
    const fallback = buildFallback(message, language);
    return {
      ...fallback,
      apiKeyWarning: !apiKey
        ? "GEMINI_API_KEY not set"
        : "API key format invalid — must start with 'AIza'. Get a key at aistudio.google.com",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const candidates = ["gemini-1.5-flash", "gemini-1.5-pro"];
    let rawResponse = "";
    let activeModel = "gemini-1.5-flash";

    let systemPrompt = SYSTEM_PROMPT;
    if (userHealthContext) systemPrompt += `\n\nUSER HEALTH CONTEXT (use when relevant):\n${userHealthContext}`;
    if (explainSimply) systemPrompt += "\n\nEXPLAIN SIMPLY MODE: Use everyday analogies for a 14-16 year old. No clinical jargon.";

    const langPrefix = language === "hi" ? "Respond in Hindi (Devanagari). " :
                       language === "gu" ? "Respond in Gujarati script. " : "";
    const prompt = `${langPrefix}${message}`;

    for (const modelName of candidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
          generationConfig: { temperature: 0.3, maxOutputTokens: 1400 },
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
        console.warn(`[WellUP] Model ${modelName} failed: ${e?.message}`);
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
      sources: ["World Health Organization (WHO)", "National Health Services (NHS)"],
      isEmergency,
      modelUsed: activeModel,
    };
  } catch (err: any) {
    console.error("[WellUP] Gemini call failed:", err?.message);
    return buildFallback(message, language);
  }
}
