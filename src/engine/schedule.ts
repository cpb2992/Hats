/** The school-day bell schedule: what's happening in each block, and where the free time is. */
import { addDays, fmtTime, minutesOf, weekday } from './dates';
import type { Block, BlockKind, Settings } from './types';

const b = (start: string, end: string, label: string, kind: BlockKind, section?: string): Block => ({
  id: `${start}-${label}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
  start, end, label, kind, ...(section ? { section } : {}),
});

/** Teaching blocks keep tasks waiting; free blocks are when Hats hands you the next thing. */
export const TEACHING: BlockKind[] = ['class', 'boost', 'advisory', 'homeroom'];

/**
 * A common middle/high school day to start from: homeroom, six periods, a planning period and lunch.
 * Everyone edits it to their own bells in Settings → Bell schedule.
 */
function typicalDay(): Block[] {
  return [
    b('07:45', '08:00', 'Homeroom', 'homeroom'),
    b('08:00', '08:50', 'P1', 'class', 'P1'),
    b('08:54', '09:44', 'P2', 'class', 'P2'),
    b('09:48', '10:38', 'P3', 'class', 'P3'),
    b('10:42', '11:32', 'Planning', 'free'),
    b('11:36', '12:06', 'Lunch', 'break'),
    b('12:10', '13:00', 'P4', 'class', 'P4'),
    b('13:04', '13:54', 'P5', 'class', 'P5'),
    b('13:58', '14:48', 'P6', 'class', 'P6'),
    b('14:48', '14:55', 'Dismissal', 'break'),
  ];
}

/** Weekly blocks keyed by weekday (1 = Monday ... 5 = Friday). */
export function defaultSchedule(): Record<string, Block[]> {
  return { '1': typicalDay(), '2': typicalDay(), '3': typicalDay(), '4': typicalDay(), '5': typicalDay() };
}

export function blocksFor(s: Settings, date: string): Block[] {
  if (!s.workdays.includes(weekday(date))) return [];
  return [...(s.schedule[String(weekday(date))] ?? [])].sort((a, c) => minutesOf(a.start) - minutesOf(c.start));
}

export function currentBlock(s: Settings, date: string, nowMin: number): Block | null {
  return blocksFor(s, date).find(x => minutesOf(x.start) <= nowMin && nowMin < minutesOf(x.end)) ?? null;
}

export const isTeaching = (blk: Block | null) => !!blk && TEACHING.includes(blk.kind);
export const blockMinutes = (blk: Block) => minutesOf(blk.end) - minutesOf(blk.start);
export const minutesLeft = (blk: Block, nowMin: number) => Math.max(0, minutesOf(blk.end) - nowMin);

export function nextFree(s: Settings, date: string, nowMin: number): Block | null {
  return blocksFor(s, date).find(x => x.kind === 'free' && minutesOf(x.start) > nowMin) ?? null;
}

export function freeBlocks(s: Settings, date: string): Block[] {
  return blocksFor(s, date).filter(x => x.kind === 'free');
}

/** The open stretches of a school day: free blocks, plus before the first bell and after dismissal until shutdown. */
export function openTime(s: Settings, date: string): { label: string; minutes: number }[] {
  const blocks = blocksFor(s, date);
  if (!blocks.length) return [];
  const out: { label: string; minutes: number }[] = [];
  const before = minutesOf(blocks[0].start) - minutesOf(s.schoolStart);
  if (before >= 10) out.push({ label: `Before ${fmtTime(blocks[0].start)}`, minutes: before });
  for (const x of blocks) if (x.kind === 'free') out.push({ label: x.label.split(' · ')[0], minutes: blockMinutes(x) });
  const after = minutesOf(s.shutdown) - minutesOf(blocks[blocks.length - 1].end);
  if (after >= 10) out.push({ label: `After ${fmtTime(blocks[blocks.length - 1].end)}`, minutes: after });
  return out;
}

/** Class sections taught across the week, e.g. 7A–7D. */
export function sections(s: Settings): string[] {
  const set = new Set<string>();
  for (const list of Object.values(s.schedule)) for (const x of list) if (x.section) set.add(x.section);
  return [...set].sort();
}

/** The section in front of you right now, if any. */
export function sectionNow(s: Settings, date: string, nowMin: number): string | null {
  return currentBlock(s, date, nowMin)?.section ?? null;
}

/** The next Boost block for a section, searching up to two weeks ahead. */
export function nextBoost(s: Settings, section: string, date: string, nowMin: number): { date: string; block: Block } | null {
  for (let i = 0; i < 14; i++) {
    const d = addDays(date, i);
    const hit = blocksFor(s, d).find(x => x.kind === 'boost' && x.section === section && (i > 0 || minutesOf(x.start) > nowMin));
    if (hit) return { date: d, block: hit };
  }
  return null;
}
