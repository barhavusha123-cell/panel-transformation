import { useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, FileSpreadsheet, ListChecks, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAllNet } from "@/lib/allnet/store";
import { parseBoqFile } from "@/lib/allnet/boq.functions";
import { exportBoqExcel } from "@/lib/allnet/boqExcel";
import { boqSummary, discountAmount, type BoqItem } from "@/lib/allnet/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const ils = (n: number) => `${Math.round(n).toLocaleString("he-IL")} ₪`;

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read error"));
    r.readAsDataURL(file);
  });

export function BoqChecklist({
  projectName,
  readOnly = false,
}: {
  projectName: string;
  readOnly?: boolean;
}) {
  const { state, setState, session } = useAllNet();
  const project = state.projects.find((p) => p.name === projectName);
  const items = useMemo(() => project?.boq ?? [], [project]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [progressCollapsed, setProgressCollapsed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const summary = boqSummary(items);
  const discount = project?.boqDiscount;
  const discountVal = discountAmount(summary.total, discount);
  const totalAfter = Math.max(summary.total - discountVal, 0);
  const who = session?.user?.full_name ?? "מנהל מערכת";

  const patchProject = (fn: (items: BoqItem[]) => BoqItem[], fileName?: string) =>
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.name === projectName
          ? {
              ...p,
              boq: fn(p.boq ?? []),
              boqUpdatedAt: new Date().toISOString(),
              ...(fileName ? { boqFileName: fileName } : {}),
            }
          : p,
      ),
    }));

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const isExcel = /\.(xlsx|xls|xlsm)$/i.test(file.name);
      const isText = /\.(csv|txt|tsv)$/i.test(file.name);
      let payload: { filename: string; text?: string; dataUrl?: string };
      if (isExcel) {
        // מודלי ה-AI לא תומכים בקבצי אקסל — ממירים לטקסט בדפדפן
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const text = wb.SheetNames.map(
          (n) => `# ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n]!)}`,
        ).join("\n\n");
        payload = { filename: `${file.name}.csv`, text };
      } else if (isText) {
        payload = { filename: file.name, text: await file.text() };
      } else {
        payload = { filename: file.name, dataUrl: await readAsDataUrl(file) };
      }
      const parsed = await parseBoqFile({ data: payload });
      if (!parsed.length) {
        toast.error("לא נמצאו שורות כתב כמויות בקובץ.");
        return;
      }
      const mapped: BoqItem[] = parsed.map((i) => ({
        id: crypto.randomUUID(),
        code: i.code ?? "",
        description: i.description,
        unit: i.unit ?? "",
        quantity: Number(i.quantity) || 0,
        unitPrice: Number(i.unitPrice) || 0,
        doneQty: 0,
      }));
      patchProject((prev) => [...prev, ...mapped], file.name);
      toast.success(`נטענו ${mapped.length} שורות מכתב הכמויות.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "לא הצלחתי לקרוא את הקובץ.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const update = (id: string, patch: Partial<BoqItem>) =>
    patchProject((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, ...patch, updatedBy: who, updatedAt: new Date().toISOString() }
          : i,
      ),
    );

  const addRow = () =>
    patchProject((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        code: "",
        description: "פריט חדש",
        unit: "יח'",
        quantity: 1,
        unitPrice: 0,
        doneQty: 0,
      },
    ]);

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <ListChecks className="size-5 text-primary" />
          כתב כמויות — צ'קליסט ביצוע
          {project?.boqFileName && (
            <Badge variant="secondary" className="font-normal">
              {project.boqFileName}
            </Badge>
          )}
        </h3>
        {items.length > 0 && project && (
          <Button
            size="sm"
            className="bg-blue-800 text-white hover:bg-blue-900"
            onClick={() => {
              void exportBoqExcel(project)
                .then(() => toast.success("כתב הכמויות יוצא לאקסל בהצלחה."))
                .catch(() => toast.error("לא הצלחתי לייצא את הקובץ."));
            }}
          >
            <FileSpreadsheet className="size-4" />
            ייצא צ'קליסט לאקסל
          </Button>
        )}
        {!readOnly && (
          <div className="flex gap-2">
            {items.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (!window.confirm("למחוק את כל כתב הכמויות והקובץ שהועלה?")) return;
                  setState((prev) => ({
                    ...prev,
                    projects: prev.projects.map((p) =>
                      p.name === projectName
                        ? (() => { const np = { ...p, boq: [], boqUpdatedAt: new Date().toISOString() }; delete np.boqFileName; return np; })()
                        : p,
                    ),
                  }));
                  toast.success("כתב הכמויות נמחק — ניתן להעלות קובץ חדש.");
                }}
              >
                <Trash2 className="size-4" />
                מחק כתב כמויות
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus className="size-4" />
              הוסף שורה
            </Button>
            <Button size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {busy ? "קורא קובץ..." : "העלה כתב כמויות"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.csv,.txt,.tsv,image/*,.xls,.xlsx"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        )}
      </div>

      {!readOnly && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={`mb-4 rounded-xl border-2 border-dashed p-4 text-center text-xs transition-colors ${
            over ? "border-primary bg-primary/5" : "border-border bg-surface/40"
          }`}
        >
          גרור לכאן קובץ כתב כמויות (PDF / CSV / תמונה) — המערכת תזהה פריטים, כמויות ומחירים
          ותהפוך אותם לצ'קליסט ביצוע.
        </div>
      )}

      {/* סיכום חי */}
      {readOnly ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <SummaryBox label="כמות כוללת" value={String(items.reduce((a, i) => a + (Number(i.quantity) || 0), 0))} />
          <SummaryBox
            label="פריטים שהושלמו"
            value={`${summary.completedItems} / ${summary.count}`}
            accent
          />
        </div>
      ) : (
        <div className="mb-4 grid gap-3 sm:grid-cols-5">
          <SummaryBox label="שווי כתב כמויות" value={ils(summary.total)} />
          <SummaryBox label="שווי פרויקט לאחר הנחה" value={ils(totalAfter)} accent />
          <SummaryBox label="בוצע עד כה" value={ils(summary.done)} accent />
          <SummaryBox label="יתרה לביצוע" value={ils(summary.remaining)} />
          <SummaryBox
            label="פריטים שהושלמו"
            value={`${summary.completedItems} / ${summary.count}`}
          />
        </div>
      )}
      {/* שורת הנחה לכלל הפרויקט — צד מנהל בלבד */}
      {!readOnly && (
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-xs">
        <span className="font-bold">הנחה לכלל הפרויקט:</span>
        <select
          value={discount?.type ?? "percent"}
          disabled={readOnly || discount?.locked}
          onChange={(e) =>
            setState((prev) => ({
              ...prev,
              projects: prev.projects.map((p) =>
                p.name === projectName
                  ? { ...p, boqDiscount: { type: e.target.value as "percent" | "fixed", value: p.boqDiscount?.value ?? 0, locked: false }, boqUpdatedAt: new Date().toISOString() }
                  : p,
              ),
            }))
          }
          className="h-8 rounded-md border border-border bg-background px-2 disabled:opacity-60"
        >
          <option value="percent">אחוזים (%)</option>
          <option value="fixed">מחיר קבוע (₪)</option>
        </select>
        <Input
          type="number"
          min={0}
          max={discount?.type === "percent" ? 100 : undefined}
          value={discount?.value ?? 0}
          disabled={readOnly || discount?.locked}
          onChange={(e) =>
            setState((prev) => ({
              ...prev,
              projects: prev.projects.map((p) =>
                p.name === projectName
                  ? { ...p, boqDiscount: { type: p.boqDiscount?.type ?? "percent", value: Number(e.target.value) || 0, locked: false }, boqUpdatedAt: new Date().toISOString() }
                  : p,
              ),
            }))
          }
          className="h-8 w-24"
        />
        {discount?.locked ? (
          <>
            <Badge className="gap-1 border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              <CheckCircle2 className="h-3 w-3" />
              ההנחה אושרה ונקבעה
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-[11px]"
              onClick={() => {
                setState((prev) => ({
                  ...prev,
                  projects: prev.projects.map((p) =>
                    p.name === projectName && p.boqDiscount
                      ? { ...p, boqDiscount: { ...p.boqDiscount, locked: false }, boqUpdatedAt: new Date().toISOString() }
                      : p,
                  ),
                }));
                toast.info("ההנחה שוחררה לעריכה");
              }}
            >
              ערוך הנחה
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="h-7 gap-1 bg-emerald-600 text-[11px] text-white hover:bg-emerald-700"
            onClick={() => {
              setState((prev) => ({
                ...prev,
                projects: prev.projects.map((p) =>
                  p.name === projectName
                    ? { ...p, boqDiscount: { type: p.boqDiscount?.type ?? "percent", value: p.boqDiscount?.value ?? 0, locked: true }, boqUpdatedAt: new Date().toISOString() }
                    : p,
                ),
              }));
              toast.success("ההנחה אושרה ונקבעה בפרויקט");
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            אשר וקבע הנחה
          </Button>
        )}
        <span className="text-muted-foreground">
          שווי הנחה: <b className="text-destructive">{ils(discountVal)}</b>
        </span>
        <span className="font-bold">
          סה"כ לאחר הנחה: <span className="text-primary">{ils(totalAfter)}</span>
        </span>
      </div>
      )}

      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-semibold">התקדמות ביצוע כספית</span>
          <div className="flex items-center gap-2">
            {!progressCollapsed && (
              <span className="font-bold text-primary">{summary.percent}%</span>
            )}
            <button
              type="button"
              onClick={() => setProgressCollapsed((v) => !v)}
              className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={progressCollapsed ? "הרחב התקדמות" : "צמצם התקדמות"}
              title={progressCollapsed ? "הרחב התקדמות" : "צמצם התקדמות"}
            >
              {progressCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {!progressCollapsed && <Progress value={summary.percent} />}
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          אין עדיין כתב כמויות לפרויקט זה.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="p-2">סעיף</th>
                <th className="p-2">תיאור</th>
                <th className="p-2">יח'</th>
                <th className="p-2">כמות</th>
                {!readOnly && <th className="p-2">מחיר יח'</th>}
                {!readOnly && <th className="p-2">סה"כ</th>}
                <th className="p-2">בוצע</th>
                <th className="p-2">% ביצוע</th>
                {!readOnly && <th className="p-2">שווי שבוצע</th>}
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const qty = Number(i.quantity) || 0;
                const done = Math.min(Number(i.doneQty) || 0, qty);
                const pct = qty > 0 ? Math.round((done / qty) * 100) : 0;
                const complete = qty > 0 && done >= qty;
                return (
                  <tr
                    key={i.id}
                    className={`border-b border-border/60 ${complete ? "bg-emerald-50/60" : ""}`}
                  >
                    <td className="p-2 text-muted-foreground">{i.code || "—"}</td>
                    <td className="p-2">
                      {readOnly ? (
                        i.description
                      ) : (
                        <Input
                          value={i.description}
                          onChange={(e) => update(i.id, { description: e.target.value })}
                          className="h-8 min-w-[180px] text-xs"
                        />
                      )}
                    </td>
                    <td className="p-2">{i.unit || "—"}</td>
                    <td className="p-2">
                      {readOnly ? (
                        qty
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          value={qty}
                          onChange={(e) => update(i.id, { quantity: Number(e.target.value) || 0 })}
                          className="h-8 w-20 text-xs"
                        />
                      )}
                    </td>
                    {!readOnly && (
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          value={i.unitPrice}
                          onChange={(e) => update(i.id, { unitPrice: Number(e.target.value) || 0 })}
                          className="h-8 w-24 text-xs"
                        />
                      </td>
                    )}
                    {!readOnly && (
                      <td className="p-2 font-medium">{ils(qty * (Number(i.unitPrice) || 0))}</td>
                    )}
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={qty}
                          value={done}
                          onChange={(e) =>
                            update(i.id, {
                              doneQty: Math.min(Math.max(Number(e.target.value) || 0, 0), qty),
                            })
                          }
                          className="h-8 w-20 text-xs"
                        />
                        {(
                          <button
                            type="button"
                            title="סמן כבוצע במלואו"
                            onClick={() => update(i.id, { doneQty: complete ? 0 : qty })}
                            className={`rounded-md p-1 transition-colors ${
                              complete
                                ? "text-emerald-600"
                                : "text-muted-foreground hover:text-emerald-600"
                            }`}
                          >
                            <CheckCircle2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <span className={complete ? "font-bold text-emerald-600" : "font-medium"}>
                        {pct}%
                      </span>
                    </td>
                    {!readOnly && (
                      <td className="p-2 font-bold text-primary">
                        {ils(done * (Number(i.unitPrice) || 0))}
                      </td>
                    )}
                    <td className="p-2">
                      {!readOnly && (
                        <button
                          type="button"
                          title="מחק שורה"
                          onClick={() =>
                            patchProject((prev) => prev.filter((row) => row.id !== i.id))
                          }
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!readOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={addRow}
              className="mt-3 w-full border-dashed"
            >
              <Plus className="size-4" />
              הוסף שורה חדשה ידנית — תיכנס מיד לחישוב הסיכומים
            </Button>
          )}
        </div>
      )}
      {project?.boqUpdatedAt && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          עודכן לאחרונה: {new Date(project.boqUpdatedAt).toLocaleString("he-IL")}
        </p>
      )}
    </div>
  );
}

function SummaryBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        accent ? "border-primary/30 bg-primary/10" : "border-border bg-background/60"
      }`}
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-base font-bold ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
