/**
 * WellUP User Profile & Identity Helpers
 * Extracts clean display names and avatars from user email / profile metadata
 */

export interface UserDisplayInfo {
  displayName: string;
  initials: string;
  avatarUrl: string;
}

export function extractUserDisplayInfo(email?: string | null, nickname?: string | null): UserDisplayInfo {
  // 1. If explicit valid nickname is saved in profile, use it
  if (nickname && nickname.trim() && !["user", "guest", "anonymous"].includes(nickname.toLowerCase().trim())) {
    const cleanNick = nickname.trim();
    const initials = cleanNick
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return {
      displayName: cleanNick,
      initials: initials || cleanNick.slice(0, 2).toUpperCase(),
      avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(cleanNick)}&backgroundColor=059669`,
    };
  }

  // 2. Parse from email address
  if (email && email.includes("@")) {
    const handle = email.split("@")[0].toLowerCase();

    // Strip common spam / noise wrappers like 'mailfor', 'iam', 'spam', numbers
    // e.g. 'mailforvikasspam' -> 'vikas'
    let cleaned = handle
      .replace(/^(?:mailfor|iam|the|its|hey|contact|hello|official)[._\-]?/i, "")
      .replace(/[._\-]?(?:spam|temp|test|official|work|dev|\d+)$/i, "");

    // If stripping removed too much, revert to handle without numbers
    if (cleaned.length < 2) {
      cleaned = handle.replace(/\d+/g, "");
    }

    // Split words by dots, underscores, dashes
    const words = (cleaned || handle)
      .replace(/[^a-zA-Z]/g, " ")
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);

    if (words.length > 0) {
      const formatted = words
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

      const initials = words
        .map((w) => w[0].toUpperCase())
        .slice(0, 2)
        .join("");

      return {
        displayName: formatted || "Vikas",
        initials: initials || "V",
        avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(formatted || "Vikas")}&backgroundColor=059669`,
      };
    }
  }

  // Default fallback for user
  return {
    displayName: "Vikas",
    initials: "V",
    avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=Vikas&backgroundColor=059669`,
  };
}
