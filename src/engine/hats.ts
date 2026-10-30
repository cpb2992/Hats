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
  /** School hats fill the school day; the rest fill the time before and after it. */
  school: boolean;
}

/** Every hat someone can wear. People pick the ones that fit at first launch and can rename them. */
export const HATS: Record<HatId, HatDef> = {
  teacher: {
    id: 'teacher', name: 'Teacher', meaning: 'Classes and lessons', color: '#2F7D6D', school: true,
    glyph: 'M4 5h16v10H4zM8 19h8M12 15v4M7.5 9h5M7.5 11.5h3',
    keywords: ['lab', 'lesson', 'exit ticket', 'grade', 'grading', 'class', 'period', 'quiz', 'test', 'unit', 'slides', 'copies', 'print', 'google classroom', 'homework', 'field trip', 'sub plans', 'seating chart', 'rubric', 'parent email', 'report card', 'bulletin board'],
  },
  sped: {
    id: 'sped', name: 'Special ed', meaning: 'IEPs and goals', color: '#3E5C9A', school: true,
    glyph: 'M3 20h5v-5h5v-5h5V5h3',
    keywords: ['iep', '504', 'progress note', 'progress report', 'accommodation', 'para', 'team meeting', 'eval', 'evaluation meeting', 'sped', 'service', 'goal', 'caseload', 'data point'],
  },
  lead: {
    id: 'lead', name: 'Team lead', meaning: 'Dept or grade team', color: '#7B5A9E', school: true,
    glyph: 'M12 3 3 8l9 5 9-5-9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5',
    keywords: ['department', 'dept', 'grade team', 'team agenda', 'budget', 'supply', 'supplies', 'ilt', 'plc', 'curriculum map', 'pd', 'staff meeting', 'site council', 'data meeting'],
  },
  union: {
    id: 'union', name: 'Union', meaning: 'Rights and members', color: '#B4573A', school: true,
    glyph: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3zM8.5 12l2.5 2.5 4.5-5',
    keywords: ['union', 'coverage', 'grievance', 'contract', 'member', 'building rep', 'steward', 'class size', 'bargaining'],
  },
  mentor: {
    id: 'mentor', name: 'Mentor', meaning: 'New teachers', color: '#C08F2E', school: true,
    glyph: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
    keywords: ['observation', 'mentee', 'practicum', 'student teacher', 'feedback', 'coaching', 'mentoring', 'candidate', 'walkthrough'],
  },
  coach: {
    id: 'coach', name: 'Coach', meaning: 'Practices and games', color: '#2E7FA8', school: true,
    glyph: 'M7 4h10v5a5 5 0 0 1-10 0zM7 6H4.5a2.5 2.5 0 0 0 2.6 3M17 6h2.5a2.5 2.5 0 0 1-2.6 3M12 14v3M8.5 21h7M9.5 17h5v4h-5z',
    keywords: ['practice', 'game', 'tournament', 'roster', 'uniforms', 'bus for', 'scrimmage', 'tryouts', 'team parents', 'meet'],
  },
  advisor: {
    id: 'advisor', name: 'Club advisor', meaning: 'Clubs and events', color: '#A0604A', school: true,
    glyph: 'M12 3.5l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.1l-5.1 2.8 1.1-5.6-4.2-3.9 5.7-.7z',
    keywords: ['club', 'student council', 'yearbook', 'dance', 'fundraiser', 'bake sale', 'spirit week', 'robotics', 'drama'],
  },
  grad: {
    id: 'grad', name: 'Grad school', meaning: 'Courses and license', color: '#5A6FB0', school: false,
    glyph: 'M2 9.5 12 5l10 4.5L12 14zM6 11.5V16c3.2 2.4 8.8 2.4 12 0v-4.5M22 9.5V15',
    keywords: ['course', 'credits', 'thesis', 'paper', 'professor', 'license', 'licensure', 'praxis', 'mtel', 'certification', 'pdp', 'canvas', 'discussion post'],
  },
  creative: {
    id: 'creative', name: 'Creative', meaning: 'Writing and art', color: '#B85C7C', school: false,
    glyph: 'M3 5.5c3-1.5 6-1.5 9 0v14c-3-1.5-6-1.5-9 0zM21 5.5c-3-1.5-6-1.5-9 0v14c3-1.5 6-1.5 9 0z',
    keywords: ['book', 'cover', 'illustration', 'manuscript', 'chapter', 'draft', 'canva', 'publisher', 'blog', 'podcast', 'painting', 'sketch', 'novel', 'poem'],
  },
  gig: {
    id: 'gig', name: 'Side gig', meaning: 'Tutoring, extra work', color: '#3F8A5C', school: false,
    glyph: 'M3.5 8h17v11h-17zM9 8V5.5h6V8M3.5 13h17M12 12v2',
    keywords: ['tutor', 'tutoring', 'client', 'invoice', 'summer school', 'etsy', 'tpt', 'teachers pay teachers', 'shift', 'side gig'],
  },
  home: {
    id: 'home', name: 'Home', meaning: 'Family and house', color: '#6E8F4A', school: false,
    glyph: 'M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
    keywords: ['dinner', 'vet', 'laundry', 'bath', 'daycare', 'groceries', 'grocery', 'dentist', 'doctor', 'pickup', 'birthday', 'kids', 'house', 'dog', 'cat', 'amazon', 'order', 'bill', 'rent', 'mortgage', 'car', 'oil change'],
  },
  wellness: {
    id: 'wellness', name: 'Me time', meaning: 'Rest and fun', color: '#4F9A94', school: false,
    glyph: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
    keywords: ['gym', 'workout', 'run', 'walk', 'yoga', 'meditate', 'therapy', 'haircut', 'nap', 'read for fun', 'friends', 'date night'],
  },
};

/** Order matters: more specific hats win over general ones. */
export const HAT_ORDER: HatId[] = ['sped', 'union', 'mentor', 'coach', 'advisor', 'grad', 'gig', 'creative', 'lead', 'wellness', 'home', 'teacher'];

/** The order hats show in pickers. */
export const ALL_HATS: HatId[] = ['teacher', 'sped', 'lead', 'union', 'mentor', 'coach', 'advisor', 'grad', 'gig', 'creative', 'home', 'wellness'];

/** What a new install starts with checked; people change it on the first screen. */
export const STARTER_HATS: HatId[] = ['teacher', 'home', 'wellness'];

export const SCHOOL_HATS: HatId[] = ALL_HATS.filter(id => HATS[id].school);

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
export const defaultHat = (): HatId => wornHats()[0] ?? 'teacher';

/** Keyword guess, limited to hats this person wears. */
export function hatFromKeywords(text: string, test: (kw: string) => boolean): HatId | null {
  const allowed = worn && worn.length ? new Set(worn) : null;
  for (const id of HAT_ORDER) {
    if (allowed && !allowed.has(id)) continue;
    if (HATS[id].keywords.some(test)) return id;
  }
  return null;
}
