import type { Hat, HatId } from './types';

export interface HatDef {
  id: HatId;
  name: string;
  meaning: string;
  color: string;
  /** Line symbol on a 24-point grid. */
  glyph: string;
  /** Words that suggest this hat when capturing. Checked in HAT_ORDER. */
  keywords: string[];
  /** Work hats fill the working day; the rest fill the time before and after it. */
  school: boolean;
  /** Where it shows in the picker. */
  group: 'work' | 'school' | 'life';
}

/** Every hat someone can wear. People pick the ones that fit at first launch and can rename them. */
export const HATS: Record<HatId, HatDef> = {
  /* ---- Work ---- */
  work: {
    id: 'work', name: 'Work', meaning: 'Your job', color: '#4A6FA5', school: true, group: 'work',
    glyph: 'M3.5 8h17v11h-17zM9 8V5.5h6V8M3.5 13h17M12 12v2',
    keywords: ['email', 'meeting', 'report', 'deadline', 'presentation', 'slides', 'boss', 'manager', 'client', 'project', 'proposal', 'spreadsheet', 'slack', 'timesheet', 'shift', 'office', 'standup', 'one on one', '1:1', 'review'],
  },
  lead: {
    id: 'lead', name: 'Team lead', meaning: 'People and projects', color: '#7B5A9E', school: true, group: 'work',
    glyph: 'M12 3 3 8l9 5 9-5-9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5',
    keywords: ['department', 'dept', 'my team', 'team agenda', 'budget', 'supply', 'supplies', 'hiring', 'interview', 'performance review', 'staff meeting', 'plc', 'ilt', 'site council', 'data meeting', 'schedule the team'],
  },
  mentor: {
    id: 'mentor', name: 'Mentor', meaning: 'Coaching others', color: '#C08F2E', school: true, group: 'work',
    glyph: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
    keywords: ['observation', 'mentee', 'practicum', 'student teacher', 'intern', 'feedback', 'coaching', 'mentoring', 'candidate', 'walkthrough', 'new hire'],
  },
  union: {
    id: 'union', name: 'Union', meaning: 'Rights and members', color: '#B4573A', school: true, group: 'work',
    glyph: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3zM8.5 12l2.5 2.5 4.5-5',
    keywords: ['union', 'coverage', 'grievance', 'contract', 'member', 'building rep', 'steward', 'class size', 'bargaining', 'local'],
  },
  gig: {
    id: 'gig', name: 'Side gig', meaning: 'Business and extra work', color: '#3F8A5C', school: false, group: 'work',
    glyph: 'M12 3v18M16.5 7.5c0-1.9-2-3-4.5-3s-4.5 1.2-4.5 3.2c0 4.3 9 2.3 9 6.8 0 2-2 3.3-4.5 3.3s-4.5-1.2-4.5-3.3',
    keywords: ['tutor', 'tutoring', 'invoice', 'customer', 'etsy', 'shopify', 'listing', 'side gig', 'freelance', 'quote', 'inventory', 'tpt', 'summer school', 'doordash', 'uber'],
  },
  /* ---- School (the teacher pack turns on Caseload, Pulse and the bell schedule) ---- */
  teacher: {
    id: 'teacher', name: 'Teacher', meaning: 'Classes and lessons', color: '#2F7D6D', school: true, group: 'school',
    glyph: 'M4 5h16v10H4zM8 19h8M12 15v4M7.5 9h5M7.5 11.5h3',
    keywords: ['lab', 'lesson', 'exit ticket', 'grade', 'grading', 'class', 'period', 'quiz', 'test', 'unit', 'copies', 'print', 'google classroom', 'homework', 'field trip', 'sub plans', 'seating chart', 'rubric', 'parent email', 'report card', 'bulletin board'],
  },
  sped: {
    id: 'sped', name: 'Special ed', meaning: 'IEPs and goals', color: '#3E5C9A', school: true, group: 'school',
    glyph: 'M3 20h5v-5h5v-5h5V5h3',
    keywords: ['iep', '504', 'progress note', 'progress report', 'accommodation', 'para', 'team meeting', 'eval', 'evaluation meeting', 'sped', 'service', 'goal', 'caseload', 'data point'],
  },
  student: {
    id: 'student', name: 'Student', meaning: 'Classes and exams', color: '#5A6FB0', school: false, group: 'school',
    glyph: 'M2 9.5 12 5l10 4.5L12 14zM6 11.5V16c3.2 2.4 8.8 2.4 12 0v-4.5M22 9.5V15',
    keywords: ['course', 'credits', 'thesis', 'essay', 'paper', 'professor', 'exam', 'midterm', 'final', 'study', 'lecture', 'license', 'licensure', 'certification', 'canvas', 'discussion post', 'assignment', 'syllabus'],
  },
  /* ---- Life ---- */
  parent: {
    id: 'parent', name: 'Parent', meaning: 'Kids and their stuff', color: '#C46A4E', school: false, group: 'life',
    glyph: 'M8 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM16.5 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM4 21v-6.5A4 4 0 0 1 8 10.5a4 4 0 0 1 4 4V21M13 21v-4a3.5 3.5 0 0 1 7 0v4',
    keywords: ['kids', 'daycare', 'pickup', 'drop off', 'dropoff', 'pediatrician', 'playdate', 'babysitter', 'sitter', 'diapers', 'permission slip', 'school lunch', 'ballet', 'soccer', 'swim lessons', 'bath', 'bedtime', 'birthday party', 'teacher conference'],
  },
  caregiver: {
    id: 'caregiver', name: 'Caregiver', meaning: 'Looking after someone', color: '#8E6BA8', school: false, group: 'life',
    glyph: 'M12 20s-6.5-4-6.5-9a3.5 3.5 0 0 1 6.5-1.8A3.5 3.5 0 0 1 18.5 11c0 5-6.5 9-6.5 9zM3 21h18',
    keywords: ['mom', 'dad', 'my mother', 'my father', 'grandma', 'grandpa', 'pharmacy', 'prescription', 'refill', 'appointment for', 'insurance', 'home aide', 'visit mom', 'visit dad'],
  },
  home: {
    id: 'home', name: 'Home', meaning: 'House, errands and bills', color: '#6E8F4A', school: false, group: 'life',
    glyph: 'M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
    keywords: ['dinner', 'vet', 'laundry', 'groceries', 'grocery', 'dentist', 'doctor', 'house', 'dog', 'cat', 'amazon', 'bill', 'rent', 'mortgage', 'car', 'oil change', 'clean', 'trash', 'repair', 'plumber', 'return', 'kids', 'daycare', 'pickup', 'bath', 'birthday'],
  },
  volunteer: {
    id: 'volunteer', name: 'Volunteer', meaning: 'Clubs, boards and causes', color: '#A0604A', school: false, group: 'life',
    glyph: 'M12 3.5l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.1l-5.1 2.8 1.1-5.6-4.2-3.9 5.7-.7z',
    keywords: ['club', 'pta', 'pto', 'board meeting', 'church', 'fundraiser', 'bake sale', 'volunteer', 'committee', 'league', 'scouts', 'food bank', 'yearbook', 'student council'],
  },
  coach: {
    id: 'coach', name: 'Coach', meaning: 'Practices and games', color: '#2E7FA8', school: false, group: 'life',
    glyph: 'M7 4h10v5a5 5 0 0 1-10 0zM7 6H4.5a2.5 2.5 0 0 0 2.6 3M17 6h2.5a2.5 2.5 0 0 1-2.6 3M12 14v3M8.5 21h7M9.5 17h5v4h-5z',
    keywords: ['practice', 'game', 'tournament', 'roster', 'uniforms', 'bus for', 'scrimmage', 'tryouts', 'team parents', 'snack schedule'],
  },
  creative: {
    id: 'creative', name: 'Creative', meaning: 'Writing, art and making', color: '#B85C7C', school: false, group: 'life',
    glyph: 'M3 5.5c3-1.5 6-1.5 9 0v14c-3-1.5-6-1.5-9 0zM21 5.5c-3-1.5-6-1.5-9 0v14c3-1.5 6-1.5 9 0z',
    keywords: ['book', 'cover', 'illustration', 'manuscript', 'chapter', 'draft', 'canva', 'publisher', 'blog', 'podcast', 'painting', 'sketch', 'novel', 'poem', 'song', 'youtube', 'video edit'],
  },
  wellness: {
    id: 'wellness', name: 'Me time', meaning: 'Rest, health and fun', color: '#4F9A94', school: false, group: 'life',
    glyph: 'M12 3a5 5 0 0 0 0 10 5 5 0 0 0 0-10zM5 21c.8-3.8 3.6-6 7-6s6.2 2.2 7 6',
    keywords: ['gym', 'workout', 'run', 'walk', 'yoga', 'meditate', 'therapy', 'haircut', 'nap', 'read for fun', 'friends', 'date night', 'hike'],
  },
};

