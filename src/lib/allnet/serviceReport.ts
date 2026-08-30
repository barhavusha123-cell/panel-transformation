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

const badge = (label: string, c: { bg: string; fg: string }) =>
  `<span class="badge" style="background:${c.bg};color:${c.fg}">${esc(label)}</span>`;

const BASE_CSS = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: "Heebo", "Segoe UI", Arial, sans-serif; color: #334155; margin: 0; background: #fff; }
  .sheet { background: #fff; max-width: 800px; margin: 0 auto; padding: 0; }
  .top { background: #fff; color: #334155; padding: 22px 32px 16px; display: flex;
         align-items: center; justify-content: space-between; gap: 20px;
         border-bottom: 1px solid #e5e7eb; }
  .top img { height: 72px; }
  .top .meta { text-align: left; }
  .top h1 { margin: 0; font-size: 22px; font-weight: 700; color: #1f2937; letter-spacing: .3px; }
  .top .sub { margin-top: 6px; font-size: 12px; color: #64748b; }
  .badges { margin-top: 10px; display: flex; gap: 8px; justify-content: flex-start; }
  .badge { display: inline-block; padding: 3px 12px; border-radius: 999px;
           font-size: 12px; font-weight: 700; }
  .content { padding: 18px 32px 8px; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
  .card { border-radius: 10px; padding: 9px 12px; text-align: center; border: 1px solid #eceff3; background: #fafbfc; }
  .card .k { font-size: 10px; font-weight: 600; color: #94a3b8; }
  .card .v { font-size: 14px; font-weight: 700; margin-top: 2px; color: #1f2937; }
  h2 { font-size: 13px; margin: 14px 0 6px; color: #475569; font-weight: 700;
       display: flex; align-items: center; gap: 8px; letter-spacing: .2px; }
  h2::before { content: ""; width: 3px; height: 14px; border-radius: 3px;
               background: #cbd5e1; display: inline-block; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #eceff3; padding: 6px 10px; text-align: right; vertical-align: top; }
  th { background: #fafbfc; width: 190px; font-weight: 600; color: #64748b; }
  .summary th { width: auto; }
  .summary td { text-align: center; }
  .summary thead th { text-align: center; background: #f8fafc; }
  .empty { color: #cbd5e1; }
  .box { border: 1px solid #eceff3; border-radius: 8px; padding: 10px 12px; font-size: 12px;
         white-space: pre-wrap; background: #fff; line-height: 1.65; }
  .attachments { page-break-before: always; break-before: page; }
  .imgs { display: flex; flex-wrap: wrap; gap: 12px; }
  .imgs figure { margin: 0; width: 47%; page-break-inside: avoid; break-inside: avoid; }
  .imgs img { width: 100%; border: 1px solid #eceff3; border-radius: 8px; }
  .imgs figcaption { font-size: 10px; color: #94a3b8; margin-top: 4px; }
  ul { font-size: 12px; padding-inline-start: 18px; }
  .sign { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; width: 320px;
          background: #fff; margin-top: 8px; page-break-inside: avoid; }
  .sign img { width: 100%; height: 96px; object-fit: contain; }
  footer { margin-top: 16px; border-top: 1px solid #eceff3; padding: 8px 32px;
           font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
  .call-page { page-break-before: always; break-before: page; }
  .call-page .call-head { display: flex; align-items: center; justify-content: space-between;
           gap: 12px; padding: 14px 0 10px; border-bottom: 1px solid #e5e7eb; margin-bottom: 4px; }
  .call-page .call-head img { height: 44px; }
  .call-page .call-head h2 { margin: 0; }
  .call-page .call-head h2::before { display: none; }
  @media print {
    body { background: #fff; }
    .noprint { display: none; }
    .card, th, .box, .badge, .top { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

const PRINT_BUTTON = `
<div class="noprint" style="margin:20px 0;text-align:center">
  <button onclick="window.print()" style="padding:11px 26px;font-size:14px;font-weight:700;border-radius:10px;border:0;background:#e2604a;color:#fff;cursor:pointer">
    הדפסה / שמירה כ-PDF
  </button>
</div>`;

function openPrintWindow(title: string, body: string): boolean {
  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
${body}
${PRINT_BUTTON}
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

/** גוף פרטי קריאה בודדת (ללא כותרת עליונה) */
function callContentHtml(
  call: ServiceCall,
  logoUrl: string,
  technicianName?: string,
): string {
  const images = call.attachments.filter((a) => a.isImage);
  const files = call.attachments.filter((a) => !a.isImage);
  const statusC = STATUS_COLORS[call.status] ?? STATUS_COLORS["open"]!;
  const priorityC = PRIORITY_COLORS[call.priority] ?? PRIORITY_COLORS["normal"]!;

  return `
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
      ${row(
        "טכנאי נוסף באתר",
        call.additionalTechnician === undefined
          ? ""
          : call.additionalTechnician
            ? `כן${call.additionalTechnicianName ? ` — ${call.additionalTechnicianName}` : ""}`
            : "לא",
      )}
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

    <h2>אישור הלקוח</h2>
    <table>
      ${row("שם הלקוח המאשר", call.approverName)}
      ${row("מועד אישור", call.approvedAt ? formatDateIL(call.approvedAt) : "")}
    </table>
    ${
      call.approverSignature
        ? `<div class="sign"><div style="font-size:11px;color:#64748b;font-weight:600">חתימת הלקוח</div><img src="${call.approverSignature}" alt="חתימה" /></div>`
        : `<p style="font-size:12px;color:#94a3b8">לא נקלטה חתימה דיגיטלית עבור קריאה זו.</p>`
    }

    ${
      images.length || files.length
        ? `<div class="attachments">
      <h2>נספחים · קריאה מס' ${call.number}</h2>
      ${
        images.length
          ? `<div class="imgs">${images
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
    </div>`
        : ""
    }
  </div>

  <footer>
    <span>AllNet · דוח שירות מס' ${call.number}</span>
    <span>מסמך זה הופק ממערכת הניהול והתפעול של AllNet</span>
  </footer>`;
}

/**
 * מפיק דוח שירות מעוצב (HTML) ופותח חלון הדפסה — ניתן לשמור כ-PDF ולשלוח ללקוח.
 */
export function openServiceCallReport(call: ServiceCall, technicianName?: string) {
  const logoUrl = new URL(logo.url, window.location.origin).href;
  return openPrintWindow(
    `דוח שירות #${call.number} - ${call.client}`,
    `<div class="sheet">${callContentHtml(call, logoUrl, technicianName)}</div>`,
  );
}

/**
 * מפיק דוח שירות מרוכז עבור מספר קריאות נבחרות — עמוד סיכום + עמוד מפורט לכל קריאה.
 */
export function openServiceCallsBulkReport(
  calls: ServiceCall[],
  technicianName: (username?: string) => string,
) {
  if (!calls.length) return false;
  const logoUrl = new URL(logo.url, window.location.origin).href;
  const sorted = calls.slice().sort((a, b) => a.number - b.number);
  const uniqueClients = Array.from(
    new Set(sorted.map((c) => (c.client ?? "").trim()).filter(Boolean)),
  );
  const clientTitle =
    uniqueClients.length === 1 ? uniqueClients[0]! : uniqueClients.length > 1 ? "מספר לקוחות" : "";

  const summaryRows = sorted
    .map((c) => {
      const statusC = STATUS_COLORS[c.status] ?? STATUS_COLORS["open"]!;
      return `<tr>
        <td>#${c.number}</td>
        <td>${esc(c.client) || "—"}</td>
        <td>${esc(c.project) || "—"}</td>
        <td>${formatDateIL(c.createdAt)}</td>
        <td>${esc(c.subject) || "—"}</td>
        <td>${esc(technicianName(c.technician))}</td>
        <td>${badge(SERVICE_STATUS_LABELS[c.status], statusC)}</td>
      </tr>`;
    })
    .join("");

  const cover = `
  <div class="sheet">
    <div class="top">
      <img src="${logoUrl}" alt="AllNet" />
      <div class="meta">
        <h1>דוח קריאות מרכז${clientTitle ? ` · ${esc(clientTitle)}` : ""}</h1>
        <div class="sub">${clientTitle ? `שם לקוח: ${esc(clientTitle)} · ` : ""}${sorted.length} קריאות · הופק בתאריך ${formatDateIL(new Date().toISOString())}</div>
      </div>
    </div>
    <div class="content">
      <h2>סיכום קריאות נבחרות</h2>
      <table class="summary">
        <thead>
          <tr>
            <th>מס' קריאה</th><th>לקוח</th><th>אתר</th><th>תאריך</th><th>נושא</th><th>טכנאי</th><th>סטטוס</th>
          </tr>
        </thead>
        <tbody>${summaryRows}</tbody>
      </table>
    </div>
    <footer>
      <span>AllNet · דוח קריאות שירות מרוכז</span>
      <span>מסמך זה הופק ממערכת הניהול והתפעול של AllNet</span>
    </footer>
  </div>`;

  const pages = sorted
    .map(
      (c) => `
  <div class="sheet call-page">
    ${callContentHtml(c, logoUrl, technicianName(c.technician))}
  </div>`,
    )
    .join("");

  return openPrintWindow(
    `דוח קריאות שירות מרוכז - ${sorted.length} קריאות`,
    cover + pages,
  );
}
