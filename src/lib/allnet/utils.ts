import {
  EMPLOYEE_DAY_RATE,
  EMPLOYEE_FULL_DAY_MINUTES,
  EMPLOYEE_HOUR_RATE,
  MIN_FULL_DAY_MINUTES,
  SUB_CREW_SIZE,
  subDayRate,
  type AllNetState,
  type HoursEntry,
} from "./types";

export interface EmployeeDayCost {
  key: string;
  reporter: string;
  date: string;
  minutes: number;
  hours: number;
  fullDay: boolean;
  cost: number;
}

/**
 * חישוב עלות עובדי חברה — כל תאריך מחושב בנפרד:
 * 5 שעות ומעלה ביום = יום עבודה מלא (1,200 ₪),
 * פחות מ-5 שעות = חישוב שעתי (180 ₪ לשעה).
 */
export function employeeDayCosts(entries: HoursEntry[]): EmployeeDayCost[] {
  const map = new Map<string, { reporter: string; date: string; minutes: number }>();
  for (const h of entries) {
    const key = `${h.reporter}|${h.date}`;
    const cur = map.get(key);
    if (cur) cur.minutes += h.minutes;
    else map.set(key, { reporter: h.reporter, date: h.date, minutes: h.minutes });
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => {
      const hours = Math.round((v.minutes / 60) * 100) / 100;
      const fullDay = v.minutes >= EMPLOYEE_FULL_DAY_MINUTES;
      return {
        key,
        reporter: v.reporter,
        date: v.date,
        minutes: v.minutes,
        hours,
        fullDay,
        cost: fullDay ? EMPLOYEE_DAY_RATE : hours * EMPLOYEE_HOUR_RATE,
      };
    });
}

export function formatHoursMinutes(totalMinutes: number): string {
  const safe = Number.isFinite(totalMinutes) ? Math.max(0, totalMinutes) : 0;
  const hrs = Math.floor(safe / 60);
  const mins = Math.round(safe % 60);
  if (mins === 0) return `${hrs} שעות`;
  return `${hrs} שעות ו-${mins} דקות`;
}

export function getAllTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return times;
}

export function minutesBetween(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(":").map(Number);
  const [eh = 0, em = 0] = end.split(":").map(Number);
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

/** תצוגת תאריך בפורמט ישראלי: יום/חודש/שנה */
export function formatDateIL(iso?: string): string {
  if (!iso) return "";
  const [datePart, timePart] = String(iso).trim().split(" ");
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart ?? "");
  if (!m) return String(iso);
  const base = `${m[3]}/${m[2]}/${m[1]}`;
  return timePart ? `${base} ${timePart}` : base;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function nowStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0] ?? {});
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** מחשב את עלות הפרויקט לפי דיווחי השעות והעלויות הקבועות */
export function calculateProjectCost(state: AllNetState, projectName: string): number {
  const project = state.projects.find((p) => p.name === projectName);
  if (!project) return 0;
  const rows = state.hours.filter((h) => h.project === projectName);
  const region = project.region ?? "מרכז";

  const employees = rows.filter((h) => h.role !== "קבלן משנה");
  const subs = rows.filter((h) => h.role === "קבלן משנה");
  const fullSubDays = subs.filter((h) => h.minutes >= MIN_FULL_DAY_MINUTES);

  const subBreakdown = Array.from(new Set(fullSubDays.map((h) => h.date)))
    .sort()
    .map((date) => {
      const dayRows = fullSubDays.filter((h) => h.date === date);
      const workers = Math.max(...dayRows.map((h) => h.workers ?? SUB_CREW_SIZE));
      return subDayRate(region, workers);
    });
  const subCost = subBreakdown.reduce((sum, rate) => sum + rate, 0);

  const employeeCost = employeeDayCosts(employees).reduce((a, d) => a + d.cost, 0);
  const fixedCostTotal = (project.fixedCosts ?? []).reduce(
    (a, c) => a + (Number(c.amount) || 0),
    0,
  );

  return subCost + employeeCost + fixedCostTotal;
}
