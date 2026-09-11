export interface BrandConfig {
  name: string;
  shortName: string;
  tagline: string;
  subtitle: string;
  sdgGoal: string;
  emergencyNumber: string;
  emergencyNote: string;
}

// Easily switchable branding between WellUP and Carava
export const BRAND: BrandConfig = {
  name: "WellUP",
  shortName: "WellUP",
  tagline: "Understand your health without feeling awkward asking.",
  subtitle: "A private, youth-friendly health awareness assistant built for SDG 3 (Good Health & Well-being).",
  sdgGoal: "SDG 3 — Good Health & Well-being",
  emergencyNumber: "112 / 108",
  emergencyNote: "For acute emergencies (chest pain, severe bleeding, breathing difficulty), call 112 / 108 or go to the nearest emergency room immediately.",
};

export interface HealthCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  sampleQuestions: string[];
}

export const HEALTH_CATEGORIES: HealthCategory[] = [
  {
    id: "puberty",
    name: "Body & Puberty",
    icon: "Sparkles",
    color: "emerald",
    description: "Physical, hormonal, and emotional changes during adolescence.",
    sampleQuestions: [
      "What changes happen during puberty?",
      "Why is my voice cracking?",
      "Is sudden acne normal during teenage years?",
    ],
  },
  {
    id: "menstrual",
    name: "Menstrual Health",
    icon: "HeartPulse",
    color: "rose",
    description: "Periods, cramps, cycle tracking, and menstrual hygiene.",
    sampleQuestions: [
      "Why do periods hurt?",
      "What is the uterus and how does menstruation work?",
      "Is it safe to exercise during periods?",
    ],
  },
  {
    id: "allergies",
    name: "Allergies & Immunity",
    icon: "ShieldAlert",
    color: "amber",
    description: "Histamines, common allergens, symptoms, and when to seek testing.",
    sampleQuestions: [
      "What are common allergy triggers?",
      "I have sudden itching and hives. What could it mean?",
      "How do doctors test for food allergies?",
    ],
  },
  {
    id: "nutrition",
    name: "Nutrition & Lifestyle",
    icon: "Apple",
    color: "teal",
    description: "Balanced diet, hydration, vitamins, and energy levels.",
    sampleQuestions: [
      "Why do I feel tired in the afternoon?",
      "How much water should a teenager drink daily?",
      "What foods help reduce inflammation?",
    ],
  },
  {
    id: "mental",
    name: "Mental Well-being",
    icon: "Smile",
    color: "indigo",
    description: "Exam stress, sleep hygiene, emotional balance, and mindfulness.",
    sampleQuestions: [
      "How can I manage exam anxiety?",
      "Why is 8 hours of sleep important for adolescents?",
      "What is the difference between stress and burnout?",
    ],
  },
  {
    id: "general",
    name: "General Health",
    icon: "Stethoscope",
    color: "sky",
    description: "Everyday health terms, basic biology, and preventative habits.",
    sampleQuestions: [
      "What does inflammation mean in simple words?",
      "Why do we get fevers when sick?",
      "What should I do if I feel dizzy after standing up quickly?",
    ],
  },
];

export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  primaryDark: string;
  accent: string;
  badge: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "theme-green",
    name: "Mint Sage (Default)",
    primary: "#7CBF8A",
    primaryDark: "#2F6B45",
    accent: "#F4A261",
    badge: "bg-emerald-500",
  },
  {
    id: "theme-blue",
    name: "Ocean Breeze",
    primary: "#3B82F6",
    primaryDark: "#1E40AF",
    accent: "#06B6D4",
    badge: "bg-blue-500",
  },
  {
    id: "theme-purple",
    name: "Royal Lavender",
    primary: "#8B5CF6",
    primaryDark: "#5B21B6",
    accent: "#EC4899",
    badge: "bg-purple-500",
  },
];

export const STARTER_QUESTIONS = [
  "What happens during puberty?",
  "Why do periods hurt?",
  "What is the uterus?",
  "Is it true that you shouldn't exercise during your period?",
  "I have itching. What could it mean?",
  "What does inflammation mean?",
  "What should I know about menstrual hygiene?",
  "I don't know what to ask",
];
