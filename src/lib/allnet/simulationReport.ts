import logo from "@/assets/allnet-logo-t.png.asset.json";
import type { FixedCost, Region } from "@/lib/allnet/types";

const esc = (v?: string | number | null) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const ils = (n: number) => `${Math.round(n).toLocaleString("he-IL")} ₪`;

export type SimulationReportData = {
  name: string;
  client: string;
  manager: string;
  region: Region;
  saleAmount: number;
  additions: number;
  fixedCosts: FixedCost[];
  crewSize: number;
  employeeShare: number;
  targetProfit: number;
  employeeDayRate: number;
  employeeHourRate: number;
  crewRate: number;
  revenue: number;
  fixed: number;
  profitTarget: number;
  labourBudget: number;
  employeeBudget: number;
  contractorBudget: number;
  employeeDays: number;
  employeeHours: number;
  partialHours: number;
  contractorDays: number;
  maxEmployeeDays: number;
  maxEmployeeHours: number;
  maxContractorDays: number;
  usedPercent: number;
  mix: { share: number; empHours: number; empDays: number; conDays: number }[];
};

const CSS = `
@page { size: A4 portrait; margin: 10mm; }
* { box-sizing: border-box; }
body { font-family: "Heebo","Segoe UI",Arial,sans-serif; color:#334155; margin:0; background:#fff; }
.sheet { max-width: 190mm; margin: 0 auto; }
.top { display:flex; align-items:center; justify-content:space-between; gap:16px;
       border-bottom:2px solid #e2604a; padding-bottom:10px; }
.top img { height:56px; }
.top h1 { margin:0; font-size:19px; color:#1f2937; }
.top .sub { font-size:11px; color:#64748b; margin-top:4px; }
.meta { display:grid; grid-template-columns: repeat(4,1fr); gap:8px; margin:12px 0; }
.meta div { border:1px solid #eceff3; background:#fafbfc; border-radius:8px; padding:6px 10px; }
.meta .k { font-size:9.5px; color:#94a3b8; font-weight:600; }
.meta .v { font-size:12.5px; font-weight:700; color:#1f2937; }
h2 { font-size:12.5px; margin:12px 0 5px; color:#475569; }
table { width:100%; border-collapse:collapse; font-size:11.5px; }
th,td { border:1px solid #eceff3; padding:5px 8px; text-align:right; }
th { background:#fafbfc; color:#64748b; font-weight:600; }
.big { display:grid; grid-template-columns: repeat(3,1fr); gap:10px; margin:10px 0; }
.big div { border:1px solid #e2604a33; background:#e2604a0d; border-radius:10px; padding:9px 12px; }
.big .k { font-size:10px; color:#94a3b8; font-weight:600; }
.big .v { font-size:17px; font-weight:800; color:#1f2937; }
.big .s { font-size:10px; color:#64748b; margin-top:2px; }
.cols { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
footer { margin-top:14px; border-top:1px solid #e5e7eb; padding-top:6px;
         display:flex; justify-content:space-between; font-size:9.5px; color:#94a3b8; }
.noprint button { padding:11px 26px; font-size:14px; font-weight:700; border-radius:10px;
                  border:0; background:#e2604a; color:#fff; cursor:pointer; }
@media print { .noprint { display:none; } }
`;

export function openSimulationReport(d: SimulationReportData): boolean {
  const logoUrl = new URL(logo.url, window.location.origin).href;
  const fixedRows = d.fixedCosts.length
    ? d.fixedCosts
        .map(
          (c) =>
            `<tr><td>${esc(c.description || c.type)}</td><td>${ils(Number(c.amount) || 0)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" style="color:#cbd5e1">לא הוזנו עלויות קבועות</td></tr>`;

  const mixRows = d.mix
    .map(
      (r) =>
        `<tr><td>${r.share}% חברה</td><td>${r.empHours.toFixed(0)}</td><td>${r.empDays.toFixed(1)}</td><td>${r.conDays.toFixed(1)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8" />
<title>סימולציית רווחיות - ${esc(d.name || "פרויקט")}</title>
<style>${CSS}</style></head><body>
<div class="sheet">
  <div class="top">
    <div>
      <h1>סימולציית רווחיות פרויקט</h1>
      <div class="sub">${esc(d.name || "ללא שם")}${d.client ? ` · ${esc(d.client)}` : ""} · הופק בתאריך ${new Date().toLocaleDateString("he-IL")}</div>
    </div>
    <img src="${logoUrl}" alt="AllNet" />
  </div>

  <div class="meta">
    <div><div class="k">מנהל פרויקט</div><div class="v">${esc(d.manager || "—")}</div></div>
    <div><div class="k">אזור</div><div class="v">${esc(d.region)}</div></div>
    <div><div class="k">שווי מכירה</div><div class="v">${ils(d.saleAmount)}</div></div>
    <div><div class="k">תוספות מאושרות</div><div class="v">${ils(d.additions)}</div></div>
  </div>

  <div class="big">
    <div><div class="k">תקציב זמין לעבודה</div><div class="v">${ils(d.labourBudget)}</div>
      <div class="s">הכנסה ${ils(d.revenue)} · קבועות ${ils(d.fixed)} · רווח גולמי ${ils(d.profitTarget)} (${d.targetProfit}%)</div></div>
    <div><div class="k">מקסימום עובדי חברה (100%)</div><div class="v">${d.maxEmployeeHours.toFixed(0)} שעות</div>
      <div class="s">${d.maxEmployeeDays.toFixed(1)} ימים · ${ils(d.employeeDayRate)} ליום</div></div>
    <div><div class="k">מקסימום ימי צוות קבלן (100%)</div><div class="v">${d.maxContractorDays.toFixed(1)} ימים</div>
      <div class="s">${d.crewSize} עובדים · ${ils(d.crewRate)} ליום (${esc(d.region)})</div></div>
  </div>

  <div class="cols">
    <div>
      <h2>התמהיל שנבחר — ${d.employeeShare}% חברה / ${100 - d.employeeShare}% קבלן</h2>
      <table>
        <tr><th>עובדי חברה</th><td>${d.employeeHours.toFixed(0)} שעות (${d.employeeDays.toFixed(1)} ימים) · ${ils(d.employeeBudget)}</td></tr>
        <tr><th>שעות בודדות</th><td>${d.partialHours.toFixed(0)} שעות · ${ils(d.employeeHourRate)} לשעה</td></tr>
        <tr><th>צוותי קבלן</th><td>${d.contractorDays.toFixed(1)} ימים · ${ils(d.contractorBudget)}</td></tr>
        <tr><th>ניצול מסך הפרויקט</th><td>${d.usedPercent.toFixed(0)}%</td></tr>
      </table>
      <h2>עלויות קבועות</h2>
      <table><thead><tr><th>סעיף</th><th>סכום</th></tr></thead><tbody>${fixedRows}
        <tr><th>סה"כ</th><th>${ils(d.fixed)}</th></tr></tbody></table>
    </div>
    <div>
      <h2>טבלת תמהילים</h2>
      <table><thead><tr><th>תמהיל</th><th>שעות חברה</th><th>ימי חברה</th><th>ימי קבלן</th></tr></thead>
      <tbody>${mixRows}</tbody></table>
    </div>
  </div>

  <footer>
    <span>AllNet · סימולציית רווחיות</span>
    <span>מסמך זה הופק ממערכת הניהול והתפעול של AllNet</span>
  </footer>
</div>
<div class="noprint" style="margin:20px 0;text-align:center">
  <button onclick="window.print()">הדפסה / שמירה כ-PDF</button>
</div>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch {
      /* ידני */
    }
  }, 700);
  return true;
}
