import logo from "@/assets/allnet-logo-t.png.asset.json";
import {
  SERVICE_PRIORITY_LABELS,
  SERVICE_STATUS_LABELS,
  type ServiceCall,
} from "@/lib/allnet/types";
import { formatDateIL } from "@/lib/allnet/utils";

const esc = (v?: string | null) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const nl = (v?: string | null) => esc(v).replace(/\n/g, "<br/>");

const row = (label: string, value?: string | null) =>
  `<tr><th>${esc(label)}</th><td>${value ? nl(value) : '<span class="empty">—</span>'}</td></tr>`;

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  open: { bg: "#fee2e2", fg: "#b91c1c" },
  progress: { bg: "#fef3c7", fg: "#b45309" },
  waiting: { bg: "#e0e7ff", fg: "#4338ca" },
  done: { bg: "#dcfce7", fg: "#15803d" },
};

const PRIORITY_COLORS: Record<string, { bg: string; fg: string }> = {
  urgent: { bg: "#fee2e2", fg: "#b91c1c" },
  high: { bg: "#ffedd5", fg: "#c2410c" },
  normal: { bg: "#e0f2fe", fg: "#0369a1" },
  low: { bg: "#f1f5f9", fg: "#475569" },
};

/**
 * מפיק דוח שירות מעוצב (HTML) ופותח חלון הדפסה — ניתן לשמור כ-PDF ולשלוח ללקוח.
 */
