import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Eye,
  HardHat,
  Paperclip,
  Pencil,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useAllNet } from "@/lib/allnet/store";
import {
  downloadCsv,
  downloadExcelMonthReport,
  employeeDayCosts,
  formatDateIL,
  formatHoursMinutes,
  nowStamp,
} from "@/lib/allnet/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DocumentList } from "./DocumentList";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CATEGORY_LABELS,
  EMPLOYEE_DAY_RATE,
  EMPLOYEE_HOUR_RATE,
  effectiveBudget,
  MIN_FULL_DAY_MINUTES,
  SUB_CREW_SIZE,
  subDayRate,
  type FileRecord,
  type HoursEntry,
} from "@/lib/allnet/types";

const RAD = Math.PI / 180;

function ProfitSliceLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  payload?: { name: string };
  percent?: number;
}) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, payload } = props;
  if (!payload) return null;
  if ((props.percent ?? 0) < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  const short = payload.name.length > 14 ? `${payload.name.slice(0, 13)}…` : payload.name;
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      className="pointer-events-none"
      fill="#000000"
      style={{ fontSize: 13, fontWeight: 600 }}
    >
      <tspan x={x} dy="-0.5em">
        {short}
      </tspan>
      <tspan x={x} dy="1.25em" style={{ fontSize: 12, fontWeight: 600 }}>
        {Math.round((props.percent ?? 0) * 100)}%
      </tspan>
    </text>
  );
}

