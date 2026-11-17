/** WHOOP summary as returned by the private `whoop` server function (no tokens, ever). */
export interface WhoopSummary {
  connected: boolean;
  recovery?: {
    at: string | null;
    score: number | null;
    hrv: number | null;
    restingHr: number | null;
  }[];
  sleep?: {
    start: string | null;
    end: string | null;
    performance: number | null;
    hoursAsleep: number | null;
  }[];
  strain?: { start: string | null; strain: number | null }[];
  unavailable?: string[];
  fetchedAt?: string;
}

export type RecoveryBand = "low" | "steady" | "high";

/** Local calendar day of an ISO timestamp, in the phone's time zone. */
export function localDay(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** WHOOP's own bands: 0–33 low, 34–66 steady, 67–100 high. */
export function band(score: number): RecoveryBand {
  return score < 34 ? "low" : score < 67 ? "steady" : "high";
}

export const BAND_WORDS: Record<RecoveryBand, string> = {
  low: "Low recovery",
  steady: "Steady recovery",
  high: "High recovery",
};

/**
 * Today's picture, using only data WHOOP has actually scored for today. Nothing is
 * estimated: if today's recovery isn't in yet, `recovery` is null.
 */
export function whoopToday(s: WhoopSummary | null, today: string) {
  if (!s?.connected) return null;
  const rec = (s.recovery ?? []).find(
    (r) => r.at && r.score !== null && localDay(r.at) === today,
  );
  const sleep = (s.sleep ?? []).find((x) => x.end && localDay(x.end) === today);
  const lastStrain = (s.strain ?? []).find(
    (c) => c.start && c.strain !== null && localDay(c.start) < today,
  );
  return {
    recovery: rec?.score ?? null,
    band: rec?.score != null ? band(rec.score) : null,
    hrv: rec?.hrv ?? null,
    restingHr: rec?.restingHr ?? null,
    sleepHours: sleep?.hoursAsleep ?? null,
    sleepPerformance: sleep?.performance ?? null,
    yesterdayStrain: lastStrain?.strain ?? null,
    /** Offer (never force) a lighter day only on a scored low recovery. */
    suggestLighter: rec?.score != null && band(rec.score) === "low",
  };
}

/** Short spoken-style line, e.g. "Low recovery (28%) · 5.9 h asleep". */
export function whoopLine(t: ReturnType<typeof whoopToday>) {
  if (!t) return "";
  const parts: string[] = [];
  if (t.recovery != null && t.band)
    parts.push(`${BAND_WORDS[t.band]} (${Math.round(t.recovery)}%)`);
  else parts.push("Today's recovery isn't scored yet");
  if (t.sleepHours != null) parts.push(`${t.sleepHours} h asleep`);
  return parts.join(" · ");
}
