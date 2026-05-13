"use client";

import type { Liff } from "@line/liff";

let liffInstance: Liff | null = null;
let initPromise: Promise<Liff | null> | null = null;

/**
 * Initialize LIFF (LINE Front-end Framework) lazily.
 * Returns null if NEXT_PUBLIC_LIFF_ID is not configured (development / non-LINE env).
 */
export async function initLiff(): Promise<Liff | null> {
  if (typeof window === "undefined") return null;
  if (liffInstance) return liffInstance;
  if (initPromise) return initPromise;

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) return null;

  initPromise = (async () => {
    try {
      const mod = await import("@line/liff");
      const liff = mod.default;
      await liff.init({ liffId });
      liffInstance = liff;
      return liff;
    } catch (err) {
      console.error("LIFF init failed:", err);
      return null;
    }
  })();

  return initPromise;
}

export function getLiff(): Liff | null {
  return liffInstance;
}

export async function isInLineClient(): Promise<boolean> {
  const liff = await initLiff();
  return liff?.isInClient() ?? false;
}

export async function getLineProfile() {
  const liff = await initLiff();
  if (!liff || !liff.isLoggedIn()) return null;
  return liff.getProfile(); // { userId, displayName, pictureUrl, statusMessage }
}

export async function lineLogin(redirectUri?: string) {
  const liff = await initLiff();
  if (!liff) {
    throw new Error("LIFF is not configured");
  }
  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: redirectUri ?? window.location.href });
  }
}

export async function lineLogout() {
  const liff = await initLiff();
  liff?.logout();
}
