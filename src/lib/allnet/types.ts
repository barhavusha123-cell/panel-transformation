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

/** סוגי עלויות קבועות לפרויקט */
export const COST_TYPES = ["קבלן", "ציוד", "יעוץ", "אחר"] as const;

/** קטגוריות סיווג לפרויקט שנסגר */
export type ProjectCategory = "warranty" | "service" | "noservice";

export const PROJECT_CATEGORIES: ProjectCategory[] = ["warranty", "service", "noservice"];

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  warranty: "פרויקטים בשנת שירות",
  service: "פרויקטים בהסכם שירות",
  noservice: "פרויקטים לא בשירות",
};

/** טופס סגירת פרויקט — חובה לפני סיווג לקטגוריה */
export interface ProjectClosure {
  /** האם הפרויקט נמסר ללקוח */
  deliveredToClient: boolean;
  /** תאריך מסירת הפרויקט — משמש כתאריך תחילת שירות בשנת השירות */
  deliveryDate?: string;
  /** האם הוכן תיק תיעוד ונשמר בשרתי החברה */
  docFileSaved: boolean;
  /** האם נשלח תיק תיעוד ללקוח */
  docFileSentToClient: boolean;
  /** האם נשאר ציוד באתר */
  equipmentOnSite: boolean;
  /** האם יצאה חשבונית גמר חשבון */
  invoiceIssued: boolean;
  /** פירוט סיבה לכל שאלה שסומנה "לא" (מפתח = שם השדה) */
  reasons?: Partial<Record<"deliveredToClient" | "docFileSaved" | "docFileSentToClient" | "equipmentOnSite" | "invoiceIssued", string>>;
  closedAt: string;
}

export interface FixedCost {
  id: string;
  type: string;
  description: string;
  amount: number;
}


export interface Project {
  name: string;
  /** שם הלקוח */
  client?: string;
  manager: string;
  budget: number;
  team: string[];
  archived: boolean;
  deliveryDate?: string;
  region?: Region;
  /** ימי עבודה קבלן משנה */
  budgetDays?: number;
  /** תוספת שעות עבודה חריגות באישור מנהל */
  extraHours?: number;
  /** סיבת אישור השעות החריגות */
  extraHoursReason?: string;
  /** בכמה נמכר הפרויקט (הכנסה) */
  saleAmount?: number;
  /** עלויות קבועות לפרויקט */
  fixedCosts?: FixedCost[];
  /** קטגוריית סיווג לאחר סגירה */
  category?: ProjectCategory;
  /** נתוני סגירת פרויקט */
  closure?: ProjectClosure;
  /** תאריך ההעברה לקטגוריה הנוכחית (ISO) */
  categorizedAt?: string;
  /** תאריך מסירה בפועל (YYYY-MM-DD) — ניתן לעריכה ידנית */
  handoverDate?: string;
  /** תאריך סיום שירות (YYYY-MM-DD) — ניתן לעריכה ידנית */
  serviceEndDate?: string;

}


/** יעד שעות מנהל פרויקט / עובד אפקטיבי כולל תוספת חריגה מאושרת */
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
export const MAX_BUDGET = Number.MAX_SAFE_INTEGER;

export interface HoursEntry {
  id: number;
  username: string;
  project: string;
  /** שם הלקוח של הפרויקט בעת הדיווח */
  client?: string;
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

/** ===== קריאות שירות ===== */
export type ServiceCallStatus = "new" | "assigned" | "in_progress" | "done";

export const SERVICE_STATUSES: ServiceCallStatus[] = ["new", "assigned", "in_progress", "done"];

export const SERVICE_STATUS_LABELS: Record<ServiceCallStatus, string> = {
  new: "חדשה",
  assigned: "שויכה לטכנאי",
  in_progress: "בטיפול",
  done: "טופלה",
};

export type ServiceCallPriority = "low" | "normal" | "high";

export const SERVICE_PRIORITIES: ServiceCallPriority[] = ["low", "normal", "high"];

export const SERVICE_PRIORITY_LABELS: Record<ServiceCallPriority, string> = {
  low: "נמוכה",
  normal: "רגילה",
  high: "דחופה",
};

export interface ServiceAttachment {
  id: string;
  name: string;
  dataUrl: string;
  isImage: boolean;
}

export interface ServiceUpdate {
  id: string;
  at: string;
  by: string;
  text: string;
  status?: ServiceCallStatus | undefined;
}

export interface ServiceCall {
  id: string;
  /** מספר קריאה רץ לתצוגה */
  number: number;
  client: string;
  project?: string | undefined;
  subject: string;
  description: string;
  priority: ServiceCallPriority;
  /** שם משתמש של הטכנאי המשויך */
  technician?: string | undefined;
  status: ServiceCallStatus;
  createdAt: string;
  /** תאריך סגירת הקריאה (כאשר הסטטוס 'טופלה') */
  closedAt?: string | undefined;
  createdBy: string;
  contact?: string | undefined;
  address?: string | undefined;
  attachments: ServiceAttachment[];
  updates: ServiceUpdate[];
}

export interface AllNetState {
  users: User[];
  projects: Project[];
  hours: HoursEntry[];
  files: FileRecord[];
  serviceCalls: ServiceCall[];
  adminPassword: string;
  adminEmail?: string;
  /** אימות דו-שלבי לכניסת מנהל מערכת */
  admin2fa?: boolean;
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
  serviceCalls: [],
  adminPassword: DEFAULT_ADMIN_PASSWORD,
  adminEmail: "",
  admin2fa: false,
});
