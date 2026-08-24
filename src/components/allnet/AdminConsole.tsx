import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Briefcase,
  Download,
  FolderKanban,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { useAllNet } from "@/lib/allnet/store";
import {
  MAX_BUDGET,
  MIN_BUDGET,
  REGIONS,
  ROLES,
  type Project,
  type Region,
  type Role,
} from "@/lib/allnet/types";
import { downloadCsv, nowStamp, todayISO } from "@/lib/allnet/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentList } from "./DocumentList";
import { ProjectHoursDetail } from "./ProjectHoursDetail";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function KpiCard({
  title,
  value,
  icon,
  children,
  delay = 0,
}: {
  title: string;
  value?: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="animate-rise hover-lift surface-panel rounded-2xl p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <span className="brand-gradient flex size-9 items-center justify-center rounded-lg text-primary-foreground">
          {icon}
        </span>
      </div>
      {value && <div className="text-2xl font-bold">{value}</div>}
      {children}
    </div>
  );
}

const RAD = Math.PI / 180;

function SliceLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  payload?: { name: string; pct: number };
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
      fill="var(--foreground)"
      style={{ fontSize: 12, fontWeight: 700 }}
    >
      <tspan x={x} dy="-0.4em">
        {short}
      </tspan>
      <tspan x={x} dy="1.35em" style={{ fontSize: 11, fontWeight: 600, opacity: 0.9 }}>
        {payload.pct}%
      </tspan>
    </text>
  );
}

