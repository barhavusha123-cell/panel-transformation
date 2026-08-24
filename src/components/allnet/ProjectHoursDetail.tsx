import { useMemo } from "react";
import { ArrowRight, Download, HardHat, Users } from "lucide-react";
import { useAllNet } from "@/lib/allnet/store";
import { downloadCsv, formatHoursMinutes } from "@/lib/allnet/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HoursEntry } from "@/lib/allnet/types";

function HoursGroup({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  rows: HoursEntry[];
}) {
  const minutes = rows.reduce((a, h) => a + h.minutes, 0);
  return (
    <div className="surface-panel rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          {icon}
          {title}
        </h3>
        <Badge variant="secondary">{formatHoursMinutes(minutes)}</Badge>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם המדווח</TableHead>
                <TableHead className="text-right">תפקיד</TableHead>
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right">משעה</TableHead>
                <TableHead className="text-right">עד שעה</TableHead>
                <TableHead className="text-right">זמן עבודה</TableHead>
                <TableHead className="text-right">חריגים</TableHead>
                <TableHead className="text-right">הערות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((h) => (
                <TableRow key={h.id} className="transition-colors hover:bg-surface-2/60">
                  <TableCell className="font-medium">{h.reporter}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{h.role}</TableCell>
                  <TableCell>{h.date}</TableCell>
                  <TableCell>{h.from}</TableCell>
                  <TableCell>{h.to}</TableCell>
                  <TableCell className="text-primary">{h.worked}</TableCell>
                  <TableCell>{h.extras || "—"}</TableCell>
                  <TableCell className="max-w-48 truncate">{h.notes || "—"}</TableCell>
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
    </div>
  );
}

export function ProjectHoursDetail({
  projectName,
  onBack,
}: {
  projectName: string;
  onBack: () => void;
}) {
  const { state } = useAllNet();
  const project = state.projects.find((p) => p.name === projectName);

  const rows = useMemo(
    () => state.hours.filter((h) => h.project === projectName).slice().reverse(),
    [state.hours, projectName],
  );

  const employees = rows.filter((h) => h.role !== "קבלן משנה");
  const subs = rows.filter((h) => h.role === "קבלן משנה");
  const subDays = subs.reduce(
    (a, h) => a + (h.minutes >= MIN_FULL_DAY_MINUTES ? Math.max(1, h.workers ?? 1) : 0),
    0,
  );
  const totalMinutes = rows.reduce((a, h) => a + h.minutes, 0);
  const reported = Math.round((totalMinutes / 60) * 100) / 100;
  const budget = project?.budget ?? 0;
  const pct = budget > 0 ? Math.round((reported / budget) * 1000) / 10 : 0;

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
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="soft"
              onClick={() =>
                downloadCsv(
                  rows.map((h) => ({
                    "שם המדווח": h.reporter,
                    תפקיד: h.role,
                    פרויקט: h.project,
                    תאריך: h.date,
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
          <p className="text-xs text-muted-foreground">סה״כ שעות קבלני משנה</p>
          <p className="text-xl font-bold text-primary">
            {formatHoursMinutes(subs.reduce((a, h) => a + h.minutes, 0))}
          </p>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
          <p className="text-xs text-muted-foreground">סה״כ שעות בפרויקט</p>
          <p className="text-xl font-bold text-primary">{formatHoursMinutes(totalMinutes)}</p>
        </div>
      </div>

      <HoursGroup title="עובדי החברה" icon={<Users className="size-5 text-primary" />} rows={employees} />
      <HoursGroup title="קבלני משנה" icon={<HardHat className="size-5 text-primary" />} rows={subs} />
    </div>
  );
}
