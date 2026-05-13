/**
 * Business day starts at 06:00 JST (= 21:00 UTC previous calendar day).
 * Formula: shift UTC by +3h, floor to midnight, shift back by -3h.
 */
export function getBusinessDayStartUTC(now: Date = new Date()): Date {
  const OFFSET_MS = 3 * 3600 * 1000; // shift so 6am JST aligns to UTC midnight
  const DAY_MS = 86_400_000;
  const dayMs = Math.floor((now.getTime() + OFFSET_MS) / DAY_MS) * DAY_MS;
  return new Date(dayMs - OFFSET_MS);
}

export function getBusinessDayEndUTC(start: Date): Date {
  return new Date(start.getTime() + 86_400_000);
}

/** Format a UTC date as "YYYY/MM/DD (JST)" for display */
export function formatBusinessDate(startUTC: Date): string {
  // Add 9h to get JST, then pick the date at 6am JST = 6h into the business day
  const mid = new Date(startUTC.getTime() + 6 * 3600 * 1000 + 9 * 3600 * 1000);
  const y = mid.getUTCFullYear();
  const m = String(mid.getUTCMonth() + 1).padStart(2, "0");
  const d = String(mid.getUTCDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

/** Returns UTC start for business day N days ago (0 = today) */
export function getBusinessDayOffsetUTC(daysAgo: number, now: Date = new Date()): Date {
  const today = getBusinessDayStartUTC(now);
  return new Date(today.getTime() - daysAgo * 86_400_000);
}
