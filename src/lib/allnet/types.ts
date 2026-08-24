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
}

export interface Project {
  name: string;
  manager: string;
  budget: number;
  team: string[];
  archived: boolean;
  deliveryDate?: string;
}


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
}

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
});
