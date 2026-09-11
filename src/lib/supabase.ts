import { createClient, User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export interface UserHealthProfile {
  id?: string;
  nickname?: string;
  ageRange?: string;
  language?: string;
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
  storageConsent?: boolean;
  overallHealth?: string;
  sleepHours?: string;
  exerciseFrequency?: string;
  dietPreference?: string;
  goals?: string[];
  recentChats?: Array<{
    role: "user" | "assistant";
    content: string;
    category?: string;
    timestamp?: string;
  }>;
}

/* ─────────────────────────────────────────────────────────────
   AUTH HELPERS
───────────────────────────────────────────────────────────── */
export async function signInWithEmail(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  if (!supabase) return { user: null, error: "Supabase not configured" };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { user: null, error: error.message };
    return { user: data.user, error: null };
  } catch (err: any) {
    return { user: null, error: err?.message || "Sign in failed" };
  }
}

export async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<{ user: User | null; error: string | null }> {
  if (!supabase) return { user: null, error: "Supabase not configured" };
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: displayName || email.split("@")[0],
        },
      },
    });
    if (error) return { user: null, error: error.message };

    // Also ensure a profile record exists in profiles table
    if (data.user) {
      await saveUserProfile(data.user.id, {
        nickname: displayName || email.split("@")[0],
      }, email);
    }

    return { user: data.user, error: null };
  } catch (err: any) {
    return { user: null, error: err?.message || "Sign up failed" };
  }
}

export async function sendMagicLink(email: string): Promise<{ success: boolean; error: string | null }> {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to send magic link" };
  }
}

export async function signOutUser(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error("Sign out error:", e);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   PROFILE PERSISTENCE
───────────────────────────────────────────────────────────── */
export async function fetchUserProfile(userId: string): Promise<UserHealthProfile | null> {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) return null;

    let parsedHealth: Partial<UserHealthProfile> = {};
    if (data.bio) {
      try {
        if (data.bio.startsWith("{") && data.bio.endsWith("}")) {
          parsedHealth = JSON.parse(data.bio);
        }
      } catch {
        // bio is just text
      }
    }

    return {
      id: data.id,
      nickname: data.display_name || parsedHealth.nickname || "Explorer",
      allergies: parsedHealth.allergies || [],
      conditions: parsedHealth.conditions || [],
      medications: parsedHealth.medications || [],
      ageRange: parsedHealth.ageRange || "16-19",
      language: parsedHealth.language || "en",
      overallHealth: parsedHealth.overallHealth,
      sleepHours: parsedHealth.sleepHours,
      exerciseFrequency: parsedHealth.exerciseFrequency,
      dietPreference: parsedHealth.dietPreference,
      goals: parsedHealth.goals || [],
      recentChats: parsedHealth.recentChats || [],
      storageConsent: true,
    };
  } catch (err) {
    console.error("[WellUP] fetchUserProfile error:", err);
    return null;
  }
}

export async function saveUserProfile(
  userId: string,
  profile: Partial<UserHealthProfile>,
  email?: string
): Promise<boolean> {
  if (!supabase || !userId) return false;
  try {
    const existing = await fetchUserProfile(userId);
    const merged: UserHealthProfile = {
      ...existing,
      ...profile,
      id: userId,
    };

    const bioPayload = JSON.stringify({
      nickname: merged.nickname,
      ageRange: merged.ageRange,
      language: merged.language,
      allergies: merged.allergies,
      conditions: merged.conditions,
      medications: merged.medications,
      overallHealth: merged.overallHealth,
      sleepHours: merged.sleepHours,
      exerciseFrequency: merged.exerciseFrequency,
      dietPreference: merged.dietPreference,
      goals: merged.goals,
      recentChats: merged.recentChats?.slice(-30), // keep last 30 messages
    });

    const updatePayload: Record<string, any> = {
      id: userId,
      display_name: merged.nickname || "WellUP User",
      bio: bioPayload,
      updated_at: new Date().toISOString(),
    };
    if (email) updatePayload.email = email;

    const { error } = await supabase.from("profiles").upsert(updatePayload);
    if (error) {
      console.warn("[WellUP] Profile upsert warning:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[WellUP] saveUserProfile error:", err);
    return false;
  }
}

/* ─────────────────────────────────────────────────────────────
   CHAT MESSAGES PERSISTENCE
───────────────────────────────────────────────────────────── */
export async function saveChatMessage(
  userId: string,
  message: { role: "user" | "assistant"; content: string; category?: string; isEmergency?: boolean }
): Promise<void> {
  if (!supabase || !userId) return;

  // 1. Try to insert into dedicated 'messages' table if it exists
  try {
    const { error } = await supabase.from("messages").insert([
      {
        user_id: userId,
        role: message.role,
        content: message.content,
        category: message.category || "General Health",
        is_emergency: message.isEmergency || false,
        created_at: new Date().toISOString(),
      },
    ]);
    if (!error) return;
  } catch {
    // If messages table does not exist, silently proceed to profiles sync
  }

  // 2. Reliable fallback: store in the user's profile record in Supabase
  try {
    const current = await fetchUserProfile(userId);
    const existingChats = current?.recentChats || [];
    const updatedChats = [
      ...existingChats,
      {
        role: message.role,
        content: message.content,
        category: message.category,
        timestamp: new Date().toISOString(),
      },
    ].slice(-40); // store last 40 messages

    await saveUserProfile(userId, { recentChats: updatedChats });
  } catch (e) {
    console.error("[WellUP] Error persisting message in Supabase profile:", e);
  }
}

export async function loadChatMessages(
  userId: string
): Promise<Array<{ id: string; role: "user" | "assistant"; content: string; category?: string; isEmergency?: boolean; timestamp: string }>> {
  if (!supabase || !userId) return [];

  // 1. Try to read from 'messages' table
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        category: row.category,
        isEmergency: row.is_emergency,
        timestamp: row.created_at,
      }));
    }
  } catch {
    // fall through to profile load
  }

  // 2. Read from profile record
  try {
    const profile = await fetchUserProfile(userId);
    if (profile?.recentChats && profile.recentChats.length > 0) {
      return profile.recentChats.map((c, i) => ({
        id: `db-chat-${i}-${Date.now()}`,
        role: c.role,
        content: c.content,
        category: c.category,
        isEmergency: false,
        timestamp: c.timestamp || new Date().toISOString(),
      }));
    }
  } catch (e) {
    console.error("[WellUP] Error reading messages from profile:", e);
  }

  return [];
}
