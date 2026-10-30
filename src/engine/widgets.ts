/** What each home-screen widget shows, worked out from AppData and the clock. No UI here. */
import { dayName, fmtTime } from './dates';
import { hatName } from './hats';
import { queue, winsOn } from './plan';
import { currentBlock, isTeaching, minutesLeft, nextFree, sectionNow } from './schedule';
import type { AppData, HatId } from './types';

export interface NowView {
  mode: 'task' | 'class' | 'meeting' | 'clear';
  /** Small line top right: "RBR · 41 min free", "until 11:20", "Thursday". */
  status: string;
  title: string;
  hat?: HatId;
  /** Under the title: "SPED · 10 min" */
  meta?: string;
  taskId?: string;
  focusMin?: number;
  /** In class: what's waiting for the next free block. */
  waiting?: string;
  wins: number;
}

export function nowView(data: AppData, today: string, nowMin: number): NowView {
  const s = data.settings;
  const wins = winsOn(data, today).length;
  const task = queue(data, today, nowMin)[0] ?? null;
  const block = currentBlock(s, today, nowMin);
  if (block && isTeaching(block)) {
    const free = nextFree(s, today, nowMin);
    const when = free ? `${free.label.split(' · ')[0]} at ${fmtTime(free.start)}` : 'After school';
    return { mode: 'class', status: `until ${fmtTime(block.end)}`, title: block.label, waiting: task ? `${when}: ${task.title}` : undefined, wins };
  }
  if (block && block.kind === 'meeting') {
    return { mode: 'meeting', status: `until ${fmtTime(block.end)}`, title: block.label, waiting: 'Tap to catch an action item', wins };
  }
  if (!task) {
    return { mode: 'clear', status: wins ? `${wins} ${wins === 1 ? 'win' : 'wins'} today` : dayName(today), title: 'All clear.', wins };
  }
  const free = block?.kind === 'free' ? block : null;
  const left = free ? minutesLeft(free, nowMin) : null;
  const bits = [hatName(task.hat)];
  if (task.time) bits.push(fmtTime(task.time));
  bits.push(`${task.minutes} min`);
  return {
    mode: 'task',
    status: free && left != null ? `${free.label.split(' · ')[0]} · ${left} min free` : wins ? `${wins} ${wins === 1 ? 'win' : 'wins'} today` : dayName(today),
    title: task.title,
    hat: task.hat,
    meta: bits.join(' · '),
    taskId: task.id,
    focusMin: left != null ? Math.max(5, Math.min(task.minutes, left)) : task.minutes,
    wins,
  };
}

export interface LogStudent {
  id: string;
  initials: string;
  count: number;
  /** Trials goals open the app to pick "x of n"; tally goals log right from the widget. */
  trials: boolean;
}

export interface LogView {
  header: string;
  sub: string;
  students: LogStudent[];
  /** What the widget says when there's nobody to show. */
  empty?: string;
}

/** The class in front of you first; otherwise your whole caseload. */
export function logView(data: AppData, today: string, nowMin: number, max = 6): LogView {
  const section = sectionNow(data.settings, today, nowMin);
  // Only students with a goal to log; 504s with accommodations only have nothing to tap.
  const loggable = data.students.filter(st => st.goals.length);
  const inClass = section ? loggable.filter(st => st.period.toUpperCase() === section.toUpperCase()) : [];
  const list = (inClass.length ? inClass : [...loggable].sort((a, b) => a.period.localeCompare(b.period, undefined, { numeric: true }) || a.initials.localeCompare(b.initials))).slice(0, max);
  const total = data.students.reduce((n, st) => n + st.points.filter(p => p.date === today).length, 0);
  if (!data.students.length) return { header: 'Caseload', sub: 'Add students in Hats', students: [], empty: 'Add students by initials in Hats → Caseload.' };
  if (!loggable.length) return { header: 'Caseload', sub: `${data.students.length} students`, students: [], empty: 'Add an IEP goal in Hats to log data from here.' };
  return {
    header: inClass.length ? `${section} · in class` : 'Caseload',
    sub: `${total} logged today`,
    students: list.map(st => ({
      id: st.id,
      initials: st.initials,
      count: st.points.filter(p => p.date === today).length,
      trials: st.goals[0]?.kind === 'trials',
    })),
  };
}
