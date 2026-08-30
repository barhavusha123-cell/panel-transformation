import type { AllNetState } from "./types";

/**
 * מנוע גיבוי מקומי.
 *
 * לאן זה הולך?
 * 1. תמונת מצב (snapshot) נשמרת בזיכרון הדפדפן (localStorage) תחת המפתח
 *    `allnet_backups_v1` — נשמרות עד 8 הגרסאות האחרונות, לשחזור בלחיצה.
 * 2. במקביל נוצר קובץ JSON שיורד לתיקיית ההורדות של המחשב
 *    בשם: allnet-backup-YYYY-MM-DD-HHmm.json
 *
 * הקובץ מכיל את כל נתוני המערכת: משתמשים, פרויקטים, דיווחי שעות,
 * מסמכים מצורפים והגדרות — וניתן לטעון אותו חזרה בכל מחשב.
 */

export const BACKUPS_KEY = "allnet_backups_v1";
export const LAST_AUTO_BACKUP_KEY = "allnet_last_auto_backup_v1";
export const AUTO_BACKUP_INTERVAL_DAYS = 7;
export const MAX_SNAPSHOTS = 8;
export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: "AllNet Ops";
  version: number;
  createdAt: string;
  state: AllNetState;
}

export interface Snapshot {
  id: string;
  createdAt: string;
  kind: "auto" | "manual";
  size: number;
  state: AllNetState;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function backupFileName(d = new Date()) {
  return `allnet-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
}

export function buildBackup(state: AllNetState): BackupFile {
  return {
    app: "AllNet Ops",
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    state,
  };
}

function download(content: string, name: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** ייצוא קובץ גיבוי JSON לתיקיית ההורדות */
export function downloadBackupFile(state: AllNetState) {
  const payload = JSON.stringify(buildBackup(state), null, 2);
  download(payload, backupFileName(), "application/json;charset=utf-8");
  return payload.length;
}

/** ייצוא דיווחי השעות לקובץ CSV (נפתח באקסל) */
export function downloadHoursCsv(state: AllNetState) {
  const head = [
    "תאריך",
    "פרויקט",
    "מדווח",
    "תפקיד",
    "משעה",
    "עד שעה",
    "שעות",
    "מספר עובדים",
    "שמות עובדים",
    "תיאור",
    "חריגים",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = state.hours.map((h) =>
    [
      h.date,
      h.project,
      h.reporter,
      h.role,
      h.from,
      h.to,
      h.decimal,
      h.workers ?? "",
      h.workerNames ?? "",
      h.notes,
      h.extras,
    ]
      .map(esc)
      .join(","),
  );
  const csv = "\uFEFF" + [head.map(esc).join(","), ...rows].join("\r\n");
  download(csv, backupFileName().replace(/\.json$/, ".csv"), "text/csv;charset=utf-8");
}

export function listSnapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(BACKUPS_KEY);
    return raw ? (JSON.parse(raw) as Snapshot[]) : [];
  } catch {
    return [];
  }
}

export function saveSnapshot(state: AllNetState, kind: "auto" | "manual"): Snapshot | null {
  try {
    const serialized = JSON.stringify(state);
    const snap: Snapshot = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      kind,
      size: serialized.length,
      state: JSON.parse(serialized) as AllNetState,
    };
    const next = [snap, ...listSnapshots()].slice(0, MAX_SNAPSHOTS);
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(next));
    return snap;
  } catch {
    return null;
  }
}

export function deleteSnapshot(id: string) {
  localStorage.setItem(
    BACKUPS_KEY,
    JSON.stringify(listSnapshots().filter((s) => s.id !== id)),
  );
}

export function lastAutoBackupAt(): number {
  const raw = localStorage.getItem(LAST_AUTO_BACKUP_KEY);
  return raw ? Number(raw) || 0 : 0;
}

export function markAutoBackup(ts = Date.now()) {
  localStorage.setItem(LAST_AUTO_BACKUP_KEY, String(ts));
}

export function isAutoBackupDue() {
  const last = lastAutoBackupAt();
  if (!last) return true;
  return Date.now() - last > AUTO_BACKUP_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
}

/** קריאת קובץ גיבוי שנבחר ידנית ואימות המבנה שלו */
export async function readBackupFile(file: File): Promise<AllNetState> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<BackupFile> & Partial<AllNetState>;
  const state = (parsed.state ?? parsed) as AllNetState;
  if (!state || !Array.isArray(state.users) || !Array.isArray(state.projects)) {
    throw new Error("קובץ הגיבוי אינו תקין");
  }
  return {
    users: state.users ?? [],
    projects: state.projects ?? [],
    hours: state.hours ?? [],
    files: state.files ?? [],
    serviceCalls: state.serviceCalls ?? [],
    adminPassword: state.adminPassword ?? "admin123",
    adminEmail: state.adminEmail ?? "",
  };
}