export function AdminConsole() {
  const { state, setState } = useAllNet();
  const [view, setView] = useState<"console" | "dashboard" | "projects" | "archive">("console");
  const [detailProject, setDetailProject] = useState<string | null>(null);

  useEffect(() => {
    const goHome = () => {
      setDetailProject(null);
      setView("console");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("allnet:home", goHome);
    return () => window.removeEventListener("allnet:home", goHome);
  }, []);



  // report filters
  const [projFilter, setProjFilter] = useState<string[]>([]);
  const [workerFilter, setWorkerFilter] = useState<string[]>([]);

  const activeProjects = useMemo(
    () => state.projects.filter((p) => !p.archived),
    [state.projects],
  );
  const archivedProjects = useMemo(
    () => state.projects.filter((p) => p.archived),
    [state.projects],
  );

  const allProjectNames = useMemo(() => activeProjects.map((p) => p.name), [activeProjects]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const selectedDash = allProjectNames.filter((n) => !excluded.includes(n));

  // overrun panel
  const [showOverruns, setShowOverruns] = useState(false);
  const [threshold, setThreshold] = useState("80");
  const [overrunManager, setOverrunManager] = useState("all");
  const [showDelivery, setShowDelivery] = useState(false);

  const upcoming = useMemo(() => {
    const today = todayISO();
    const dayMs = 86400000;
    return activeProjects
      .filter((p) => !!p.deliveryDate)
      .map((p) => ({
        name: p.name,
        deliveryDate: p.deliveryDate!,
        daysLeft: Math.round(
          (new Date(`${p.deliveryDate!}T00:00:00`).getTime() -
            new Date(`${today}T00:00:00`).getTime()) /
            dayMs,
        ),
      }))
      .filter((p) => p.daysLeft <= 14)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [activeProjects]);


  const rowFor = (name: string) => {
    const p = state.projects.find((x) => x.name === name);
    const manager = p?.manager ?? "לא הוגדר";
    const budget = p?.budget ?? 100;
    const minutes = state.hours
      .filter((h) => h.project === name)
      .reduce((a, h) => a + h.minutes, 0);
    const reported = Math.round((minutes / 60) * 100) / 100;
    const pct = budget > 0 ? Math.round((reported / budget) * 1000) / 10 : 0;
    return { name, manager, budget, reported, pct };
  };

  const dashRows = selectedDash.map(rowFor);
  const allActiveRows = allProjectNames.map(rowFor);
  const alerts = allActiveRows.filter((r) => r.pct >= 80).sort((a, b) => b.pct - a.pct);
  const overrunRows = allActiveRows
    .filter((r) => r.pct >= Number(threshold))
    .filter((r) => overrunManager === "all" || r.manager === overrunManager)
    .sort((a, b) => b.pct - a.pct);

  // reports
  const filteredHours = state.hours.filter(
    (h) =>
      (!projFilter.length || projFilter.includes(h.project)) &&
      (!workerFilter.length || workerFilter.includes(h.reporter)),
  );

  const toggle = (arr: string[], v: string, set: (x: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // user form
  const [nu, setNu] = useState({ username: "", password: "", full_name: "", role: ROLES[0]! });
  const addUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nu.username || !nu.password || !nu.full_name) return;
    if (state.users.some((u) => u.username === nu.username.trim())) {
      toast.error("שם המשתמש כבר קיים במערכת.");
      return;
    }
    setState((prev) => ({
      ...prev,
      users: [
        ...prev.users,
        {
          username: nu.username.trim(),
          password: nu.password.trim(),
          full_name: nu.full_name.trim(),
          role: nu.role,
        },
      ],
    }));
    toast.success(`המשתמש ${nu.full_name} נוצר בהצלחה.`);
    setNu({ username: "", password: "", full_name: "", role: ROLES[0]! });
  };

  // project form
  const managers = state.users.map((u) => u.full_name);
  const [np, setNp] = useState({ name: "", manager: "", budget: 100, deliveryDate: "" });

  const validBudget = (v: number) =>
    Number.isFinite(v) && Number.isInteger(v) && v >= MIN_BUDGET && v <= MAX_BUDGET;

  const addProject = (e: React.FormEvent) => {
    e.preventDefault();
    const name = np.name.trim();
    if (!name) {
      toast.error("אנא הזן שם פרויקט.");
      return;
    }
    const budget = Math.round(Number(np.budget));
    if (!validBudget(budget)) {
      toast.error(`תקציב השעות חייב להיות מספר שלם בין ${MIN_BUDGET} ל-${MAX_BUDGET}.`);
      return;
    }
    setState((prev) => {
      const exists = prev.projects.some((p) => p.name === name);
      return {
        ...prev,
        projects: exists
          ? prev.projects.map((p) =>
              p.name === name
                ? {
                    ...p,
                    manager: np.manager || "לא הוגדר",
                    budget,
                    deliveryDate: np.deliveryDate,
                  }
                : p,
            )
          : [
              ...prev.projects,
              {
                name,
                manager: np.manager || "לא הוגדר",
                budget,
                deliveryDate: np.deliveryDate,
                team: np.manager ? [np.manager] : [],
                archived: false,
              },
            ],
      };
    });
    toast.success(`הפרויקט '${name}' עודכן בהצלחה עם תקציב של ${budget} שעות.`);
    setNp({ name: "", manager: "", budget: 100, deliveryDate: "" });
  };

  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    manager: string;
    budget: number;
    team: string[];
    deliveryDate: string;
  }>({ name: "", manager: "", budget: 100, team: [], deliveryDate: "" });

  const startEdit = (p: Project) => {
    setEditTarget(p.name);
    setEditForm({
      name: p.name,
      manager: p.manager,
      budget: p.budget,
      team: p.team ?? [],
      deliveryDate: p.deliveryDate ?? "",
    });
  };

  const saveProject = (e: React.FormEvent) => {
    e.preventDefault();
    const budget = Math.round(Number(editForm.budget));
    if (!validBudget(budget)) {
      toast.error(`תקציב השעות חייב להיות מספר שלם בין ${MIN_BUDGET} ל-${MAX_BUDGET}.`);
      return;
    }
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.name === editTarget
          ? {
              ...p,
              name: editForm.name.trim(),
              manager: editForm.manager,
              budget,
              deliveryDate: editForm.deliveryDate,
              team: editForm.team,
            }
          : p,
      ),
    }));
    setEditTarget(null);
    toast.success("הפרויקט עודכן בהצלחה.");
  };

  const setArchived = (name: string, archived: boolean) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.name === name ? { ...p, archived } : p)),
    }));
    toast.success(archived ? `הפרויקט '${name}' הועבר לארכיון.` : `הפרויקט '${name}' שוחזר.`);
  };

  // file upload
  const [fileProject, setFileProject] = useState("כללי");
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    setState((prev) => ({
      ...prev,
      files: [
        ...prev.files,
        {
          id: crypto.randomUUID(),
          name: file.name,
          dataUrl,
          uploadedBy: "מנהל מערכת",
          uploadedAt: nowStamp(),
          size: `${Math.round((file.size / (1024 * 1024)) * 100) / 100} MB`,
          project: fileProject,
        },
      ],
    }));
    toast.success(`הקובץ '${file.name}' הועלה בהצלחה.`);
    e.target.value = "";
  };

  if (detailProject) {
    return (
      <div className="mx-auto max-w-7xl px-5 pb-16">
        <ProjectHoursDetail projectName={detailProject} onBack={() => setDetailProject(null)} />
      </div>
    );
  }

  if (view === "projects" || view === "archive") {
    const isArchive = view === "archive";
    const list = isArchive ? archivedProjects : activeProjects;
    return (
      <div className="mx-auto max-w-7xl px-5 pb-16">
        <div className="animate-rise surface-panel rounded-2xl p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              {isArchive ? (
                <Archive className="size-5 text-primary" />
              ) : (
                <ListChecks className="size-5 text-primary" />
              )}
              {isArchive ? "ארכיון פרויקטים" : "רשימת כל הפרויקטים הפעילים"}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="soft"
                onClick={() => setView(isArchive ? "projects" : "archive")}
              >
                {isArchive ? <ListChecks className="size-4" /> : <Archive className="size-4" />}
                {isArchive ? "פרויקטים פעילים" : `ארכיון (${archivedProjects.length})`}
              </Button>
              <Button variant="soft" onClick={() => setView("console")}>
                <ArrowRight className="size-4" />
                חזרה למרכז הבקרה הראשי
              </Button>
            </div>
          </div>
          {list.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם הפרויקט</TableHead>
                  <TableHead className="text-right">מנהל פרויקט</TableHead>
                  <TableHead className="text-right">תקציב שעות</TableHead>
                  <TableHead className="text-right">צוות משויך</TableHead>
                  <TableHead className="text-right">ניצול</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => {
                  const r = rowFor(p.name);
                  return (
                    <TableRow key={p.name} className="transition-colors hover:bg-surface-2/60">
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setDetailProject(p.name)}
                          className="cursor-pointer font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          {p.name}
                        </button>
                      </TableCell>
                      <TableCell>{p.manager}</TableCell>
                      <TableCell>{p.budget.toLocaleString()}</TableCell>
                      <TableCell className="max-w-64 truncate text-xs text-muted-foreground">
                        {p.team?.length ? p.team.join(", ") : "לא שויך"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.pct >= 80 ? "destructive" : "secondary"}>{r.pct}%</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setArchived(p.name, !isArchive)}
                        >
                          {isArchive ? (
                            <ArchiveRestore className="size-4" />
                          ) : (
                            <Archive className="size-4" />
                          )}
                          {isArchive ? "שחזר" : "העבר לארכיון"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isArchive ? "אין פרויקטים בארכיון." : "אין פרויקטים רשומים במערכת כרגע."}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-16">
      <h2 className="animate-rise mb-6 text-2xl font-bold">
        מרכז <span className="text-gradient">בקרה ניהולי</span>
      </h2>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="פרויקטים פעילים"
          value={String(activeProjects.length)}
          icon={<Briefcase className="size-4" />}
        >
          <div className="mt-2 flex gap-3 text-xs">
            <button
              onClick={() => setView("projects")}
              className="cursor-pointer text-primary underline-offset-4 hover:underline"
            >
              צפה בכל הפרויקטים
            </button>
            <button
              onClick={() => setView("archive")}
              className="cursor-pointer text-muted-foreground underline-offset-4 hover:underline"
            >
              ארכיון ({archivedProjects.length})
            </button>
          </div>
        </KpiCard>

        <KpiCard title="פרויקטים לפני מסירה" icon={<CalendarClock className="size-4" />} delay={80}>
          <div className="text-2xl font-bold">{upcoming.length}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {upcoming.length ? `הקרוב: ${upcoming[0]!.name} · ${upcoming[0]!.deliveryDate}` : "אין מסירות ב-14 הימים הקרובים"}
          </p>
          <Button
            variant="soft"
            size="sm"
            className="mt-3 w-full"
            onClick={() => setShowDelivery((s) => !s)}
          >
            {showDelivery ? "סגור רשימה" : "הצג פרויקטים לפני מסירה"}
          </Button>
        </KpiCard>

        <KpiCard title="פרויקטים לפני חריגת שעות" icon={<AlertTriangle className="size-4" />} delay={160}>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${alerts.length ? "text-destructive" : ""}`}>
              {alerts.length}
            </span>
            {alerts.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                חריגה מעל 80%
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {alerts.length ? `הגבוה ביותר: ${alerts[0]!.name} · ${alerts[0]!.pct}%` : "כל הפרויקטים בתקציב"}
          </p>
          <Button
            variant={alerts.length ? "brand" : "soft"}
            size="sm"
            className="mt-3 w-full"
            onClick={() => setShowOverruns((s) => !s)}
          >
            {showOverruns ? "סגור רשימה" : "הצג פרויקטים לפני חריגת שעות"}
          </Button>
        </KpiCard>

        <KpiCard title="דשבורד ואנליטיקה" icon={<BarChart3 className="size-4" />} delay={240}>
          <Button
            variant="brand"
            className="mt-1 w-full"
            onClick={() => setView(view === "dashboard" ? "console" : "dashboard")}
          >
            {view === "dashboard" ? "סגור דשבורד" : "הצג דשבורד"}
          </Button>
        </KpiCard>
      </div>

      {showDelivery && (
        <div className="animate-fade surface-panel mb-8 rounded-2xl p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <CalendarClock className="size-5 text-primary" />
            פרויקטים לפני מסירה
          </h3>
          {upcoming.length ? (
            <div className="space-y-3">
              {upcoming.map((p) => {
                const r = rowFor(p.name);
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setDetailProject(p.name)}
                    className="hover-lift w-full cursor-pointer rounded-xl border border-border p-3 text-right transition-all hover:border-primary/50"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{p.name}</span>
                      <Badge variant={p.daysLeft <= 7 ? "destructive" : "secondary"}>
                        {p.daysLeft < 0
                          ? `באיחור ${Math.abs(p.daysLeft)} ימים`
                          : `${p.daysLeft} ימים למסירה`}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      מועד מסירה: {p.deliveryDate} · {r.manager} · {r.reported} מתוך {r.budget} שעות
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              אין פרויקטים שמועד המסירה שלהם בתוך 14 הימים הקרובים.
            </p>
          )}
        </div>
      )}

      {showOverruns && (
        <div className="animate-fade surface-panel mb-8 rounded-2xl p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="size-5 text-destructive" />
            פרויקטים לפני חריגת שעות
          </h3>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>סף חריגה</Label>
              <Select value={threshold} onValueChange={setThreshold}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80">מעל 80%</SelectItem>
                  <SelectItem value="90">מעל 90%</SelectItem>
                  <SelectItem value="100">מעל 100%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>סנן לפי מנהל פרויקט</Label>
              <Select value={overrunManager} onValueChange={setOverrunManager}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המנהלים</SelectItem>
                  {[...new Set(activeProjects.map((p) => p.manager))].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {overrunRows.length ? (
            <div className="space-y-3">
              {overrunRows.map((r) => (
                <button
                  key={r.name}
                  type="button"
                  onClick={() => setDetailProject(r.name)}
                  className="hover-lift w-full cursor-pointer rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-right transition-all"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{r.name}</span>
                    <Badge variant="destructive">{r.pct}%</Badge>
                  </div>
                  <Progress value={Math.min(r.pct, 100)} className="my-2 h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {r.manager} · {r.reported} מתוך {r.budget} שעות · לחץ לצפייה בדיווחים
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              אין פרויקטים העונים לסינון הנוכחי.
            </p>
          )}
        </div>
      )}


      {view === "dashboard" ? (
        <div className="animate-fade space-y-6">
          {alerts.map((a) => (
            <div
              key={a.name}
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              התרעת תקציב: פרויקט '{a.name}' הגיע ל-{a.pct}% מהתקציב ({a.reported} מתוך {a.budget}{" "}
              שעות). נדרש מעקב.
            </div>
          ))}

          {activeProjects.length ? (
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="space-y-6">
                <div className="surface-panel rounded-2xl p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">התפלגות פרויקטים</h3>
                  </div>

                  {dashRows.length ? (
                    <ResponsiveContainer width="100%" height={340}>
                      <PieChart>
                        <Pie
                          data={dashRows.map((r) => ({ ...r, value: 1 }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="42%"
                          outerRadius="82%"
                          paddingAngle={2}
                          labelLine={false}
                          label={SliceLabel}
                          isAnimationActive
                        >
                          {dashRows.map((r, i) => (
                            <Cell
                              key={r.name}
                              fill={CHART_COLORS[i % 6]}
                              stroke="var(--background)"
                              strokeWidth={2}
                              className="cursor-pointer"
                              onClick={() => setDetailProject(r.name)}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            color: "var(--popover-foreground)",
                          }}
                          formatter={(_v, _n, item) => {
                            const p = item.payload as (typeof dashRows)[number];
                            return [`${p.reported} / ${p.budget} שעות · ${p.pct}%`, p.name];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      אנא בחר לפחות פרויקט אחד להצגה בדשבורד.
                    </p>
                  )}
                </div>



              </div>

              <div className="space-y-6">
                <div className="surface-panel rounded-2xl p-6">
                  <h3 className="mb-4 text-lg font-semibold">טבלת סיכום פרויקטים</h3>
                  <div className="space-y-3">
                    {dashRows.map((r) => (
                      <button
                        key={r.name}
                        type="button"
                        onClick={() => setDetailProject(r.name)}
                        className="w-full cursor-pointer rounded-xl border border-border p-3 text-right transition-colors hover:border-primary/50"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold">{r.name}</span>
                          <Badge variant={r.pct >= 80 ? "destructive" : "secondary"}>
                            {r.pct}%
                          </Badge>
                        </div>
                        <Progress value={Math.min(r.pct, 100)} className="my-2 h-1.5" />
                        <p className="text-xs text-muted-foreground">
                          {r.manager} · {r.reported} מתוך {r.budget} שעות
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="surface-panel rounded-2xl p-6">
                  <h3 className="mb-3 text-lg font-semibold">סינון פרויקטים בדשבורד</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {allProjectNames.map((n) => (
                      <label key={n} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={!excluded.includes(n)}
                          onCheckedChange={() =>
                            setExcluded((prev) =>
                              prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
                            )
                          }
                        />
                        {n}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="surface-panel rounded-2xl p-6 text-sm text-muted-foreground">
              אין פרויקטים מוגדרים במערכת. ניתן להגדיר פרויקטים תחת לשונית 'ניהול פרויקטים
              וקבצים'.
            </p>
          )}
        </div>
      ) : (
        <Tabs defaultValue="reports" dir="rtl" className="animate-fade">
          <TabsList className="bg-surface-2/70 p-1">
            <TabsTrigger
              value="reports"
              className="data-[state=active]:brand-gradient rounded-lg data-[state=active]:text-primary-foreground"
            >
              יומן דיווחים וסינונים
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:brand-gradient rounded-lg data-[state=active]:text-primary-foreground"
            >
              ניהול משתמשים
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="data-[state=active]:brand-gradient rounded-lg data-[state=active]:text-primary-foreground"
            >
              ניהול פרויקטים וקבצים
            </TabsTrigger>
          </TabsList>

          {/* Reports */}
          <TabsContent value="reports" className="mt-6 space-y-4">
            <div className="surface-panel grid gap-4 rounded-2xl p-5 md:grid-cols-2">
              <FilterGroup
                label="סנן לפי פרויקט"
                options={state.projects.map((p) => p.name)}
                selected={projFilter}
                onToggle={(v) => toggle(projFilter, v, setProjFilter)}
              />
              <FilterGroup
                label="סנן לפי עובד / קבלן"
                options={state.users.map((u) => u.full_name)}
                selected={workerFilter}
                onToggle={(v) => toggle(workerFilter, v, setWorkerFilter)}
              />
            </div>

            <div className="surface-panel rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">יומן דיווחי שעות</h3>
                <Button
                  variant="soft"
                  onClick={() =>
                    downloadCsv(
                      filteredHours.map((h) => ({
                        "שם המדווח": h.reporter,
                        פרויקט: h.project,
                        תאריך: h.date,
                        משעה: h.from,
                        "עד שעה": h.to,
                        "זמן עבודה": h.worked,
                        "שעות עשרוני": h.decimal,
                        הערות: h.notes,
                        "תוספות/שינויים חריגים": h.extras,
                      })),
                      "hours_report.csv",
                    )
                  }
                >
                  <Download className="size-4" />
                  ייצא דוח מלא ל-CSV
                </Button>
              </div>
              {filteredHours.length ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">שם המדווח</TableHead>
                        <TableHead className="text-right">פרויקט</TableHead>
                        <TableHead className="text-right">תאריך</TableHead>
                        <TableHead className="text-right">משעה</TableHead>
                        <TableHead className="text-right">עד שעה</TableHead>
                        <TableHead className="text-right">זמן עבודה</TableHead>
                        <TableHead className="text-right">חריגים</TableHead>
                        <TableHead className="text-right">הערות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHours.map((h) => (
                        <TableRow key={h.id} className="transition-colors hover:bg-surface-2/60">
                          <TableCell className="font-medium">{h.reporter}</TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => setDetailProject(h.project)}
                              className="cursor-pointer text-primary underline-offset-4 hover:underline"
                            >
                              {h.project}
                            </button>
                          </TableCell>
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
                  אין דיווחים התואמים לסינון הנוכחי.
                </p>
              )}
            </div>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="mt-6 space-y-6">
            <form onSubmit={addUser} className="surface-panel rounded-2xl p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Plus className="size-5 text-primary" />
                הוסף משתמש חדש
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>שם משתמש</Label>
                  <Input
                    value={nu.username}
                    onChange={(e) => setNu({ ...nu, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>שם מלא</Label>
                  <Input
                    value={nu.full_name}
                    onChange={(e) => setNu({ ...nu, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>סיסמה</Label>
                  <Input
                    value={nu.password}
                    onChange={(e) => setNu({ ...nu, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>תפקיד</Label>
                  <Select
                    value={nu.role}
                    onValueChange={(v) => setNu({ ...nu, role: v as Role })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" variant="brand" className="mt-5">
                צור משתמש חדש
              </Button>
            </form>

            <div className="surface-panel rounded-2xl p-6">
              <h3 className="mb-4 text-lg font-semibold">רשימת המשתמשים הקיימים במערכת</h3>
              {state.users.length ? (
                <Accordion type="single" collapsible className="w-full">
                  {state.users.map((u) => (
                    <UserRow key={u.username} username={u.username} />
                  ))}
                </Accordion>
              ) : (
                <p className="text-sm text-muted-foreground">אין משתמשים רשומים במערכת.</p>
              )}
            </div>
          </TabsContent>

          {/* Projects & files */}
          <TabsContent value="projects" className="mt-6 space-y-6">
            <form onSubmit={addProject} className="surface-panel rounded-2xl p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <FolderKanban className="size-5 text-primary" />
                הגדרת פרויקטים
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>שם הפרויקט</Label>
                  <Input value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>מנהל פרויקט אחראי</Label>
                  <Select value={np.manager} onValueChange={(v) => setNp({ ...np, manager: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר מנהל" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>תקציב שעות מוקצה (1-1000)</Label>
                  <Input
                    type="number"
                    min={MIN_BUDGET}
                    max={MAX_BUDGET}
                    step={1}
                    value={np.budget}
                    onChange={(e) => setNp({ ...np, budget: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>מועד מסירה</Label>
                  <Input
                    type="date"
                    className="w-full"
                    value={np.deliveryDate}
                    onChange={(e) => setNp({ ...np, deliveryDate: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" variant="brand" className="mt-5">
                שמור ואתחל פרויקט
              </Button>
            </form>

            <div className="surface-panel rounded-2xl p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">ניהול ועריכת פרויקטים קיימים</h3>
                <Button variant="soft" size="sm" onClick={() => setView("archive")}>
                  <Archive className="size-4" />
                  ארכיון ({archivedProjects.length})
                </Button>
              </div>
              {activeProjects.length ? (
                <div className="space-y-3">
                  {activeProjects.map((p) => (
                    <div key={p.name} className="rounded-xl border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <button
                            type="button"
                            onClick={() => setDetailProject(p.name)}
                            className="cursor-pointer font-semibold text-primary underline-offset-4 hover:underline"
                          >
                            {p.name}
                          </button>
                          <p className="text-xs text-muted-foreground">
                            {p.manager} · {p.budget} שעות ·{" "}
                            {p.team?.length ? `צוות: ${p.team.join(", ")}` : "לא שויך צוות"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="soft" onClick={() => startEdit(p)}>
                            <Pencil className="size-4" />
                            ערוך
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setArchived(p.name, true)}
                          >
                            <Archive className="size-4" />
                            ארכיון
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setState((prev) => ({
                                ...prev,
                                projects: prev.projects.filter((x) => x.name !== p.name),
                              }));
                              toast.success(`הפרויקט '${p.name}' נמחק בהצלחה.`);
                            }}
                          >
                            <Trash2 className="size-4" />
                            מחק
                          </Button>
                        </div>
                      </div>

                      {editTarget === p.name && (
                        <form onSubmit={saveProject} className="animate-fade mt-4 space-y-4">
                          <Separator />
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>שם הפרויקט</Label>
                              <Input
                                value={editForm.name}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, name: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>מנהל פרויקט אחראי</Label>
                              <Select
                                value={editForm.manager}
                                onValueChange={(v) => setEditForm({ ...editForm, manager: v })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="בחר מנהל" />
                                </SelectTrigger>
                                <SelectContent>
                                  {managers.map((m) => (
                                    <SelectItem key={m} value={m}>
                                      {m}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>תקציב שעות מוקצה (1-1000)</Label>
                              <Input
                                type="number"
                                min={MIN_BUDGET}
                                max={MAX_BUDGET}
                                step={1}
                                value={editForm.budget}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, budget: Number(e.target.value) })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>מועד מסירה</Label>
                              <Input
                                type="date"
                                className="w-full"
                                value={editForm.deliveryDate}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, deliveryDate: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>צוות משויך לפרויקט (ניתן לבחור כמה עובדים)</Label>
                              <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2 md:grid-cols-3">
                                {state.users.map((u) => (
                                  <label
                                    key={u.username}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <Checkbox
                                      checked={editForm.team.includes(u.full_name)}
                                      onCheckedChange={() =>
                                        setEditForm((prev) => ({
                                          ...prev,
                                          team: prev.team.includes(u.full_name)
                                            ? prev.team.filter((x) => x !== u.full_name)
                                            : [...prev.team, u.full_name],
                                        }))
                                      }
                                    />
                                    {u.full_name}
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" variant="brand">
                              שמור שינויים בפרויקט
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setEditTarget(null)}
                            >
                              ביטול
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">אין פרויקטים רשומים במערכת עדיין.</p>
              )}
            </div>

            <div className="surface-panel space-y-4 rounded-2xl p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Upload className="size-5 text-primary" />
                העלאת מסמכים ותוכניות
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>בחר קובץ</Label>
                  <Input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.dwg,.xlsx,.docx"
                    onChange={handleUpload}
                  />
                </div>
                <div className="space-y-2">
                  <Label>שייך לפרויקט</Label>
                  <Select value={fileProject} onValueChange={setFileProject}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="כללי">כללי</SelectItem>
                      {state.projects.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="surface-panel space-y-4 rounded-2xl p-6">
              <h3 className="text-lg font-semibold">ספריית מסמכי המערכת</h3>
              <DocumentList isAdmin />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.length ? (
          options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-all duration-300 ${
                selected.includes(o)
                  ? "brand-gradient border-transparent text-primary-foreground"
                  : "border-border bg-surface-2/60 text-muted-foreground hover:border-primary/50 hover:text-primary"
              }`}
            >
              {o}
            </button>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">אין ערכים זמינים</span>
        )}
      </div>
    </div>
  );
}

