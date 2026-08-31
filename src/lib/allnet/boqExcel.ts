import ExcelJS from "exceljs";
import logo from "@/assets/allnet-logo.png.asset.json";
import { boqSummary, discountAmount, type Project } from "@/lib/allnet/types";

const BLUE = "FF1D4ED8";
const LIGHT = "FFEFF4FF";
const GREEN = "FF059669";

const border = {
  top: { style: "thin", color: { argb: "FFD4D4D8" } },
  bottom: { style: "thin", color: { argb: "FFD4D4D8" } },
  left: { style: "thin", color: { argb: "FFD4D4D8" } },
  right: { style: "thin", color: { argb: "FFD4D4D8" } },
} as const;

/** ייצוא כתב כמויות (צ'קליסט ביצוע) לקובץ אקסל כולל לוגו, הנחה וסיכומים */
export async function exportBoqExcel(project: Project): Promise<void> {
  const items = project.boq ?? [];
  const summary = boqSummary(items);
  const discount = project.boqDiscount;
  const discountVal = discountAmount(summary.total, discount);
  const totalAfter = Math.max(summary.total - discountVal, 0);
  const ils = (n: number) => Math.round(n);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("כתב כמויות", { views: [{ rightToLeft: true }] });
  ws.columns = [
    { width: 10 }, // A סעיף
    { width: 42 }, // B תיאור
    { width: 8 }, // C יח'
    { width: 10 }, // D כמות
    { width: 12 }, // E מחיר יח'
    { width: 14 }, // F סה"כ
    { width: 10 }, // G בוצע
    { width: 10 }, // H % ביצוע
    { width: 14 }, // I שווי שבוצע
  ];

  // לוגו
  try {
    const res = await fetch(new URL(logo.url, window.location.origin).href);
    const buf = await res.arrayBuffer();
    const imgId = wb.addImage({ buffer: buf, extension: "png" });
    ws.addImage(imgId, {
      tl: { col: 0, row: 0 },
      ext: { width: 150, height: 60 },
    });
    ws.getRow(1).height = 30;
    ws.getRow(2).height = 30;
  } catch {
    /* ממשיכים גם בלי לוגו */
  }

  // כותרת
  ws.mergeCells("A4:I4");
  const title = ws.getCell("A4");
  title.value = `כתב כמויות — צ'קליסט ביצוע · ${project.client ? `${project.client} · ` : ""}${project.name}`;
  title.font = { bold: true, size: 14, color: { argb: BLUE } };
  title.alignment = { horizontal: "right" };
  if (project.boqFileName) {
    ws.mergeCells("A5:I5");
    const src = ws.getCell("A5");
    src.value = `מקור: ${project.boqFileName} · עודכן: ${project.boqUpdatedAt ? new Date(project.boqUpdatedAt).toLocaleString("he-IL") : "—"}`;
    src.font = { size: 9, color: { argb: "FF71717A" } };
    src.alignment = { horizontal: "right" };
  }

  // סיכומים
  const sums: Array<[string, string]> = [
    ["שווי כתב כמויות", `${ils(summary.total).toLocaleString("he-IL")} ₪`],
    [
      `הנחה (${discount?.type === "percent" ? `${discount?.value ?? 0}%` : "מחיר קבוע"})`,
      `${ils(discountVal).toLocaleString("he-IL")} ₪`,
    ],
    ["שווי פרויקט לאחר הנחה", `${ils(totalAfter).toLocaleString("he-IL")} ₪`],
    ["בוצע עד כה", `${ils(summary.done).toLocaleString("he-IL")} ₪ (${summary.percent}%)`],
    ["יתרה לביצוע", `${ils(summary.remaining).toLocaleString("he-IL")} ₪`],
    ["פריטים שהושלמו", `${summary.completedItems} / ${summary.count}`],
  ];
  let r = 7;
  for (const [label, value] of sums) {
    ws.mergeCells(`A${r}:B${r}`);
    ws.mergeCells(`C${r}:D${r}`);
    const lc = ws.getCell(`A${r}`);
    const vc = ws.getCell(`C${r}`);
    lc.value = label;
    vc.value = value;
    lc.font = { bold: true, size: 10 };
    vc.font = { bold: true, size: 10, color: { argb: label.includes("לאחר הנחה") ? BLUE : "FF000000" } };
    lc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
    vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
    lc.alignment = { horizontal: "right" };
    vc.alignment = { horizontal: "right" };
    lc.border = border;
    vc.border = border;
    r++;
  }

  // כותרות טבלה
  const headerRow = r + 1;
  const headers = ["סעיף", "תיאור", "יח'", "כמות", "מחיר יח'", 'סה"כ', "בוצע", "% ביצוע", "שווי שבוצע"];
  headers.forEach((h, i) => {
    const c = ws.getCell(headerRow, i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    c.alignment = { horizontal: "center" };
    c.border = border;
  });

  // שורות פריטים
  let row = headerRow + 1;
  for (const i of items) {
    const qty = Number(i.quantity) || 0;
    const done = Math.min(Number(i.doneQty) || 0, qty);
    const price = Number(i.unitPrice) || 0;
    const pct = qty > 0 ? done / qty : 0;
    const complete = qty > 0 && done >= qty;
    const vals = [
      i.code || "—",
      i.description,
      i.unit || "—",
      qty,
      price,
      qty * price,
      done,
      pct,
      done * price,
    ];
    vals.forEach((v, ci) => {
      const c = ws.getCell(row, ci + 1);
      c.value = v as string | number;
      c.border = border;
      c.font = { size: 10, ...(complete ? { color: { argb: GREEN }, bold: true } : {}) };
      if (ci === 1) c.alignment = { horizontal: "right", wrapText: true };
      else c.alignment = { horizontal: "center" };
      if ([4, 5, 8].includes(ci)) c.numFmt = '#,##0" ₪"';
      if (ci === 7) c.numFmt = "0%";
      if (complete) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
    });
    row++;
  }

  // שורות סיכום בתחתית הטבלה
  const totals: Array<[string, number, string?]> = [
    ['סה"כ כתב כמויות', ils(summary.total)],
    [`הנחה לכלל הפרויקט${discount?.type === "percent" ? ` (${discount.value}%)` : ""}`, -ils(discountVal)],
    ['סה"כ לאחר הנחה', ils(totalAfter), BLUE],
    ["שווי שבוצע עד כה", ils(summary.done), GREEN],
  ];
  for (const [label, value, color] of totals) {
    ws.mergeCells(`A${row}:E${row}`);
    ws.mergeCells(`F${row}:I${row}`);
    const lc = ws.getCell(`A${row}`);
    const vc = ws.getCell(`F${row}`);
    lc.value = label;
    vc.value = value;
    lc.font = { bold: true, size: 11, ...(color ? { color: { argb: color } } : {}) };
    vc.font = { bold: true, size: 11, ...(color ? { color: { argb: color } } : {}) };
    lc.alignment = { horizontal: "left" };
    vc.alignment = { horizontal: "center" };
    vc.numFmt = '#,##0" ₪";-#,##0" ₪"';
    lc.border = border;
    vc.border = border;
    lc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
    vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
    row++;
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `כתב-כמויות-${project.name}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}