export const HAT_GROUPS: { id: HatDef['group']; label: string }[] = [
  { id: 'work', label: 'Work' },
  { id: 'school', label: 'School' },
  { id: 'life', label: 'Life' },
];

/** Order matters: more specific hats win over general ones. */
export const HAT_ORDER: HatId[] = ['sped', 'union', 'mentor', 'coach', 'volunteer', 'student', 'gig', 'creative', 'caregiver', 'lead', 'wellness', 'parent', 'home', 'teacher', 'work'];

/** The order hats show in pickers. */
export const ALL_HATS: HatId[] = ['work', 'lead', 'mentor', 'union', 'gig', 'teacher', 'sped', 'student', 'parent', 'caregiver', 'home', 'volunteer', 'coach', 'creative', 'wellness'];

/** What a new install starts with checked; people change it on the first screen. */
export const STARTER_HATS: HatId[] = ['work', 'home', 'wellness'];

/** Hats that fill the working day; the rest fill the time before and after it. */
export const SCHOOL_HATS: HatId[] = ALL_HATS.filter(id => HATS[id].school);

/** The teacher pack: wearing one of these turns on the bell schedule, Caseload and Pulse. */
export const TEACHING_HATS: HatId[] = ['teacher', 'sped'];

export const isHatId = (v: unknown): v is HatId => typeof v === 'string' && (ALL_HATS as string[]).includes(v);

