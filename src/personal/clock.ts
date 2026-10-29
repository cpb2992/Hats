/** "5:45 pm", "5:45pm", "545pm", "17:45", "6 pm" -> "HH:MM" (24h), or null. */
export function parseClock(input: string): string | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, "").replace(/\./g, "");
  const m = /^(\d{1,2})(?::?(\d{2}))?(am|pm|a|p)?$/.exec(s);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ap = m[3]?.[0];
  if (min > 59 || h > 23) return null;
  if (ap) {
    if (h < 1 || h > 12) return null;
    if (ap === "p" && h !== 12) h += 12;
    if (ap === "a" && h === 12) h = 0;
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
