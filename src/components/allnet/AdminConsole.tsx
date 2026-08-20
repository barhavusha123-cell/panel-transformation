import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Download,
  FolderKanban,
  HardHat,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { useAllNet } from "@/lib/allnet/store";
import { ROLES, type Project, type Role } from "@/lib/allnet/types";
import { daysAgoISO, downloadCsv, formatHoursMinutes, nowStamp, todayISO } from "@/lib/allnet/utils";
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

export function AdminConsole() {
  const { state, setState } = useAllNet();
  const [view, setView] = useState<"console" | "dashboard" | "projects">("console");

  // KPI date ranges
  const [empRange, setEmpRange] = useState({ from: daysAgoISO(30), to: todayISO() });
  const [subRange, setSubRange] = useState({ from: daysAgoISO(30), to: todayISO() });

  // report filters
  const [projFilter, setProjFilter] = useState<string[]>([]);
  const [subFilter, setSubFilter] = useState<string[]>([]);
  const [workerFilter, setWorkerFilter] = useState<string[]>([]);

  // dashboard project selection
  const allProjectNames = useMemo(() => {
    const names: string[] = [];
    for (const p of state.projects) {
      if (!names.includes(p.name)) names.push(p.name);
      for (const s of p.subs) if (!names.includes(s)) names.push(s);
    }
    return names;
  }, [state.projects]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const selectedDash = allProjectNames.filter((n) => !excluded.includes(n));

  const inRange = (d: string, r: { from: string; to: string }) => d >= r.from && d <= r.to;

  const workerMinutes = state.hours
    .filter((h) => h.role !== "קבלן משנה" && inRange(h.date, empRange))
    .reduce((a, h) => a + h.minutes, 0);
  const subMinutes = state.hours
    .filter((h) => h.role === "קבלן משנה" && inRange(h.date, subRange))
    .reduce((a, h) => a + h.minutes, 0);

  const dashRows = selectedDash.map((name) => {
    let manager = "לא הוגדר";
    let budget = 100;
    const direct = state.projects.find((p) => p.name === name);
    if (direct) {
      manager = direct.manager;
      budget = direct.budget;
    } else {
      const parent = state.projects.find((p) => p.subs.includes(name));
      if (parent) {
        manager = parent.manager;
        budget = parent.budget;
      }
    }
    const minutes = state.hours
      .filter((h) => h.project === name || h.sub === name)
      .reduce((a, h) => a + h.minutes, 0);
    const reported = Math.round((minutes / 60) * 100) / 100;
    const pct = budget > 0 ? Math.round((reported / budget) * 1000) / 10 : 0;
    return { name, manager, budget, reported, pct };
  });
  const alerts = dashRows.filter((r) => r.pct >= 80);

  // reports
  const filteredHours = state.hours.filter(
    (h) =>
      (!projFilter.length || projFilter.includes(h.project)) &&
      (!subFilter.length || subFilter.includes(h.sub)) &&
      (!workerFilter.length || workerFilter.includes(h.reporter)),
  );
  const allSubs = [...new Set(state.projects.flatMap((p) => p.subs))];

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
  const [np, setNp] = useState({ name: "", manager: "", budget: 100 });
  const addProject = (e: React.FormEvent) => {
    e.preventDefault();
    const name = np.name.trim();
    if (!name) return;
    setState((prev) => {
      const exists = prev.projects.some((p) => p.name === name);
      return {
        ...prev,
        projects: exists
          ? prev.projects.map((p) =>
              p.name === name
                ? { ...p, manager: np.manager || "לא הוגדר", budget: Number(np.budget) }
                : p,
            )
          : [
              ...prev.projects,
              {
                name,
                subs: [],
                manager: np.manager || "לא הוגדר",
                budget: Number(np.budget),
              },
            ],
      };
    });
    toast.success(`הפרויקט '${name}' עודכן בהצלחה עם תקציב של ${np.budget} שעות.`);
    setNp({ name: "", manager: "", budget: 100 });
  };

  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    subs: string;
    manager: string;
    budget: number;
  }>({ name: "", subs: "", manager: "", budget: 100 });

  const startEdit = (p: Project) => {
    setEditTarget(p.name);
    setEditForm({
      name: p.name,
      subs: p.subs.join(", "),
      manager: p.manager,
      budget: p.budget,
    });
  };

  const saveProject = (e: React.FormEvent) => {
    e.preventDefault();
    const subs = editForm.subs
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.name === editTarget
          ? {
              name: editForm.name.trim(),
              subs,
              manager: editForm.manager,
              budget: Number(editForm.budget),
            }
          : p,
      ),
    }));
    setEditTarget(null);
    toast.success("הפרויקט עודכן בהצלחה.");
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

  if (view === "projects") {
    return (
      <div className="mx-auto max-w-7xl px-5 pb-16">
        <div className="animate-rise surface-panel rounded-2xl p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <ListChecks className="size-5 text-primary" />
              רשימת כל הפרויקטים במערכת
            </h2>
            <Button variant="soft" onClick={() => setView("console")}>
              <ArrowRight className="size-4" />
              חזרה למרכז הבקרה הראשי
            </Button>
          </div>
          {state.projects.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם הפרויקט</TableHead>
                  <TableHead className="text-right">מנהל פרויקט</TableHead>
                  <TableHead className="text-right">תקציב שעות</TableHead>
                  <TableHead className="text-right">תתי-פרויקטים</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.projects.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.manager}</TableCell>
                    <TableCell>{p.budget.toLocaleString()}</TableCell>
                    <TableCell>{p.subs.join(", ") || "אין"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">אין פרויקטים רשומים במערכת כרגע.</p>
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
          value={String(state.projects.length)}
          icon={<Briefcase className="size-4" />}
        >
          <button
            onClick={() => setView("projects")}
            className="mt-2 cursor-pointer text-xs text-primary underline-offset-4 hover:underline"
          >
            צפה בכל הפרויקטים
          </button>
        </KpiCard>

        <KpiCard title='סה"כ שעות עובדים' icon={<Users className="size-4" />} delay={80}>
          <div className="text-xl font-bold">{formatHoursMinutes(workerMinutes)}</div>
          <div className="mt-3 flex gap-2">
            <Input
              type="date"
              value={empRange.from}
              onChange={(e) => setEmpRange({ ...empRange, from: e.target.value })}
              className="h-8 text-xs"
            />
            <Input
              type="date"
              value={empRange.to}
              onChange={(e) => setEmpRange({ ...empRange, to: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
        </KpiCard>

        <KpiCard title='סה"כ שעות קבלני משנה' icon={<HardHat className="size-4" />} delay={160}>
          <div className="text-xl font-bold">{formatHoursMinutes(subMinutes)}</div>
          <div className="mt-3 flex gap-2">
            <Input
              type="date"
              value={subRange.from}
              onChange={(e) => setSubRange({ ...subRange, from: e.target.value })}
              className="h-8 text-xs"
            />
            <Input
              type="date"
              value={subRange.to}
              onChange={(e) => setSubRange({ ...subRange, to: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
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

          {state.projects.length ? (
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="surface-panel rounded-2xl p-6">
                <h3 className="mb-4 text-lg font-semibold">התפלגות פרויקטים</h3>
                {dashRows.length ? (
                  <ResponsiveContainer width="100%" height={340}>
                    <PieChart>
                      <Pie
                        data={dashRows.map((r) => ({ ...r, value: 1 }))}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="45%"
                        outerRadius="80%"
                        paddingAngle={2}
                        label={({ payload }) =>
                          `${(payload as { name: string; pct: number }).name} · ${(payload as { pct: number }).pct}%`
                        }
                      >
                        {dashRows.map((r, i) => (
                          <Cell
                            key={r.name}
                            fill={r.pct >= 80 ? "var(--destructive)" : CHART_COLORS[i % 6]}
                            stroke="var(--background)"
                            strokeWidth={2}
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

              <div className="space-y-6">
                <div className="surface-panel rounded-2xl p-6">
                  <h3 className="mb-4 text-lg font-semibold">טבלת סיכום פרויקטים</h3>
                  <div className="space-y-3">
                    {dashRows.map((r) => (
                      <div key={r.name} className="rounded-xl border border-border p-3">
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
                      </div>
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
            <div className="surface-panel grid gap-4 rounded-2xl p-5 md:grid-cols-3">
              <FilterGroup
                label="סנן לפי פרויקט"
                options={state.projects.map((p) => p.name)}
                selected={projFilter}
                onToggle={(v) => toggle(projFilter, v, setProjFilter)}
              />
              <FilterGroup
                label="סנן לפי תת-פרויקט"
                options={allSubs}
                selected={subFilter}
                onToggle={(v) => toggle(subFilter, v, setSubFilter)}
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
                        "תת פרויקט": h.sub,
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
                        <TableHead className="text-right">תת פרויקט</TableHead>
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
                          <TableCell>{h.project}</TableCell>
                          <TableCell>{h.sub || "—"}</TableCell>
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
                  <Label>תקציב שעות מוקצה (100%)</Label>
                  <Input
                    type="number"
                    min={1}
                    step={10}
                    value={np.budget}
                    onChange={(e) => setNp({ ...np, budget: Number(e.target.value) })}
                  />
                </div>
              </div>
              <Button type="submit" variant="brand" className="mt-5">
                שמור ואתחל פרויקט
              </Button>
            </form>

            <div className="surface-panel rounded-2xl p-6">
              <h3 className="mb-4 text-lg font-semibold">ניהול ועריכת פרויקטים קיימים</h3>
              {state.projects.length ? (
                <div className="space-y-3">
                  {state.projects.map((p) => (
                    <div key={p.name} className="rounded-xl border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.manager} · {p.budget} שעות · {p.subs.join(", ") || "אין תתי-פרויקטים"}
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
                              <Label>תתי-פרויקטים (מופרדים בפסיקים)</Label>
                              <Input
                                value={editForm.subs}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, subs: e.target.value })
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
                              <Label>תקציב שעות מוקצה (100%)</Label>
                              <Input
                                type="number"
                                min={1}
                                step={10}
                                value={editForm.budget}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, budget: Number(e.target.value) })
                                }
                              />
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

  return (
    <AccordionItem value={username}>
      <AccordionTrigger className="text-right">
        <span className="flex items-center gap-3">
          <span className="brand-gradient flex size-8 items-center justify-center rounded-full text-xs font-bold text-primary-foreground">
            {user.full_name.charAt(0)}
          </span>
          {user.full_name}
          <Badge variant="outline" className="text-xs">
            {user.role}
          </Badge>
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