/* The hats this person wears and what they call them. The store keeps this in step with saved data. */
let worn: HatId[] | null = null;
let names: Partial<Record<HatId, string>> = {};

export function setHatPrefs(hats: Hat[]): void {
  worn = hats.filter(h => h.on).map(h => h.id);
  names = {};
  for (const h of hats) if (h.name && h.name.trim() && h.name.trim() !== HATS[h.id].name) names[h.id] = h.name.trim();
}

/** The name this person uses for a hat. */
export const hatName = (id: HatId): string => names[id] ?? HATS[id]?.name ?? 'Hats';

export const hatColor = (id: HatId) => HATS[id].color;

/** Hats to offer in pickers: the ones worn, or all of them before setup. */
export const wornHats = (): HatId[] => (worn && worn.length ? ALL_HATS.filter(id => worn!.includes(id)) : ALL_HATS);

/** A hat to fall back on: the first worn one. */
export const defaultHat = (): HatId => wornHats()[0] ?? 'work';

/** Keyword guess, limited to hats this person wears. */
export function hatFromKeywords(text: string, test: (kw: string) => boolean): HatId | null {
  const allowed = worn && worn.length ? new Set(worn) : null;
  for (const id of HAT_ORDER) {
    if (allowed && !allowed.has(id)) continue;
    if (HATS[id].keywords.some(test)) return id;
  }
  return null;
}

/** Whether this person teaches: school words, the bell schedule, Caseload and Pulse. */
export const teaches = (hats?: Hat[]): boolean =>
  hats ? hats.some(h => h.on && TEACHING_HATS.includes(h.id)) : (worn ?? []).some(id => TEACHING_HATS.includes(id));

/** Words for the working day, so a nurse doesn't see "school" and a teacher doesn't see "work". */
export function dayWords(hats?: Hat[]) {
  const t = teaches(hats);
  return {
    day: t ? 'school' : 'work',
    Day: t ? 'School' : 'Work',
    schedule: t ? 'Bell schedule' : 'Work schedule',
    after: t ? 'After school' : 'After work',
    brain: t ? 'School brain' : 'Work brain',
  };
}
