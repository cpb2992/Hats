/** The school-day bell schedule: what's happening in each block, and where the free time is. */
import { addDays, fmtTime, minutesOf, weekday } from './dates';
import type { Block, BlockKind, Settings } from './types';

const b = (start: string, end: string, label: string, kind: BlockKind, section?: string): Block => ({
  id: `${start}-${label}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
  start, end, label, kind, ...(section ? { section } : {}),
});

/** Teaching blocks keep tasks waiting; free blocks are when Hats hands you the next thing. */
export const TEACHING: BlockKind[] = ['class', 'boost', 'advisory', 'homeroom'];

function day(p2: string, p3: string, p4: Block, p5top: Block, p6: string, p7: string, p1: Block): Block[] {
  return [
    b('08:15', '08:35', 'Homeroom', 'homeroom'),
    p1,
    b('09:31', '10:24', p2, 'class', p2),
    b('10:27', '11:20', p3, 'class', p3),
    p4,
    p5top,
    b('12:45', '13:12', 'Lunch', 'break'),
    b('13:15', '14:08', p6, 'class', p6),
    b('14:11', '15:05', p7, 'class', p7),
    b('15:05', '15:10', 'Dismissal', 'break'),
  ];
}

const prep = b('08:35', '09:28', 'Specialty · prep', 'free');
const cpt = b('08:35', '09:28', 'CPT · science dept', 'meeting');
const rbr = b('11:23', '12:16', 'RBR · off', 'free');
const boost = (s: string) => b('11:23', '12:16', `${s} Boost`, 'boost', s);
const recess = b('12:19', '12:45', 'Recess', 'break');
const advisory = b('12:19', '12:45', 'Advisory', 'advisory');

/** Weekly blocks keyed by weekday (1 = Monday ... 5 = Friday). Period 5 is split in half for recess or advisory, then lunch. */
export function defaultSchedule(): Record<string, Block[]> {
  return {
    '1': day('7A', '7C', rbr, recess, '7B', '7D', prep),
    '2': day('7B', '7D', boost('7B'), advisory, '7A', '7C', prep),
    '3': day('7A', '7C', boost('7A'), recess, '7B', '7D', prep),
    '4': day('7B', '7D', rbr, advisory, '7A', '7C', cpt),
    '5': day('7A', '7C', boost('7C'), recess, '7B', '7D', prep),
  };
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