export function openServiceCallReport(call: ServiceCall, technicianName?: string) {
  const logoUrl = new URL(logo.url, window.location.origin).href;
  const images = call.attachments.filter((a) => a.isImage);
  const files = call.attachments.filter((a) => !a.isImage);
  const statusC = STATUS_COLORS[call.status] ?? STATUS_COLORS["open"]!;
  const priorityC = PRIORITY_COLORS[call.priority] ?? PRIORITY_COLORS["normal"]!;

  const badge = (label: string, c: { bg: string; fg: string }) =>
    `<span class="badge" style="background:${c.bg};color:${c.fg}">${esc(label)}</span>`;

  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>דוח שירות #${call.number} - ${esc(call.client)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: "Heebo", "Segoe UI", Arial, sans-serif; color: #334155; margin: 0; background: #f8fafc; }
  .sheet { background: #fff; max-width: 800px; margin: 0 auto; padding: 0; }
  .top { background: linear-gradient(135deg, #b1341f 0%, #e2604a 60%, #f08a5c 100%);
         color: #fff; padding: 26px 32px; display: flex; align-items: center;
         justify-content: space-between; gap: 20px; }
  .top img { height: 84px; background: #fff; border-radius: 12px; padding: 8px 12px; }
  .top .meta { text-align: left; }
  .top h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: .5px; }
  .top .sub { margin-top: 6px; font-size: 13px; opacity: .92; }
  .badges { margin-top: 10px; display: flex; gap: 8px; justify-content: flex-start; }
  .badge { display: inline-block; padding: 3px 12px; border-radius: 999px;
           font-size: 12px; font-weight: 700; }
  .content { padding: 24px 32px; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 22px; }
  .card { border-radius: 12px; padding: 12px 14px; text-align: center; }
  .card .k { font-size: 11px; font-weight: 700; opacity: .8; }
  .card .v { font-size: 16px; font-weight: 800; margin-top: 3px; }
  .c1 { background: #fff1ed; color: #b1341f; }
  .c2 { background: #eef6ff; color: #1d4ed8; }
  .c3 { background: #f0fdf4; color: #15803d; }
  h2 { font-size: 15px; margin: 24px 0 8px; color: #b1341f; font-weight: 800;
       display: flex; align-items: center; gap: 8px; }
  h2::before { content: ""; width: 5px; height: 18px; border-radius: 4px;
               background: linear-gradient(180deg, #e2604a, #f08a5c); display: inline-block; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; border-radius: 10px; overflow: hidden; }
  th, td { border: 1px solid #f1e4df; padding: 8px 12px; text-align: right; vertical-align: top; }
  th { background: #fff5f1; width: 200px; font-weight: 700; color: #9a3412; }
  tr:nth-child(even) td { background: #fcfaf9; }
  .empty { color: #94a3b8; }
  .box { border: 1px solid #f1e4df; border-radius: 10px; padding: 12px 14px; font-size: 13px;
         white-space: pre-wrap; background: #fffaf8; line-height: 1.7; }
  .imgs { display: flex; flex-wrap: wrap; gap: 12px; }
  .imgs figure { margin: 0; width: 47%; }
  .imgs img { width: 100%; border: 1px solid #f1e4df; border-radius: 10px; }
  .imgs figcaption { font-size: 11px; color: #64748b; margin-top: 4px; }
  ul { font-size: 13px; padding-inline-start: 18px; }
  .sign { border: 1px dashed #f08a5c; border-radius: 12px; padding: 12px; width: 340px;
          background: #fffaf8; margin-top: 10px; }
  .sign img { width: 100%; height: 120px; object-fit: contain; }
  footer { margin-top: 28px; border-top: 2px solid #f1e4df; padding: 10px 32px;
           font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
  @media print {
    body { background: #fff; }
    .noprint { display: none; }
    .top { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .card, th, .box, .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="top">
    <img src="${logoUrl}" alt="AllNet" />
    <div class="meta">
      <h1>דוח שירות מפורט</h1>
      <div class="sub">קריאה מס' ${call.number} · הופק בתאריך ${formatDateIL(new Date().toISOString())}</div>
      <div class="badges">
        ${badge(SERVICE_STATUS_LABELS[call.status], statusC)}
        ${badge(`דחיפות: ${SERVICE_PRIORITY_LABELS[call.priority]}`, priorityC)}
      </div>
    </div>
  </div>

  <div class="content">
    <div class="cards">
      <div class="card c1"><div class="k">שם לקוח</div><div class="v">${esc(call.client) || "—"}</div></div>
      <div class="card c2"><div class="k">טכנאי מטפל</div><div class="v">${esc(technicianName || call.technician) || "—"}</div></div>
      <div class="card c3"><div class="k">תאריך פתיחה</div><div class="v">${formatDateIL(call.createdAt)}</div></div>
    </div>

    <h2>פרטי הקריאה</h2>
    <table>
      ${row("אתר", call.project)}
      ${row("איש קשר", call.contact)}
      ${row("כתובת", call.address)}
      ${row("נושא הקריאה", call.subject)}
      ${row("תאריך סגירה", call.closedAt ? formatDateIL(call.closedAt) : "")}
      ${row("שעות עבודה באתר", call.workFrom && call.workTo ? `${call.workFrom} - ${call.workTo}` : "")}
    </table>

    <h2>תיאור התקלה / מהות הקריאה</h2>
    <div class="box">${nl(call.description) || "—"}</div>

    ${
      call.equipmentSupplied
        ? `<h2>ציוד שסופק</h2><div class="box">${nl(call.equipmentSupplied)}</div>`
        : ""
    }
    ${
      call.followUp
        ? `<h2>נושאים להמשך טיפול / הצעת מחיר</h2><div class="box">${nl(call.followUp)}</div>`
        : ""
    }

    ${
      images.length
        ? `<h2>תמונות מהשטח</h2><div class="imgs">${images
            .map(
              (a) =>
                `<figure><img src="${a.dataUrl}" alt="${esc(a.name)}" /><figcaption>${esc(
                  a.name,
                )}</figcaption></figure>`,
            )
            .join("")}</div>`
        : ""
    }

    ${
      files.length
        ? `<h2>קבצים מצורפים</h2><ul>${files.map((f) => `<li>${esc(f.name)}</li>`).join("")}</ul>`
        : ""
    }

    <h2>אישור הלקוח</h2>
    <table>
      ${row("שם הלקוח המאשר", call.approverName)}
      ${row("מועד אישור", call.approvedAt ? formatDateIL(call.approvedAt) : "")}
    </table>
    ${
      call.approverSignature
        ? `<div class="sign"><div style="font-size:12px;color:#9a3412;font-weight:700">חתימת הלקוח</div><img src="${call.approverSignature}" alt="חתימה" /></div>`
        : `<p style="font-size:12px;color:#94a3b8">לא נקלטה חתימה דיגיטלית עבור קריאה זו.</p>`
    }
  </div>

  <footer>
    <span>AllNet · דוח שירות מס' ${call.number}</span>
    <span>מסמך זה הופק ממערכת הניהול והתפעול של AllNet</span>
  </footer>
</div>

<div class="noprint" style="margin:20px 0;text-align:center">
  <button onclick="window.print()" style="padding:11px 26px;font-size:14px;font-weight:700;border-radius:10px;border:0;background:#e2604a;color:#fff;cursor:pointer">
    הדפסה / שמירה כ-PDF
  </button>
</div>
</body>
</html>`;

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
      /* המשתמש יוכל להדפיס ידנית */
    }
  }, 700);
  return true;
}
