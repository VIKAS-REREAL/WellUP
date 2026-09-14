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

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase not configured" };
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || "Failed to start Google sign-in" };
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

/* ─────────────────────────────────────────────────────────────
   CONVERSATION MANAGEMENT (sidebar history)
───────────────────────────────────────────────────────────── */

export interface ConversationRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export async function getConversations(userId: string): Promise<ConversationRecord[]> {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30);

    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.id,
      title: row.title || "Conversation",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function createConversation(userId: string, firstMessage: string): Promise<string | null> {
  if (!supabase || !userId) return null;
  try {
    // Auto-generate a title from first message (truncate to 50 chars)
    const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "…" : "");
    const { data, error } = await supabase
      .from("conversations")
      .insert([{
        user_id: userId,
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select("id")
      .single();

    if (error || !data) return null;
    return data.id;
  } catch {
    return null;
  }
}

export async function updateConversationTimestamp(conversationId: string): Promise<void> {
  if (!supabase || !conversationId) return;
  try {
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  } catch {}
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  if (!supabase || !conversationId) return false;
  try {
    // Delete messages first, then conversation
    await supabase.from("messages").delete().eq("conversation_id", conversationId);
    const { error } = await supabase.from("conversations").delete().eq("id", conversationId);
    return !error;
  } catch {
    return false;
  }
}

export async function loadConversationMessages(
  conversationId: string
): Promise<Array<{ id: string; role: "user" | "assistant"; content: string; category?: string; isEmergency?: boolean; timestamp: string }>> {
  if (!supabase || !conversationId) return [];
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      category: row.category,
      isEmergency: row.is_emergency,
      timestamp: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function saveChatMessageToConversation(
  conversationId: string,
  userId: string,
  message: { role: "user" | "assistant"; content: string; category?: string; isEmergency?: boolean }
): Promise<void> {
  if (!supabase || !conversationId || !userId) return;
  try {
    await supabase.from("messages").insert([{
      conversation_id: conversationId,
      user_id: userId,
      role: message.role,
      content: message.content,
      category: message.category || "General Health",
      is_emergency: message.isEmergency || false,
      created_at: new Date().toISOString(),
    }]);
    await updateConversationTimestamp(conversationId);
  } catch (e) {
    console.error("[WellUP] saveChatMessageToConversation error:", e);
  }
}

/* ═══════════════════════════════════════════════════════════
   MEDICAL REPORTS & APPOINTMENTS STORAGE
   ═══════════════════════════════════════════════════════════ */

export interface MedicalReportFact {
  label: string;
  value: string;
  category?: "allergy" | "medication" | "vital" | "lab" | "condition" | "general";
}

export interface MedicalReport {
  id: string;
  userId?: string;
  fileName: string;
  filePath?: string;
  fileType?: string;
  fileSize?: number;
  summary: string;
  documentType?: string;
  extractedFacts: MedicalReportFact[];
  appointment?: string;
  hasAppointment?: boolean;
  reportDate?: string;
  createdAt: string;
  suggestedProfileUpdates?: {
    allergies?: string[];
    conditions?: string[];
    medications?: string[];
  };
}

const LOCAL_REPORTS_KEY = "wellup_medical_reports";
const LOCAL_APPOINTMENTS_KEY = "wellup_appointments";

export async function saveMedicalReport(
  report: Omit<MedicalReport, "id" | "createdAt"> & { id?: string; createdAt?: string },
  userId?: string
): Promise<MedicalReport> {
  const newReport: MedicalReport = {
    ...report,
    id: report.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `rep_${Date.now()}`),
    userId: userId || undefined,
    createdAt: report.createdAt || new Date().toISOString(),
  };

  // 1. Always persist in localStorage for instant offline & guest access
  try {
    if (typeof window !== "undefined") {
      const existing: MedicalReport[] = JSON.parse(localStorage.getItem(LOCAL_REPORTS_KEY) || "[]");
      const updated = [newReport, ...existing.filter(r => r.id !== newReport.id)];
      localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn("[WellUP] Could not cache report locally:", e);
  }

  // 2. Persist to Supabase if authenticated
  if (supabase && userId) {
    try {
      const row = {
        user_id: userId,
        file_name: newReport.fileName,
        file_path: newReport.filePath || newReport.fileName,
        summary: newReport.summary,
        extracted_facts: newReport.extractedFacts,
        report_date: newReport.reportDate || null,
        created_at: newReport.createdAt,
      };
      const { data, error } = await supabase.from("reports").insert([row]).select();
      if (!error && data && data[0]) {
        newReport.id = data[0].id;
      }
    } catch (e) {
      console.warn("[WellUP] Supabase report insert fallback:", e);
    }
  }

  return newReport;
}

export async function loadMedicalReports(userId?: string): Promise<MedicalReport[]> {
  let localList: MedicalReport[] = [];
  try {
    if (typeof window !== "undefined") {
      localList = JSON.parse(localStorage.getItem(LOCAL_REPORTS_KEY) || "[]");
    }
  } catch {
    localList = [];
  }

  if (!supabase || !userId) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return localList;

    const dbReports: MedicalReport[] = data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      fileName: row.file_name,
      filePath: row.file_path,
      summary: row.summary,
      extractedFacts: Array.isArray(row.extracted_facts) ? row.extracted_facts : [],
      reportDate: row.report_date,
      createdAt: row.created_at,
    }));

    // Merge DB records with local records avoiding duplicates
    const combined = [...dbReports];
    for (const loc of localList) {
      if (!combined.some(r => r.id === loc.id || r.fileName === loc.fileName)) {
        combined.push(loc);
      }
    }
    return combined;
  } catch {
    return localList;
  }
}

