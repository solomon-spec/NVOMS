"use client";

import { useSyncExternalStore } from "react";

import {
  getStoredSession,
  subscribeStoredSession,
} from "@/shared/auth-storage";

export function useAuthSession() {
  return useSyncExternalStore(
    subscribeStoredSession,
    getStoredSession,
    () => null,
  );
}
