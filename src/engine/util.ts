export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

let counter = 0;
export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);

export function capitalize(s: string): string {
  const t = s.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "ar" or "A R" -> "A.R." */
export function normalizeInitials(raw: string): string {
  const letters = raw.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 3);
  return letters ? `${letters.split('').join('.')}.` : '';
}
