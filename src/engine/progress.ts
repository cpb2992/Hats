/** Progress monitoring for Caseload: checks, summaries, due dates and drafted progress reports. */
import { daysBetween, monthName } from './dates';
import type { Goal, KeyDate, Student } from './types';
import { avg } from './util';

export interface Check {
  date: string;
  value: number;
  outOf: number;
}

/** One check per trial entry, or per day for tally goals. */
export function checks(s: Student, g: Goal): Check[] {
  const pts = s.points.filter(p => p.goalId === g.id).sort((a, b) => a.date.localeCompare(b.date));
  if (g.kind === 'trials') return pts.map(p => ({ date: p.date, value: p.value, outOf: p.outOf ?? g.outOf }));
  const byDay = new Map<string, number>();
  for (const p of pts) byDay.set(p.date, (byDay.get(p.date) ?? 0) + p.value);
  return [...byDay.entries()].map(([date, value]) => ({ date, value, outOf: Math.max(1, g.target) }));
}

export type Trend = 'new' | 'up' | 'flat' | 'down';

export interface Summary {
  n: number;
  baseline: number | null;
  recent: number | null;
  trend: Trend;
  met: boolean;
  first: string | null;
  last: string | null;
}

const ratio = (c: Check) => (c.outOf > 0 ? c.value / c.outOf : 0);

export function summarize(s: Student, g: Goal): Summary {
  const cs = checks(s, g);
  if (!cs.length) return { n: 0, baseline: null, recent: null, trend: 'new', met: false, first: null, last: null };
  const k = Math.min(3, cs.length);
  const baseline = avg(cs.slice(0, k).map(ratio));
  const recent = avg(cs.slice(-k).map(ratio));
  const goalRatio = g.kind === 'trials' ? g.target / Math.max(1, g.outOf) : 1;
  let trend: Trend = 'flat';
  if (cs.length < 4) trend = 'new';
  else if (recent - baseline >= 0.1) trend = 'up';
  else if (baseline - recent >= 0.1) trend = 'down';
  return { n: cs.length, baseline, recent, trend, met: recent >= goalRatio - 1e-9, first: cs[0].date, last: cs[cs.length - 1].date };
}

/** "3 of 5 tries" or "2 times a day" */
export function fmtLevel(g: Goal, r: number): string {
  if (g.kind === 'trials') return `${Math.round(r * g.outOf)} of ${g.outOf} tries`;
  const n = Math.round(r * Math.max(1, g.target) * 10) / 10;
  return `${n} ${n === 1 ? 'time' : 'times'} a day`;
}

export function goalLabel(g: Goal): string {
  return g.kind === 'trials' ? `${g.target} of ${g.outOf}` : `${g.target} a day`;
}

export function draftReport(s: Student, g: Goal): string {
  const sum = summarize(s, g);
  const who = s.initials;
  if (sum.n === 0 || sum.baseline == null || sum.recent == null || !sum.first) {
    return `Not enough data yet for: ${g.text} Log a few checks first, then draft the report.`;
  }
  const lead = {
    up: `${who} is making steady progress toward this goal: ${g.text}`,
    flat: `${who} is holding steady on this goal: ${g.text}`,
    down: `${who}'s recent data on this goal is below baseline: ${g.text}`,
    new: `${who} has started work on this goal: ${g.text}`,
  }[sum.trend];
  const supports = s.accommodations.slice(0, 2).map(a => a.toLowerCase());
  const withSupports = supports.length ? ` with ${supports.join(' and ')}` : '';
  const k = Math.min(3, sum.n);
  const parts = [
    lead.endsWith('.') ? lead : `${lead}.`,
    `At baseline in ${monthName(sum.first)}, ${who} averaged ${fmtLevel(g, sum.baseline)}.`,
    `Across the ${k === 1 ? 'most recent check' : `${k} most recent checks`}, ${who} averaged ${fmtLevel(g, sum.recent)}${withSupports}.`,
  ];
  if (sum.met) parts.push('This meets the goal. Next step: consider raising the target or fading supports.');
  else if (sum.trend === 'up') parts.push('Next step: keep the current supports and continue weekly checks.');
  else parts.push('Next step: adjust supports and review the plan with the team.');
  return parts.join(' ');
}

export interface Due {
  student: Student;
  date: KeyDate;
  days: number;
}

export function comingDue(students: Student[], today: string, withinDays = 120): Due[] {
  const out: Due[] = [];
  for (const s of students) {
    for (const d of s.dates) {
      const days = daysBetween(today, d.date);
      if (days >= 0 && days <= withinDays) out.push({ student: s, date: d, days });
    }
  }
  return out.sort((a, b) => a.days - b.days);
}

export function todayCount(s: Student, today: string): number {
  return s.points.filter(p => p.date === today).length;
}