function HoursGroup({
  title,
  icon,
  rows,
  markPartialDays = false,
  showWorkers = false,
  projectName,
}: {
  title: string;
  icon: React.ReactNode;
  rows: HoursEntry[];
  markPartialDays?: boolean;
  showWorkers?: boolean;
  projectName: string;
}) {
  const minutes = rows.reduce((a, h) => a + h.minutes, 0);
  const [attView, setAttView] = useState<HoursEntry | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="surface-panel rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          {icon}
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{formatHoursMinutes(minutes)}</Badge>
          <Button
            size="sm"
            className="bg-blue-900 text-white hover:bg-blue-800"
            onClick={() => {
              if (!rows.length) {
                toast.info("אין דיווחים לייצוא בקטגוריה זו");
                return;
              }
              downloadExcelMonthReport(
                rows,
                `דוח שעות מפורט · ${title} · ${projectName}`,
                `דוח_שעות_${title}_${projectName}.xls`,
              );
              toast.success("הדוח יוצא לאקסל בהצלחה");
            }}
          >
            <FileSpreadsheet className="size-4" />
            ייצא לאקסל (לפי חודשים)
          </Button>
          <Button
            size="sm"
            variant="soft"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
          >
            <ChevronDown
              className={`size-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
            />
            {collapsed ? "הצג פירוט" : "צמצם"}
          </Button>
        </div>
      </div>
      {collapsed ? null : rows.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם המדווח</TableHead>
                <TableHead className="text-right">תפקיד</TableHead>
                {showWorkers && <TableHead className="text-right">עובדים באתר</TableHead>}
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right">משעה</TableHead>
                <TableHead className="text-right">עד שעה</TableHead>
                <TableHead className="text-right">זמן עבודה</TableHead>
                <TableHead className="text-right">חריגים</TableHead>
                <TableHead className="text-right">הערות</TableHead>
                <TableHead className="text-right">צרופות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((h) => (
                <TableRow key={h.id} className="transition-colors hover:bg-surface-2/60">
                  <TableCell className="font-medium">{h.reporter}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{h.role}</TableCell>
                  {showWorkers && (
                    <TableCell className="text-xs">
                      {h.workers ?? 1} · {h.workerNames || "—"}
                    </TableCell>
                  )}
                  <TableCell>{formatDateIL(h.date)}</TableCell>
                  <TableCell>{h.from}</TableCell>
                  <TableCell>{h.to}</TableCell>
                  <TableCell className="text-primary">
                    <span>{h.worked}</span>
                    {markPartialDays && h.minutes < MIN_FULL_DAY_MINUTES && (
                      <Badge variant="outline" className="mr-2 text-[10px] font-normal">
                        לא נספר כיום עבודה
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{h.extras || "—"}</TableCell>
                  <TableCell className="max-w-48 truncate">{h.notes || "—"}</TableCell>
                  <TableCell>
                    {h.attachments?.length ? (
                      <Button size="sm" variant="soft" onClick={() => setAttView(h)}>
                        <Eye className="size-4" />
                        {h.attachments.length} צפייה
                      </Button>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          אין דיווחים בקטגוריה זו.
        </p>
      )}

      <Dialog open={!!attView} onOpenChange={(o) => !o && setAttView(null)}>
        <DialogContent dir="rtl" className="max-w-3xl text-right">
          <DialogHeader>
            <DialogTitle className="text-right">
              צרופות לדיווח — {attView?.reporter} ·{" "}
              {attView ? formatDateIL(attView.date) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2">
            {(attView?.attachments ?? []).map((a) => (
              <div key={a.id} className="rounded-xl border border-border p-3">
                {a.isImage ? (
                  <img
                    src={a.dataUrl}
                    alt={a.name}
                    className="max-h-72 w-full rounded-lg object-contain"
                  />
                ) : (
                  <p className="flex items-center gap-2 text-sm">
                    <Paperclip className="size-4" />
                    {a.name}
                  </p>
                )}
                <a
                  href={a.dataUrl}
                  download={a.name}
                  className="mt-2 inline-block text-xs text-primary underline"
                >
                  הורדה
                </a>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ProjectHoursDetail({
  projectName,
  onBack,
  onEdit,
}: {
  projectName: string;
  onBack: () => void;
  onEdit?: (() => void) | undefined;
}) {
  const { state } = useAllNet();
  const project = state.projects.find((p) => p.name === projectName);
  const [costsCollapsed, setCostsCollapsed] = useState(false);

  const rows = useMemo(
    () => state.hours.filter((h) => h.project === projectName).slice().reverse(),
    [state.hours, projectName],
  );

  const employees = rows.filter((h) => h.role !== "קבלן משנה");
  const subs = rows.filter((h) => h.role === "קבלן משנה");
  const partialSubs = subs.filter((h) => h.minutes < MIN_FULL_DAY_MINUTES).length;
  const fullSubDays = subs.filter((h) => h.minutes >= MIN_FULL_DAY_MINUTES);
  const subDays = new Set(fullSubDays.map((h) => h.date)).size;
  const totalMinutes = rows.reduce((a, h) => a + h.minutes, 0);

  const region = project?.region ?? "מרכז";
  // עלות קבלני משנה: מחירון יום עבודה לפי מספר עובדים ואיזור
  const subBreakdown = Array.from(new Set(fullSubDays.map((h) => h.date)))
    .sort()
    .map((date) => {
      const dayRows = fullSubDays.filter((h) => h.date === date);
      const workers = Math.max(...dayRows.map((h) => h.workers ?? SUB_CREW_SIZE));
      const names = Array.from(
        new Set(dayRows.map((h) => h.workerNames).filter(Boolean) as string[]),
      ).join(", ");
      const approved = dayRows.length > 0 && dayRows.every((h) => h.approved);
      const approvedAt = approved
        ? dayRows
            .map((h) => h.approvedAt)
            .filter(Boolean)
            .sort()
            .pop()
        : undefined;
      const approvedBy = approved
        ? dayRows.find((h) => h.approvedBy)?.approvedBy
        : undefined;
      return { date, workers, names, rate: subDayRate(region, workers), approved, approvedAt, approvedBy };
    });
  const subCost = subBreakdown.reduce((sum, d) => sum + d.rate, 0);
  // עלות עובדי חברה: 1,200 ₪ ליום עבודה לעובד
  const employeeCostRows = employeeDayCosts(employees);
  const employeeFullDays = employeeCostRows.filter((d) => d.fullDay);
  const employeePartialDays = employeeCostRows.filter((d) => !d.fullDay);
  const employeeFullDaysCost = employeeFullDays.reduce((a, d) => a + d.cost, 0);
  const employeePartialCost = employeePartialDays.reduce((a, d) => a + d.cost, 0);
  const employeePartialHours =
    Math.round(employeePartialDays.reduce((a, d) => a + d.hours, 0) * 100) / 100;
  const employeeDays = employeeFullDays.length;
  const employeeCost = employeeFullDaysCost + employeePartialCost;
  const totalCost = subCost + employeeCost;
  const fixedCosts = project?.fixedCosts ?? [];
  const fixedCostTotal = fixedCosts.reduce((a, c) => a + (Number(c.amount) || 0), 0);
  const extraHours = Number(project?.extraHours) || 0;
  const extraHoursCost = extraHours * (EMPLOYEE_DAY_RATE / 8);
  const saleAmount = (Number(project?.saleAmount) || 0) + (Number(project?.additions) || 0);
  const spent = totalCost + fixedCostTotal + extraHoursCost;
  const profit = saleAmount - spent;
  const profitPct = saleAmount > 0 ? Math.round((profit / saleAmount) * 1000) / 10 : 0;
  const profitData = [
    { name: "עלות עבודה (עובדים וקבלנים)", value: totalCost, color: "hsl(207 65% 62%)" },
    { name: "עלויות קבועות", value: fixedCostTotal, color: "hsl(38 75% 62%)" },
    ...(extraHoursCost > 0
      ? [
          {
            name: "שעות חריגות מאושרות",
            value: extraHoursCost,
            color: "hsl(280 55% 58%)",
          },
        ]
      : []),
    {
      name: profit >= 0 ? "רווח" : "הפסד",
      value: Math.abs(profit),
      color: profit >= 0 ? "hsl(150 55% 48%)" : "hsl(0 70% 58%)",
    },
  ].filter((d) => d.value > 0);
  const ils = (n: number) => `${Math.round(n).toLocaleString("he-IL")} ₪`;
  const reported = Math.round((totalMinutes / 60) * 100) / 100;
  const budget = effectiveBudget(project);
  const pct = budget > 0 ? Math.round((reported / budget) * 1000) / 10 : 0;

  /** תאריך המעבר לקטגוריה (עם נפילה חזרה לתאריך סגירת הפרויקט לפרויקטים ישנים) */
  const categorizedAt = project?.categorizedAt ?? project?.closure?.closedAt;
  const warranty = (() => {
    if (!project?.archived) return null;
    if ((project.category ?? "warranty") !== "warranty") return null;
    if (!categorizedAt) return null;
    const end = new Date(categorizedAt);
    end.setFullYear(end.getFullYear() + 1);
    return {
      endsAt: end.toISOString(),
      daysLeft: Math.ceil((end.getTime() - Date.now()) / 86400000),
    };
  })();


  return (
    <div className="animate-fade space-y-6">
      <div className="surface-panel rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">
              דיווחי שעות · <span className="text-gradient">{projectName}</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              {project?.manager ?? "לא הוגדר"} · {reported} מתוך {budget} שעות
              {project?.extraHours
                ? ` (כולל ${project.extraHours} שעות חריגות מאושרות${project.extraHoursReason ? ` · ${project.extraHoursReason}` : ""})`
                : ""}
              {project?.budgetDays ? ` · תקציב ${project.budgetDays} ימי עבודה` : ""}
            </p>
            {project?.archived && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {CATEGORY_LABELS[project.category ?? "warranty"]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  תאריך מעבר לקטגוריה:{" "}
                  {categorizedAt ? formatDateIL(categorizedAt.slice(0, 10)) : "לא תועד"}
                </span>
                {warranty && (
                  <>
                    <span className="text-xs text-muted-foreground">
                      סיום שנת שירות: {formatDateIL(warranty.endsAt.slice(0, 10))}
                    </span>
                    <Badge variant={warranty.daysLeft <= 30 ? "destructive" : "secondary"}>
                      {warranty.daysLeft <= 0
                        ? "שנת השירות הסתיימה — יש לשלוח חידוש הסכם שירות"
                        : warranty.daysLeft <= 30
                          ? `מסיים שנת שירות בעוד ${warranty.daysLeft} ימים — יש לשלוח הסכם שירות`
                          : `נותרו ${warranty.daysLeft} ימים לסיום שנת השירות`}
                    </Badge>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {onEdit && (
              <Button variant="brand" onClick={onEdit}>
                <Pencil className="size-4" />
                ערוך פרויקט
              </Button>
            )}
            <Button
              variant="soft"
              onClick={() =>
                downloadCsv(
                  rows.map((h) => ({
                    "שם המדווח": h.reporter,
                    תפקיד: h.role,
                    פרויקט: h.project,
                    תאריך: formatDateIL(h.date),
                    משעה: h.from,
                    "עד שעה": h.to,
                    "זמן עבודה": h.worked,
                    "שעות עשרוני": h.decimal,
                    הערות: h.notes,
                    "תוספות/שינויים חריגים": h.extras,
                  })),
                  `hours_${projectName}.csv`,
                )
              }
            >
              <Download className="size-4" />
              ייצא ל-CSV
            </Button>
            <Button variant="soft" onClick={onBack}>
              <ArrowRight className="size-4" />
              חזרה
            </Button>
          </div>
        </div>

        <Progress value={Math.min(pct, 100)} className="h-3" />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-semibold">ניצול תקציב</span>
          <Badge
            variant={pct >= 80 ? "destructive" : "secondary"}
            className="px-4 py-1 text-xl font-bold"
          >
            {pct}%
          </Badge>
        </div>
      </div>

      <div className="surface-panel grid gap-4 rounded-2xl p-5 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface/70 p-4">
          <p className="text-xs text-muted-foreground">סה״כ שעות עובדי החברה</p>
          <p className="text-xl font-bold text-primary">
            {formatHoursMinutes(employees.reduce((a, h) => a + h.minutes, 0))}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface/70 p-4">
          <p className="text-xs text-muted-foreground">סה״כ ימי עבודה לקבלני משנה</p>
          <p className="text-xl font-bold text-primary">{subDays} ימי עבודה</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            נספרים רק דיווחים של 3 שעות ומעלה
            {partialSubs > 0 && ` · ${partialSubs} דיווחים קצרים לא נספרו`}
          </p>
        </div>
      </div>

      <div className="surface-panel rounded-2xl p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="size-5 text-primary" />
            רווחיות הפרויקט
          </h3>
          {saleAmount > 0 && (
            <Badge
              variant={profit >= 0 ? "secondary" : "destructive"}
              className="px-4 py-1 text-lg font-bold"
            >
              {profitPct}% רווחיות
            </Badge>
          )}
        </div>
        <p className="mb-4 text-sm font-medium text-muted-foreground">
          {projectName}
        </p>
        {saleAmount > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[0.65fr_1fr]">
            <div className="h-96 w-full lg:h-[26rem]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={profitData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="42%"
                    outerRadius="90%"
                    paddingAngle={2}
                    labelLine={false}
                    label={ProfitSliceLabel}
                    isAnimationActive={false}
                  >
                    {profitData.map((d) => (
                      <Cell key={d.name} fill={d.color} stroke="hsl(var(--background))" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => ils(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-4">
              <div className="self-start rounded-xl border border-border bg-surface/60 p-4">
                <h4 className="mb-3 text-sm font-semibold">מקרא צבעים</h4>
                <div className="space-y-3">
                  {profitData.map((d) => (
                    <div key={d.name} className="flex items-center gap-3">
                      <span
                        className="inline-block size-4 shrink-0 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{ils(d.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 self-start text-sm">
                <div className="flex items-center justify-between rounded-lg border border-border p-2">
                  <span>סכום מכירת הפרויקט</span>
                  <span className="font-bold">{ils(saleAmount)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-2">
                  <span>עלות עבודה מדווחת</span>
                  <span className="font-bold">{ils(totalCost)}</span>
                </div>
                <div className="rounded-lg border border-border p-2">
                  <div className="flex items-center justify-between">
                    <span>עלויות קבועות</span>
                    <span className="font-bold">{ils(fixedCostTotal)}</span>
                  </div>
                  {fixedCosts.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between py-0.5 text-[11px] text-muted-foreground"
                    >
                      <span>
                        {c.type}
                        {c.description ? ` · ${c.description}` : ""}
                      </span>
                      <span>{ils(Number(c.amount) || 0)}</span>
                    </div>
                  ))}
                </div>
                {extraHoursCost > 0 && (
                  <div className="flex items-center justify-between rounded-lg border border-border p-2">
                    <span>
                      שעות חריגות מאושרות ({extraHours} שעות × {ils(EMPLOYEE_DAY_RATE / 8)})
                      {project?.extraHoursReason ? ` · ${project.extraHoursReason}` : ""}
                    </span>
                    <span className="font-bold">{ils(extraHoursCost)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 p-2">
                  <span className="font-semibold">{profit >= 0 ? "רווח נותר" : "הפסד"}</span>
                  <span className="text-lg font-bold text-primary">{ils(Math.abs(profit))}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  הרווחיות מתעדכנת אוטומטית ככל שנוספים דיווחי שעות לפרויקט.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            להצגת פאי הרווחיות יש להגדיר בעריכת הפרויקט את סכום המכירה ואת העלויות הקבועות.
          </p>
        )}
      </div>

      <HoursGroup title="עובדי החברה" icon={<Users className="size-5 text-primary" />} rows={employees} projectName={projectName} />
      <HoursGroup
        title="קבלני משנה"
        icon={<HardHat className="size-5 text-primary" />}
        rows={subs}
        markPartialDays
        showWorkers
        projectName={projectName}
      />

      <ProjectFiles projectName={projectName} />

      <div className="surface-panel rounded-2xl p-5">
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">עלויות עובדים וקבלנים · איזור {region}</p>
            <Button
              size="sm"
              variant="soft"
              onClick={() => setCostsCollapsed((c) => !c)}
              aria-expanded={!costsCollapsed}
            >
              <ChevronDown
                className={`size-4 transition-transform ${costsCollapsed ? "" : "rotate-180"}`}
              />
              {costsCollapsed ? "הצג פירוט" : "צמצם"}
            </Button>
          </div>
          {!costsCollapsed && (
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span>עלות קבלני משנה ({subDays} ימי עבודה)</span>
              <span className="font-bold text-primary">{ils(subCost)}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              מחירון יום עבודה קבלני ({region}):{" "}
              {[1, 2, 3, 4]
                .map((n) => `${n} עובדים ${ils(subDayRate(region, n))}`)
                .join(" · ")}
            </p>
            {subBreakdown.length > 0 && (
              <div className="rounded-lg border border-primary/20 bg-background/50 p-2 text-[11px]">
                <p className="mb-1 font-semibold">פירוט חישוב קבלני משנה</p>
                {subBreakdown.map((d) => (
                  <div key={d.date} className="flex flex-col gap-0.5 py-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        {formatDateIL(d.date)} · {d.workers} עובדים{d.names ? ` (${d.names})` : ""} × יום עבודה
                      </span>
                      <span className="font-medium">{ils(d.rate)}</span>
                    </div>
                    {d.approved ? (
                      <span className="text-[11px] font-medium text-emerald-700">
                        ✓ השעות אושרו ע״י מנהל הפרויקט{d.approvedBy ? ` (${d.approvedBy})` : ""}
                        {d.approvedAt ? ` · ${formatDateIL(d.approvedAt.slice(0, 10))} ${d.approvedAt.slice(11, 16)}` : ""}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-blue-600">
                        ממתין לאישור מנהל הפרויקט
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>
                עלות ימי עבודה מלאים ({employeeDays} × {ils(EMPLOYEE_DAY_RATE)})
              </span>
              <span className="font-bold text-primary">{ils(employeeFullDaysCost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>
                עלות שעות חלקיות ({employeePartialHours} שעות × {ils(EMPLOYEE_HOUR_RATE)})
              </span>
              <span className="font-bold text-primary">{ils(employeePartialCost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">סה״כ עלות עובדי חברה</span>
              <span className="font-bold text-primary">{ils(employeeCost)}</span>
            </div>
            {employeeCostRows.length > 0 && (
              <div className="rounded-lg border border-primary/20 bg-background/50 p-2 text-[11px]">
                <p className="mb-1 font-semibold">פירוט חישוב עובדי חברה (כל תאריך בנפרד)</p>
                <p className="mb-1 text-muted-foreground">
                  נוסחה: דיווח של 5 שעות ומעלה ביום = יום עבודה מלא {ils(EMPLOYEE_DAY_RATE)} · פחות
                  מ-5 שעות = שעות × {ils(EMPLOYEE_HOUR_RATE)}
                </p>
                {employeeCostRows.map((d) => (
                  <div key={d.key} className="flex items-center justify-between gap-2 py-0.5">
                    <span className="text-muted-foreground">
                      {formatDateIL(d.date)} · {d.reporter} ·{" "}
                      {d.fullDay
                        ? `יום עבודה מלא (${d.hours} שעות)`
                        : `${d.hours} שעות × ${ils(EMPLOYEE_HOUR_RATE)}`}
                    </span>
                    <span className="font-medium">{ils(d.cost)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-primary/20 pt-1">
              <span className="font-semibold">סה״כ עלות</span>
              <span className="text-lg font-bold text-primary">{ils(totalCost)}</span>
            </div>
          </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            סה״כ שעות בפרויקט: {formatHoursMinutes(totalMinutes)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProjectFiles({ projectName }: { projectName: string }) {
  const { setState } = useAllNet();
  const [busy, setBusy] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    if (!list.length) return;
    setBusy(true);
    try {
      const records = await Promise.all(
        list.map(
          (file) =>
            new Promise<FileRecord>((resolve) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  id: crypto.randomUUID(),
                  name: file.name,
                  dataUrl: String(reader.result),
                  uploadedBy: "מנהל מערכת",
                  uploadedAt: nowStamp(),
                  size: `${Math.round((file.size / (1024 * 1024)) * 100) / 100} MB`,
                  project: projectName,
                });
              reader.readAsDataURL(file);
            }),
        ),
      );
      setState((prev) => ({ ...prev, files: [...prev.files, ...records] }));
      toast.success(
        records.length === 1
          ? `הקובץ '${records[0]!.name}' שויך לפרויקט '${projectName}'.`
          : `${records.length} קבצים שויכו לפרויקט '${projectName}'.`,
      );
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <Paperclip className="size-5 text-primary" />
          קבצים ומסמכים של הפרויקט
        </h3>
        <Button asChild size="sm" disabled={busy}>
          <label className="cursor-pointer">
            <Upload className="size-4" />
            {busy ? "מעלה..." : "הוסף קבצים"}
            <input type="file" multiple className="hidden" onChange={handleUpload} />
          </label>
        </Button>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        הקבצים שיועלו כאן משויכים אוטומטית לפרויקט "{projectName}".
      </p>
      <DocumentList projectFilter={projectName} isAdmin />
    </div>
  );
}

