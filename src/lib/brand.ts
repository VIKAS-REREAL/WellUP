export const BRAND = {
  name: "WellUP",
  shortName: "WellUP",
  tagline: "Ask health questions without feeling awkward.",
  subtitle: "Private, clear, and youth-friendly health education. Not a doctor — but a trusted guide.",
  sdgGoal: "SDG 3 — Good Health & Well-being",
  emergencyNumber: "112 / 108",
};

export interface HealthCategory {
  id: string;
  name: string;
  emoji: string;
  questions: string[];
}

export const HEALTH_CATEGORIES: HealthCategory[] = [
  {
    id: "menstrual",
    name: "Menstrual Health",
    emoji: "🩸",
    questions: [
      "Why do periods hurt and what causes cramps?",
      "What is the uterus and what does it do?",
      "Is it safe to exercise during my period?",
    ],
  },
  {
    id: "puberty",
    name: "Body & Puberty",
    emoji: "🌱",
    questions: [
      "What changes happen during puberty?",
      "Why do teenagers get acne and how can I manage it?",
      "Is it normal for my voice to change?",
    ],
  },
  {
    id: "allergies",
    name: "Allergies",
    emoji: "🤧",
    questions: [
      "I have itching and a rash — what could it mean?",
      "What are the most common allergy triggers?",
      "How do I know if I'm allergic to a food?",
    ],
  },
  {
    id: "nutrition",
    name: "Nutrition",
    emoji: "🥗",
    questions: [
      "I have trouble eating vegetables — how can I improve that?",
      "How much water should a teenager drink daily?",
      "What foods help reduce inflammation?",
    ],
  },
  {
    id: "mental",
    name: "Mental Well-being",
    emoji: "🧠",
    questions: [
      "How can I manage exam stress and anxiety?",
      "How many hours of sleep does a teenager need?",
      "What is burnout and how do I recognise it?",
    ],
  },
  {
    id: "general",
    name: "General Health",
    emoji: "💊",
    questions: [
      "What does inflammation mean in simple words?",
      "Is it true that you shouldn't exercise during your period?",
      "Can you tell me whether a medicine is right for me?",
    ],
  },
];

export const STARTER_QUESTIONS = [
  "Why do periods hurt?",
  "What changes happen during puberty?",
  "I have trouble eating vegetables — how can I fix that?",
  "What does inflammation mean?",
  "Is it safe to exercise during my period?",
  "I have itching — what could it mean?",
  "How many hours of sleep do I need?",
  "I don't know what to ask",
];

export const DEMO_QUESTIONS = [
  "What happens during puberty?",
  "Why do periods hurt?",
  "What is the uterus?",
  "I have itching. What could it mean?",
  "I think I am allergic to something. What should I do?",
  "Is it true that you shouldn't exercise during your period?",
  "Can you diagnose me?",
  "I have severe chest pain and difficulty breathing.",
  "What does inflammation mean?",
  "I don't know what to ask",
  "What should I know about menstrual hygiene?",
  "What are common allergy triggers?",
  "Can you tell me whether this medicine is right for me?",
];
