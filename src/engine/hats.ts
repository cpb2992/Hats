import type { HatId } from './types';

export interface HatDef {
  id: HatId;
  name: string;
  meaning: string;
  color: string;
  /** Line symbol on a 24-point grid. */
  glyph: string;
  /** Words that suggest this hat when capturing. Checked in HAT_ORDER. */
  keywords: string[];
}

export const HATS: Record<HatId, HatDef> = {
  teacher: {
    id: 'teacher', name: 'Teacher', meaning: 'Science', color: '#2F7D6D',
    glyph: 'M9 3h6M10 3v6L4.6 18.4A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.4-2.6L14 9V3M7.2 15h9.6',
    keywords: ['lab', 'lesson', 'exit ticket', 'power moves', 'science fair', 'grade', 'grading', 'class', 'period', 'quiz', 'unit', 'openscied', 'slides', 'copies', 'print', 'micro:bit', 'microbit', 'google classroom', 'homework', 'field trip'],
  },
  sped: {
    id: 'sped', name: 'SPED', meaning: 'Goals and plans', color: '#3E5C9A',
    glyph: 'M3 20h5v-5h5v-5h5V5h3',
    keywords: ['iep', '504', 'progress note', 'progress report', 'accommodation', 'para', 'team meeting', 'eval', 'evaluation meeting', 'sped', 'service', 'goal'],
  },
  dept: {
    id: 'dept', name: 'Dept Head', meaning: 'The team', color: '#7B5A9E',
    glyph: 'M12 3 3 8l9 5 9-5-9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5',
    keywords: ['department', 'science team', 'dept', 'budget', 'supply', 'supplies', 'ilt', 'ipt', 'curriculum map', 'pd', 'staff meeting', 'site council', 'ssc'],
  },
  btu: {
    id: 'btu', name: 'BTU', meaning: 'Rights', color: '#B4573A',
    glyph: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3zM8.5 12l2.5 2.5 4.5-5',
    keywords: ['union', 'btu', 'coverage', 'grievance', 'contract', 'member', 'building rep', 'steward', 'class size'],
  },
  mentor: {
    id: 'mentor', name: 'Mentor', meaning: 'Guidance', color: '#C08F2E',
    glyph: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
    keywords: ['observation', 'mentee', 'practicum', 'feedback', 'cap form', 'coaching', 'mentoring', 'candidate'],
  },
  author: {
    id: 'author', name: 'Author', meaning: 'Stories', color: '#B85C7C',
    glyph: 'M3 5.5c3-1.5 6-1.5 9 0v14c-3-1.5-6-1.5-9 0zM21 5.5c-3-1.5-6-1.5-9 0v14c3-1.5 6-1.5 9 0z',
    keywords: ['misfits', 'book', 'cover', 'illustration', 'manuscript', 'chapter', 'sandy', 'hazel', 'cami', 'bea', 'canva', 'publisher'],
  },
  home: {
    id: 'home', name: 'Home', meaning: 'Family', color: '#6E8F4A',
    glyph: 'M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
    keywords: ['dinner', 'vet', 'ballet', 'laundry', 'bath', 'daycare', 'groceries', 'grocery', 'dentist', 'doctor', 'pickup', 'birthday', 'kids', 'house', 'dog', 'amazon', 'order', 'bill'],
  },
};

/** Order matters: more specific hats win over general ones. */
export const HAT_ORDER: HatId[] = ['sped', 'btu', 'mentor', 'author', 'dept', 'home', 'teacher'];

export const ALL_HATS: HatId[] = ['teacher', 'sped', 'dept', 'btu', 'mentor', 'author', 'home'];

export const hatColor = (id: HatId) => HATS[id].color;