export async function deleteMedicalReport(id: string, userId?: string): Promise<boolean> {
  try {
    if (typeof window !== "undefined") {
      const existing: MedicalReport[] = JSON.parse(localStorage.getItem(LOCAL_REPORTS_KEY) || "[]");
      const updated = existing.filter(r => r.id !== id);
      localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn("[WellUP] Local report delete error:", e);
  }

  if (supabase && userId) {
    try {
      await supabase.from("reports").delete().eq("id", id).eq("user_id", userId);
    } catch (e) {
      console.warn("[WellUP] Supabase report delete error:", e);
    }
  }
  return true;
}

export async function saveAppointmentReminder(
  item: { title: string; appointmentAt?: string; sourceReportId?: string; notes?: string },
  userId?: string
): Promise<any> {
  const record = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `apt_${Date.now()}`,
    userId,
    title: item.title,
    appointmentAt: item.appointmentAt,
    sourceReportId: item.sourceReportId,
    notes: item.notes,
    createdAt: new Date().toISOString(),
  };

  try {
    if (typeof window !== "undefined") {
      const existing = JSON.parse(localStorage.getItem(LOCAL_APPOINTMENTS_KEY) || "[]");
      localStorage.setItem(LOCAL_APPOINTMENTS_KEY, JSON.stringify([record, ...existing]));
    }
  } catch (e) {
    console.warn("[WellUP] Local appointment save error:", e);
  }

  if (supabase && userId) {
    try {
      await supabase.from("appointments").insert([{
        user_id: userId,
        title: item.title,
        appointment_at: item.appointmentAt || null,
        source_report_id: item.sourceReportId || null,
        notes: item.notes || null,
      }]);
    } catch (e) {
      console.warn("[WellUP] Supabase appointment insert error:", e);
    }
  }
  return record;
}

export async function loadAppointments(userId?: string): Promise<any[]> {
  let list: any[] = [];
  try {
    if (typeof window !== "undefined") {
      list = JSON.parse(localStorage.getItem(LOCAL_APPOINTMENTS_KEY) || "[]");
    }
  } catch {
    list = [];
  }
  if (!supabase || !userId) return list;
  try {
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", userId)
      .order("appointment_at", { ascending: true });
    if (data && data.length > 0) return data;
  } catch {}
  return list;
}

