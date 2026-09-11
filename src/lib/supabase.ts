import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Only initialize Supabase if credentials are provided; otherwise return null to enable 100% private guest mode
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface UserHealthProfile {
  id?: string;
  nickname: string;
  ageRange: string;
  language: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  storageConsent: boolean;
}
