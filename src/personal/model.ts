export type PersonalHat =
  "husband" | "dad" | "pets" | "home" | "friends" | "myself";
export const HATS = {
  husband: {
    name: "Husband",
    icon: "heart",
    color: "#B45C43",
    subtitle: "Notice. Connect. Follow through.",
  },
  dad: {
    name: "Dad",
    icon: "people",
    color: "#3D65A2",
    subtitle: "More little moments together.",
  },
  pets: {
    name: "Pets",
    icon: "star",
    color: "#95713C",
    subtitle: "Care that stays on your radar.",
  },
  home: {
    name: "Home",
    icon: "home",
    color: "#56739B",
    subtitle: "From noticing to putting away.",
  },
  friends: {
    name: "Friends & family",
    icon: "groups",
    color: "#8C668C",
    subtitle: "Keep your people close.",
  },
  myself: {
    name: "Myself",
    icon: "gym",
    color: "#496A8B",
    subtitle: "Health, money, music, and rest.",
  },
} as const;
export const HAT_IDS = Object.keys(HATS) as PersonalHat[];
export interface Step {
  title: string;
  done: boolean;
}
export interface PersonalTask {
  id: string;
  title: string;
  hat: PersonalHat;
  date: string;
  time: string | null;
  minutes: number;
  essential: boolean;
  fixed: boolean;
  doneAt: string | null;
  steps: Step[];
  repeat: "none" | "daily" | "weekly";
  createdAt: string;
  deferred: number;
  reason?: string;
  source?: string;
  note?: string;
}
export interface Person {
  id: string;
  name: string;
  role: "child" | "friend" | "pet";
  interests: string;
  detail: string;
  birthday?: string;
  lastContact?: string;
}
export interface Note {
  id: string;
  hat: PersonalHat;
  kind: "reflection" | "idea" | "gift" | "memory";
  text: string;
  createdAt: string;
  photo?: string;
}
export interface Meal {
  id: string;
  name: string;
  ingredients: string[];
  minutes: number;
  prep: string;
  favorite: boolean;
}
export interface PersonalEvent {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  allDay: boolean;
  source: "hats" | "google";
  externalId?: string;
  location?: string;
  closure?: boolean;
}
export interface DatePlan {
  id: string;
  date: string;
  title: string;
  budget: number;
  childcare: number;
  transport: number;
  steps: Step[];
  note: string;
}
export interface Spending {
  id: string;
  amount: number;
  category: "takeout" | "dates" | "gifts" | "family" | "other";
  title: string;
  date: string;
}
export interface Wish {
  id: string;
  title: string;
  amount: number;
  createdAt: string;
}
export interface Habit {
  id: string;
  title: string;
  hat: PersonalHat;
  frequency: "daily" | "weekly";
  target: number;
  checkins: string[];
}
export interface Preferences {
  name: string;
  partner: string;
  city: string;
  travelMinutes: number;
  dateBudget: number;
  homeTime: string;
  endTime: string;
  weekendStart: string;
  weekendEnd: string;
  unavailableDays: number[];
  gymDays: number[];
  gymStart: string;
  gymMinutes: number;
  notifications: boolean;
  morningReminder: string;
  eveningReminder: string;
  budgets: {
    takeout: number;
    dates: number;
    gifts: number;
    family: number;
    savings: number;
  };
  onboarded: boolean;
  playful?: boolean;
  focusConsent?: boolean;
  distractingPackages?: string[];
}
export interface PersonalData {
  version: 2;
  preferences: Preferences;
  tasks: PersonalTask[];
  people: Person[];
  notes: Note[];
  meals: Meal[];
  pantry: string[];
  groceries: string[];
  dinners: Record<string, string>;
  events: PersonalEvent[];
  dates: DatePlan[];
  spending: Spending[];
  wishes: Wish[];
  lowEnergyDays: string[];
  activities: Record<string, string>;
  finishedActivities: string[];
  protectedUntil: string | null;
  protectedLabel: string;
  updatedAt: string;
  moments?: {
    id: string;
    hat: PersonalHat;
    title: string;
    date: string;
    source: string;
  }[];
  habits?: Habit[];
}
export const id = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export function freshPersonal(): PersonalData {
  return {
    version: 2,
    preferences: {
      name: "",
      partner: "",
      city: "Quincy, MA",
      travelMinutes: 45,
      dateBudget: 150,
      homeTime: "16:45",
      endTime: "22:30",
      weekendStart: "09:00",
      weekendEnd: "22:00",
      unavailableDays: [1, 2, 3, 4, 5],
      gymDays: [],
      gymStart: "20:30",
      gymMinutes: 60,
      notifications: false,
      morningReminder: "06:35",
      eveningReminder: "16:45",
      budgets: { takeout: 0, dates: 0, gifts: 0, family: 0, savings: 0 },
      onboarded: false,
      playful: true,
    },
    tasks: [],
    people: [],
    notes: [],
    meals: [],
    pantry: [],
    groceries: [],
    dinners: {},
    events: [],
    dates: [],
    spending: [],
    wishes: [],
    lowEnergyDays: [],
    activities: {},
    finishedActivities: [],
    moments: [],
    habits: [],
    protectedUntil: null,
    protectedLabel: "",
    updatedAt: new Date().toISOString(),
  };
}
export function validData(value: unknown): value is PersonalData {
  if (!value || typeof value !== "object") return false;
  const v = value as PersonalData;
  return (
    v.version === 2 &&
    !!v.preferences &&
    typeof v.preferences.name === "string" &&
    typeof v.preferences.partner === "string" &&
    typeof v.preferences.homeTime === "string" &&
    /^\d{2}:\d{2}$/.test(v.preferences.homeTime) &&
    Array.isArray(v.preferences.unavailableDays) &&
    Array.isArray(v.preferences.gymDays) &&
    !!v.preferences.budgets &&
    [
      "tasks",
      "people",
      "notes",
      "meals",
      "pantry",
      "groceries",
      "events",
      "dates",
      "spending",
      "wishes",
      "lowEnergyDays",
      "finishedActivities",
    ].every((k) =>
      Array.isArray((v as unknown as Record<string, unknown>)[k]),
    ) &&
    !!v.dinners &&
    !!v.activities &&
    v.tasks.every(
      (t) =>
        typeof t.id === "string" &&
        HAT_IDS.includes(t.hat) &&
        Array.isArray(t.steps) &&
        typeof t.title === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
        Number.isFinite(t.minutes) &&
        t.minutes > 0,
    )
  );
}