function UserRow({ username }: { username: string }) {
  const { state, setState } = useAllNet();
  const user = state.users.find((u) => u.username === username);
  const [form, setForm] = useState({
    full_name: user?.full_name ?? "",
    password: user?.password ?? "",
    role: (user?.role ?? ROLES[0]!) as Role,
  });
  if (!user) return null;

  const userProjects = state.projects.filter(
    (p) => !p.archived && (p.team?.includes(user.full_name) || p.manager === user.full_name),
  );

  const toggleProject = (name: string) =>
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.name === name
          ? {
              ...p,
              team: (p.team ?? []).includes(user.full_name)
                ? (p.team ?? []).filter((x) => x !== user.full_name)
                : [...(p.team ?? []), user.full_name],
            }
          : p,
      ),
    }));

  return (
    <AccordionItem value={username}>
      <AccordionTrigger className="text-right">
        <span className="flex flex-wrap items-center gap-3">
          <span className="brand-gradient flex size-8 items-center justify-center rounded-full text-xs font-bold text-primary-foreground">
            {user.full_name.charAt(0)}
          </span>
          {user.full_name}
          <Badge variant="outline" className="text-xs">
            {user.role}
          </Badge>
          {userProjects.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {userProjects.length} פרויקטים
            </Badge>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid gap-4 pt-2 md:grid-cols-3">
          <div className="space-y-2">
            <Label>שם מלא</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>שינוי סיסמה</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>תפקיד</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label>שיוך לפרויקטים (ניתן לבחור מספר פרויקטים)</Label>
          {state.projects.filter((p) => !p.archived).length ? (
            <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2 md:grid-cols-3">
              {state.projects
                .filter((p) => !p.archived)
                .map((p) => (
                  <label key={p.name} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={(p.team ?? []).includes(user.full_name)}
                      onCheckedChange={() => toggleProject(p.name)}
                    />
                    {p.name}
                  </label>
                ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">אין פרויקטים פעילים לשיוך.</p>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="brand"
            onClick={() => {
              setState((prev) => ({
                ...prev,
                users: prev.users.map((u) =>
                  u.username === username
                    ? {
                        ...u,
                        full_name: form.full_name.trim(),
                        password: form.password.trim(),
                        role: form.role,
                      }
                    : u,
                ),
              }));
              toast.success("פרטי המשתמש עודכנו בהצלחה.");
            }}
          >
            שמור שינויים
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => {
              setState((prev) => ({
                ...prev,
                users: prev.users.filter((u) => u.username !== username),
              }));
              toast.success("המשתמש הוסר בהצלחה.");
            }}
          >
            <Trash2 className="size-4" />
            מחק משתמש
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
