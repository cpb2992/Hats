/** Pulse: quick exit-ticket sorts into reteach / practice / extend, saved as monthly evaluation evidence. */
import { fmtShort, monthKey, monthName, schoolMonths } from './dates';
import type { Cycle, Level, Standard } from './types';

export const LEVELS: Level[] = ['reteach', 'practice', 'extend'];

export const LEVEL_NAME: Record<Level, string> = { reteach: 'Reteach', practice: 'Practice', extend: 'Extend' };

export const DEFAULT_MOVES: Record<Level, string> = {
  reteach: 'Back table with the data table and sentence starters.',
  practice: 'Partner CER with the checklist.',
  extend: 'Predict a new case, then defend it.',
};

export const total = (c: Pick<Cycle, 'counts'>) => c.counts.reteach + c.counts.practice + c.counts.extend;

export function evidenceMonths(cycles: Cycle[], today: string): { month: string; saved: number; current: boolean }[] {
  const now = monthKey(today);
  return schoolMonths(today).map(month => ({ month, saved: cycles.filter(c => monthKey(c.date) === month).length, current: month === now }));
}

/** A one-page plain-text summary of a month's cycles, ready to paste into evaluation evidence. */
export function monthSummary(cycles: Cycle[], standards: Standard[], month: string): string {
  const list = cycles.filter(c => monthKey(c.date) === month).sort((a, b) => a.date.localeCompare(b.date));
  const label = monthName(`${month}-01`);
  if (!list.length) return `${label}: no data cycles saved yet.`;
  const std = (id: string) => standards.find(s => s.id === id);
  const lines = [`Data-informed instruction: ${label} ${month.slice(0, 4)}`, ''];
  for (const c of list) {
    const s = std(c.standardId);
    const n = total(c);
    const pct = (k: Level) => (n ? Math.round((c.counts[k] / n) * 100) : 0);
    lines.push(`${fmtShort(c.date)} · Period ${c.period} · ${s ? `${s.code}: ${s.text}` : 'Standard'}`);
    lines.push(`  ${n} exit tickets: ${c.counts.reteach} reteach (${pct('reteach')}%), ${c.counts.practice} practice (${pct('practice')}%), ${c.counts.extend} extend (${pct('extend')}%)`);
    lines.push(`  Reteach: ${c.moves.reteach}`);
    lines.push(`  Practice: ${c.moves.practice}`);
    lines.push(`  Extend: ${c.moves.extend}`);
    lines.push('');
  }
  return lines.join('\n').trim();
}

export function latestCycle(cycles: Cycle[], period: string, standardId: string): Cycle | null {
  const list = cycles.filter(c => c.period === period && c.standardId === standardId).sort((a, b) => b.date.localeCompare(a.date));
  return list[0] ?? null;
}
