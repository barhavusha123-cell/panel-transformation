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
  value
    ? `<tr><th>${esc(label)}</th><td>${nl(value)}</td></tr>`
    : "";

/**
 * מפיק דוח שירות מפורט (HTML) ופותח חלון הדפסה — ניתן לשמור כ-PDF ולשלוח ללקוח.
 */
export function openServiceCallReport(call: ServiceCall, technicianName?: string) {
  const logoUrl = new URL(logo.url, window.location.origin).href;
  const images = call.attachments.filter((a) => a.isImage);
  const files = call.attachments.filter((a) => !a.isImage);

  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>דוח שירות #${call.number} - ${esc(call.client)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Heebo", "Segoe UI", Arial, sans-serif; color: #1f2937; margin: 0; }
  header { display: flex; align-items: center; justify-content: space-between;
           border-bottom: 3px solid #e2604a; padding-bottom: 12px; margin-bottom: 18px; }
  header img { height: 68px; }
  .title { text-align: left; }
  .title h1 { margin: 0; font-size: 22px; color: #b1341f; }
  .title p { margin: 4px 0 0; font-size: 13px; color: #6b7280; }
  h2 { font-size: 15px; margin: 22px 0 8px; color: #b1341f;
       border-inline-start: 4px solid #e2604a; padding-inline-start: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #e5e7eb; padding: 7px 10px; text-align: right; vertical-align: top; }
  th { background: #fdf3f0; width: 190px; font-weight: 600; color: #7c2d12; }
  .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; font-size: 13px;
         white-space: pre-wrap; background: #fcfcfc; }
  .imgs { display: flex; flex-wrap: wrap; gap: 10px; }
  .imgs figure { margin: 0; width: 47%; }
  .imgs img { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; }
  .imgs figcaption { font-size: 11px; color: #6b7280; margin-top: 4px; }
  .sign { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; width: 320px; }
  .sign img { width: 100%; height: 110px; object-fit: contain; }
  ul { font-size: 13px; padding-inline-start: 18px; }
  footer { margin-top: 26px; border-top: 1px solid #e5e7eb; padding-top: 8px;
           font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
  @media print { .noprint { display: none; } }
</style>
</head>
<body>
<header>
  <img src="${logoUrl}" alt="AllNet" />
  <div class="title">
    <h1>דוח שירות מפורט</h1>
    <p>קריאה מס' ${call.number} · הופק בתאריך ${formatDateIL(new Date().toISOString())}</p>
  </div>
</header>

<h2>פרטי הקריאה</h2>
<table>
  ${row("שם לקוח", call.client)}
  ${row("אתר", call.project)}
  ${row("איש קשר", call.contact)}
  ${row("כתובת", call.address)}
  ${row("נושא הקריאה", call.subject)}
  ${row("דחיפות", SERVICE_PRIORITY_LABELS[call.priority])}
  ${row("סטטוס", SERVICE_STATUS_LABELS[call.status])}
  ${row("טכנאי מטפל", technicianName || call.technician)}
  ${row("תאריך פתיחה", formatDateIL(call.createdAt))}
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
  call.updates.length
    ? `<h2>יומן טיפול</h2><ul>${call.updates
        .map(
          (u) =>
            `<li><strong>${esc(formatDateIL(u.at))} · ${esc(u.by)}</strong>${
              u.status ? ` (${esc(SERVICE_STATUS_LABELS[u.status])})` : ""
            } — ${nl(u.text)}</li>`,
        )
        .join("")}</ul>`
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
  ${row("שם הלקוח המאשר", call.approverName || "—")}
  ${row("מועד אישור", call.approvedAt ? formatDateIL(call.approvedAt) : "—")}
</table>
${
  call.approverSignature
    ? `<div class="sign" style="margin-top:10px"><div style="font-size:12px;color:#6b7280">חתימת הלקוח</div><img src="${call.approverSignature}" alt="חתימה" /></div>`
    : `<p style="font-size:12px;color:#9ca3af">לא נקלטה חתימה דיגיטלית עבור קריאה זו.</p>`
}

<footer>
  <span>AllNet · דוח שירות מס' ${call.number}</span>
  <span>מסמך זה הופק ממערכת הניהול והתפעול של AllNet</span>
</footer>

<div class="noprint" style="margin-top:20px;text-align:center">
  <button onclick="window.print()" style="padding:10px 20px;font-size:14px;border-radius:8px;border:0;background:#e2604a;color:#fff;cursor:pointer">
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
