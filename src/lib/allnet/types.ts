export type Role = "מנהל פרויקט בכיר" | "קבלן משנה" | "מנהל פרויקט" | "מנהל מערכת";

export const ROLES: Role[] = [
  "מנהל פרויקט בכיר",
  "קבלן משנה",
  "מנהל פרויקט",
  "מנהל מערכת",
];

export interface User {
  username: string;
  password: string;
  full_name: string;
  role: Role;
  email?: string;
}

export type Region = "צפון" | "דרום" | "מרכז";

export const REGIONS: Region[] = ["צפון", "דרום", "מרכז"];

export interface Project {
  name: string;
  manager: string;
  budget: number;
  team: string[];
  archived: boolean;
  deliveryDate?: string;
  region?: Region;
  /** תקציב ימי עבודה */
  budgetDays?: number;
  /** תוספת שעות עבודה חריגות באישור מנהל */
  extraHours?: number;
}

/** תקציב שעות אפקטיבי כולל תוספת חריגה מאושרת */
export const effectiveBudget = (p?: { budget?: number; extraHours?: number }) =>
  (Number(p?.budget) || 0) + (Number(p?.extraHours) || 0);

/** עלות צוות קבלן משנה (2 עובדים) ליום עבודה, לפי איזור */
export const SUB_CREW_DAY_RATE: Record<Region, number> = {
  צפון: 2200,
  דרום: 2200,
  מרכז: 1800,
};
export const SUB_CREW_SIZE = 2;
export const MAX_SUB_WORKERS = 4;
/** מחירון יום עבודה קבלני לפי מספר עובדים ואיזור */
export const SUB_DAY_RATES: Record<Region, Record<number, number>> = {
  צפון: { 1: 1200, 2: 2200, 3: 2700, 4: 4000 },
  דרום: { 1: 1200, 2: 2200, 3: 2700, 4: 4000 },
  מרכז: { 1: 1000, 2: 1800, 3: 2400, 4: 3200 },
};
export const subDayRate = (region: Region, workers: number): number => {
  const w = Math.min(Math.max(Math.round(workers) || 1, 1), MAX_SUB_WORKERS);
  return SUB_DAY_RATES[region][w] ?? 0;
};
/** עלות עובד חברה ליום עבודה */
export const EMPLOYEE_DAY_RATE = 1200;


export const MIN_BUDGET = 1;
export const MAX_BUDGET = 1000;

export interface HoursEntry {
  id: number;
  username: string;
  project: string;
  reporter: string;
  role: string;
  from: string;
  to: string;
  worked: string;
  minutes: number;
  decimal: number;
  date: string;
  notes: string;
  extras: string;
  workers?: number;
  /** שמות עובדי קבלן המשנה שהיו באתר */
  workerNames?: string;
}

export const MIN_FULL_DAY_MINUTES = 180;

export interface FileRecord {
  id: string;
  name: string;
  dataUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  project: string;
}

export interface AllNetState {
  users: User[];
  projects: Project[];
  hours: HoursEntry[];
  files: FileRecord[];
  adminPassword: string;
  adminEmail?: string;
}

export const MASTER_PASSWORD = "Nhanha3756!";
export const DEFAULT_ADMIN_PASSWORD = "admin123";

export const defaultState = (): AllNetState => ({
  users: [
    {
      username: "user",
      password: "user123",
      full_name: "משתמש מדגם",
      role: "מנהל פרויקט",
    },
  ],
  projects: [],
  hours: [],
  files: [],
  adminPassword: DEFAULT_ADMIN_PASSWORD,
  adminEmail: "",
});
