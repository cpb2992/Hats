/** Everything Hats stores lives in one AppData object, saved on the phone. */

export type HatId = 'teacher' | 'sped' | 'lead' | 'union' | 'mentor' | 'coach' | 'advisor' | 'grad' | 'creative' | 'gig' | 'home' | 'wellness';

export interface Hat {
  id: HatId;
  name: string;
  on: boolean;
}

export interface Task {
  id: string;
  title: string;
  hat: HatId;
  /** The day it belongs to (YYYY-MM-DD). null = anytime, shows today until done. */
  date: string | null;
  /** Clock time (HH:MM, 24h) or null. */
  time: string | null;
  /** Estimated minutes; also the focus timer length. */
  minutes: number;
  /** Caseload initials it relates to, if any. */
  student: string | null;
  done: boolean;
  doneAt: string | null;
  created: string;
  /** Manual order among untimed tasks; lower comes first. */
  order: number;
  /** Set by "Not now"; pushes the task behind others for the rest of that day. */
  deferredAt: string | null;
}

export type GoalKind = 'tally' | 'trials';

export interface Goal {
  id: string;
  text: string;
  /** tally = each +1 is one occurrence; trials = record "x of n". */
  kind: GoalKind;
  /** For trials: tries per check (e.g. 5). */
  outOf: number;
  /** For trials: successes per check that meet the goal (e.g. 4). For tally: occurrences per day. */
  target: number;
}

export interface Point {
  goalId: string;
  date: string;
  value: number;
  outOf?: number;
}

export interface KeyDate {
  id: string;
  label: string;
  date: string;
}

export interface Student {
  id: string;
  initials: string;
  period: string;
  plan: 'IEP' | '504';
  goals: Goal[];
  accommodations: string[];
  dates: KeyDate[];
  points: Point[];
}

export interface Standard {
  id: string;
  code: string;
  text: string;
}

export type Level = 'reteach' | 'practice' | 'extend';

export interface Cycle {
  id: string;
  date: string;
  period: string;
  standardId: string;
  counts: Record<Level, number>;
  moves: Record<Level, string>;
}

export interface Chore {
  id: string;
  label: string;
  /** 0 = Sunday ... 6 = Saturday */
  days: number[];
  kind: 'laundry' | 'bath' | 'other';
  /** HH:MM it lands in the day; empty means Hats picks from your schedule. */
  time?: string;
}

export type KidColor = 'rose' | 'teal' | 'plum' | 'ochre';

export interface Kid {
  id: string;
  name: string;
  color: KidColor;
}

export type KidIcon = 'backpack' | 'bowl' | 'tooth' | 'shirt' | 'book' | 'bath' | 'moon' | 'star';

export interface KidStep {
  id: string;
  label: string;
  icon: KidIcon;
}

export interface KidsBoard {
  /** The night the "done" marks belong to; they clear on a new day. */
  date: string;
  done: Record<string, string[]>;
  stars: number;
  goal: number;
  reward: string;
}

export interface DayLog {
  date: string;
  recovery: number | null;
  three: string[];
  planned: boolean;
  shutdown: boolean;
  /** Tonight's dinner has been moved to the fridge. */
  thawed?: boolean;
  /** Weekly-rhythm items already turned into today's tasks (so a deleted one doesn't come back). */
  chores?: string[];
}

export interface FocusSession {
  taskId: string | null;
  start: string;
  minutes: number;
}

export type BlockKind = 'homeroom' | 'class' | 'boost' | 'advisory' | 'free' | 'meeting' | 'break';

/** One block of the bell schedule. */
export interface Block {
  id: string;
  /** HH:MM */
  start: string;
  end: string;
  label: string;
  kind: BlockKind;
  /** Class section for class and Boost blocks, e.g. "7C". */
  section?: string;
}

export interface Settings {
  name: string;
  onboarded: boolean;
  /** HH:MM */
  morning: string;
  schoolStart: string;
  shutdown: string;
  pickups: string;
  bedtime: string;
  gym: string;
  /** 0 = Sunday ... 6 = Saturday */
  workdays: number[];
  notify: { morning: boolean; shutdown: boolean; tasks: boolean; blocks: boolean; events: boolean };
  /** Bell schedule by weekday: '1' = Monday ... '5' = Friday. */
  schedule: Record<string, Block[]>;
}

export interface AppData {
  v: 1;
  settings: Settings;
  hats: Hat[];
  tasks: Task[];
  students: Student[];
  standards: Standard[];
  cycles: Cycle[];
  meals: string[];
  /** date -> meal planned for that night */
  dinners: Record<string, string>;
  chores: Chore[];
  /** Hats' own calendar. */
  events: HatsEvent[];
  kids: Kid[];
  routine: KidStep[];
  board: KidsBoard;
  days: Record<string, DayLog>;
  focus: FocusSession[];
}

/** An event on Hats' own calendar. */
export interface HatsEvent {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM, null for all-day */
  start: string | null;
  end: string | null;
  allDay: boolean;
  location: string;
  note: string;
  hat: HatId;
  created: string;
}
