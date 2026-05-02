import type { AuthSession, AuthTokens } from "@/features/auth/types";

const STORAGE_KEY = "nvoms.auth.session";
const SESSION_EVENT = "nvoms-auth-session-change";

let cachedRawSession: string | null | undefined;
let cachedSession: StoredAuthSession | null = null;

export type StoredAuthSession = AuthSession & {
  savedAt: string;
};

export function getStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRawSession) {
    return cachedSession;
  }

  cachedRawSession = raw;
  if (!raw) {
    cachedSession = null;
    return null;
  }

  try {
    cachedSession = JSON.parse(raw) as StoredAuthSession;
    return cachedSession;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function saveStoredSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...session, savedAt: new Date().toISOString() }),
  );
  notifySessionChange();
}

export function updateStoredTokens(tokens: AuthTokens) {
  const current = getStoredSession();
  if (!current) {
    return;
  }

  saveStoredSession({
    user: { ...current.user, mustChangePassword: false },
    tokens,
  });
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  notifySessionChange();
}

export function subscribeStoredSession(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_EVENT, callback);
  };
}

function notifySessionChange() {
  cachedRawSession = undefined;
  cachedSession = null;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EVENT));
  }
}
