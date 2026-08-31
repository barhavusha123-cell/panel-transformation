import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Archive,
  ArchiveRestore,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ChevronDown,

  CalendarClock,
  Briefcase,
  Download,
  FolderKanban,
  ListChecks,
  Headset,
  Pencil,
  Paperclip,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,

} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { FixedCostsEditor } from "./FixedCostsEditor";
import { ServiceCallsAdmin } from "./ServiceCalls";
import { toast } from "sonner";
import { useAllNet } from "@/lib/allnet/store";
import {
  CATEGORY_LABELS,
  MIN_BUDGET,
  PROJECT_CATEGORIES,
  REGIONS,
  ROLES,
  SUB_DAY_RATES,
  effectiveBudget,
  type FixedCost,
  type Project,
  type ProjectCategory,
  type Region,
  type Role,
} from "@/lib/allnet/types";

import {
  calculateProjectCost,
  downloadCsv,
  formatDateIL,
  formatHoursMinutes,
  getAllTimeOptions,
  minutesBetween,
  nowStamp,
  todayISO,
} from "@/lib/allnet/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ProjectHoursDetail } from "./ProjectHoursDetail";


const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function RegionRates({ region }: { region: Region }) {
  const rates = SUB_DAY_RATES[region];
  const ils = (n: number) => `${n.toLocaleString("he-IL")} ₪`;
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 p-2 text-[11px] leading-relaxed">
      <p className="font-semibold">
        מחירון יום עבודה קבלני · {region}
        {region === "מרכז" ? " (מחירון מוזל)" : " (מחירון יקר)"}
      </p>
      <p className="text-muted-foreground">
        עובד 1: {ils(rates[1]!)} · צוות 2 עובדים: {ils(rates[2]!)} · 3 עובדים: {ils(rates[3]!)} ·
        4 עובדים: {ils(rates[4]!)}
      </p>
      <p className="text-muted-foreground">עובד חברה: 1,200 ₪ ליום עבודה</p>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  children,
  delay = 0,
  titleClassName,
  valueClassName,
}: {
  title: string;
  value?: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  delay?: number;
  titleClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="animate-rise hover-lift surface-panel rounded-2xl p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className={cn("text-base font-bold text-foreground", titleClassName)}>
          {title}
        </span>
        <span className="brand-gradient flex size-9 items-center justify-center rounded-lg text-primary-foreground">
          {icon}
        </span>
      </div>
      {value && <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>}
      {children}
    </div>
  );
}

/** תאריך מסירה בפועל (YYYY-MM-DD) */
const handoverOf = (p: Project): string | undefined =>
  p.handoverDate ??
  p.closure?.deliveryDate ??
  (p.categorizedAt ?? p.closure?.closedAt)?.slice(0, 10);

/** תאריך סיום שירות (YYYY-MM-DD) — ידני, אחרת שנה מתאריך המסירה */
const serviceEndOf = (p: Project): string | undefined => {
  if (p.serviceEndDate) return p.serviceEndDate;
  const h = handoverOf(p);
  if (!h) return undefined;
  const d = new Date(`${h}T00:00:00`);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

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
      fill="#111111"
      style={{ fontSize: 16, fontWeight: 700 }}
    >
      <tspan x={x} dy="-0.5em">
        {short}
      </tspan>
      <tspan x={x} dy="1.3em" style={{ fontSize: 14, fontWeight: 600 }}>
        {Math.round(payload.pct)}%
      </tspan>
    </text>
  );
}

export function AdminConsole() {
  const { state, setState } = useAllNet();
  const [view, setView] = useState<"console" | "dashboard" | "projects" | "archive" | "service">(
    "console",
  );
  const [categoryView, setCategoryView] = useState<ProjectCategory>("warranty");
  /** פרויקט שנמצא בתהליך סגירה (טופס שאלות סגירה) */
  type ClosureKey =
    | "deliveredToClient"
    | "docFileSaved"
    | "docFileSentToClient"
    | "equipmentOnSite"
    | "invoiceIssued";
  const CLOSURE_QUESTIONS: { key: ClosureKey; label: string }[] = [
    { key: "deliveredToClient", label: "האם הפרויקט נמסר ללקוח?" },
    { key: "docFileSaved", label: "האם הוכן תיק תיעוד ונשמר בשרתי החברה?" },
    { key: "docFileSentToClient", label: "האם נשלח תיק תיעוד ללקוח?" },
    { key: "equipmentOnSite", label: "האם כל הציוד פונה מהאתר?" },
    { key: "invoiceIssued", label: "האם יצאה חשבונית גמר חשבון?" },
  ];
  const emptyCloseForm = (): Record<ClosureKey, boolean | null> => ({
    deliveredToClient: null,
    docFileSaved: null,
    docFileSentToClient: null,
    equipmentOnSite: null,
    invoiceIssued: null,
  });
  const [closeTarget, setCloseTarget] = useState<string | null>(null);
  const [closeForm, setCloseForm] = useState<Record<ClosureKey, boolean | null>>(emptyCloseForm());
  const [closeReasons, setCloseReasons] = useState<Partial<Record<ClosureKey, string>>>({});
  const [closeDeliveryDate, setCloseDeliveryDate] = useState("");

  const [detailProject, setDetailProject] = useState<string | null>(null);
  const [tab, setTab] = useState("reports");
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const openServiceCalls = state.serviceCalls.filter((c) => c.status !== "done").length;
  const unassignedServiceCalls = state.serviceCalls.filter((c) => !c.technician).length;

  useEffect(() => {
    const goHome = () => {
      setDetailProject(null);
      setView("console");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("allnet:home", goHome);
    return () => window.removeEventListener("allnet:home", goHome);
  }, []);

  // רענון אוטומטי של הדשבורד כל חצי שעה
  useEffect(() => {
    const interval = window.setInterval(
      () => window.location.reload(),
      30 * 60 * 1000,
    );
    return () => window.clearInterval(interval);
  }, []);



  // report filters (per-column)
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
  const toggleColFilter = (col: string, v: string) =>
    setColFilters((prev) => {
      const cur = prev[col] ?? [];
      return { ...prev, [col]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });
  const clearColFilter = (col: string) => setColFilters((prev) => ({ ...prev, [col]: [] }));


  const activeProjects = useMemo(
    () => state.projects.filter((p) => !p.archived),
    [state.projects],
  );
  /** היסטוריית שמות לקוח ופרויקט למניעת כפילויות בכתיב */
  const clientHistory = useMemo(
    () =>
      Array.from(
        new Set(state.projects.map((p) => (p.client ?? "").trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "he")),
    [state.projects],
  );
  const projectNameHistory = useMemo(
    () =>
      Array.from(new Set(state.projects.map((p) => p.name.trim()).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "he"),
      ),
    [state.projects],
  );
  const historyDatalists = (
    <>
      <datalist id="allnet-client-history">
        {clientHistory.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="allnet-project-history">
        {projectNameHistory.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </>
  );
  const archivedProjects = useMemo(
    () => state.projects.filter((p) => p.archived),
    [state.projects],
  );
  const categoryCounts = useMemo(() => {
    const base: Record<ProjectCategory, number> = { warranty: 0, service: 0, noservice: 0 };
    for (const p of state.projects) {
      if (p.archived && p.category) base[p.category] += 1;
      else if (p.archived) base.warranty += 1;
    }
    return base;
  }, [state.projects]);
  const setProjectDate = (
    name: string,
    field: "handoverDate" | "serviceEndDate",
    value: string,
  ) =>
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((x) =>
        x.name === name ? { ...x, [field]: value } : x,
      ),
    }));

  /** פרויקטים שמסיימים את השירות בתוך 30 יום */
  const warrantyEnding = useMemo(() => {
    const dayMs = 86400000;
    const now = Date.now();
    return state.projects
      .filter((p) => p.archived && !!serviceEndOf(p))
      .map((p) => {
        const endsAt = serviceEndOf(p)!;
        return {
          name: p.name,
          client: p.client ?? "",
          startedAt: handoverOf(p) ?? "",
          endsAt,
          daysLeft: Math.ceil(
            (new Date(`${endsAt}T00:00:00`).getTime() - now) / dayMs,
          ),
        };
      })
      .filter((p) => p.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [state.projects]);

  const categoryProjects = useMemo(
    () =>
      state.projects.filter(
        (p) => p.archived && (p.category ?? "warranty") === categoryView,
      ),
    [state.projects, categoryView],
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
    const client = p?.client ?? "";
    const budget = p ? effectiveBudget(p) : 100;
    const cost = calculateProjectCost(state, name);
    const minutes = state.hours
      .filter((h) => h.project === name)
      .reduce((a, h) => a + h.minutes, 0);
    const reported = Math.round((minutes / 60) * 100) / 100;
    const pct = budget > 0 ? Math.round((reported / budget) * 1000) / 10 : 0;
    const saleBase = Number(p?.saleAmount) || 0;
    const additions = Number(p?.additions) || 0;
    const sale = saleBase + additions;
    return { name, client, manager, budget, cost, reported, pct, sale, saleBase, additions, profit: sale - cost };
  };

  const dashRows = selectedDash.map(rowFor);
  const allActiveRows = allProjectNames.map(rowFor);
  const alerts = allActiveRows.filter((r) => r.pct >= 80).sort((a, b) => b.pct - a.pct);
  const overrunRows = allActiveRows
    .filter((r) => r.pct >= Number(threshold))
    .filter((r) => overrunManager === "all" || r.manager === overrunManager)
    .sort((a, b) => b.pct - a.pct);

  // reports
  const hourClient = (h: (typeof state.hours)[number]): string =>
    (h.client ?? "").trim() ||
    (state.projects.find((p) => p.name === h.project)?.client ?? "").trim() ||
    "—";

  const hourColValue = (h: (typeof state.hours)[number], col: string): string => {
    switch (col) {
      case "reporter":
        return h.reporter;
      case "client":
        return hourClient(h);
      case "project":
        return h.project;
      case "date":
        return h.date;
      case "from":
        return h.from;
      case "to":
        return h.to;
      case "worked":
        return h.worked;
      case "extras":
        return h.extras || "—";
      case "notes":
        return h.notes || "—";
      default:
        return "";
    }
  };

  const hourColOptions = (col: string) =>
    Array.from(new Set(state.hours.map((h) => hourColValue(h, col)))).sort((a, b) =>
      a.localeCompare(b, "he"),
    );

  const filteredHours = state.hours
    .filter((h) =>
      Object.entries(colFilters).every(
        ([col, vals]) => !vals.length || vals.includes(hourColValue(h, col)),
      ),
    )
    .slice()
    .sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));


  const toggle = (arr: string[], v: string, set: (x: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // עריכת דיווח שעות (אדמין)
  const TIME_OPTIONS = getAllTimeOptions();
  const [hourEdit, setHourEdit] = useState<{
    id: number;
    project: string;
    date: string;
    from: string;
    to: string;
    notes: string;
    extras: string;
  } | null>(null);

  const [hourAtt, setHourAtt] = useState<(typeof state.hours)[number] | null>(null);

  const saveHourEdit = () => {
    if (!hourEdit) return;
    if (!hourEdit.project || !hourEdit.date || !hourEdit.from || !hourEdit.to) {
      toast.error("יש למלא פרויקט, תאריך ושעות.");
      return;
    }
    const minutes = minutesBetween(hourEdit.from, hourEdit.to);
    setState((prev) => ({
      ...prev,
      hours: prev.hours.map((h) =>
        h.id === hourEdit.id
          ? {
              ...h,
              project: hourEdit.project,
              client: (
                prev.projects.find((p) => p.name === hourEdit.project)?.client ?? ""
              ).trim(),
              date: hourEdit.date,
              from: hourEdit.from,
              to: hourEdit.to,
              minutes,
              worked: formatHoursMinutes(minutes),
              decimal: Math.round((minutes / 60) * 100) / 100,
              notes: hourEdit.notes,
              extras: hourEdit.extras,
            }
          : h,
      ),
    }));
    setHourEdit(null);
    toast.success("הדיווח עודכן בהצלחה.");
  };

  const deleteHour = (id: number) => {
    if (!confirm("האם למחוק את הדיווח לצמיתות?")) return;
    setState((prev) => ({ ...prev, hours: prev.hours.filter((h) => h.id !== id) }));
    toast.success("הדיווח נמחק.");
  };

  const hourEditDialog = (
    <Dialog open={!!hourEdit} onOpenChange={(o) => !o && setHourEdit(null)}>
      <DialogContent dir="rtl" className="text-right sm:max-w-lg">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5 text-primary" />
            עריכת דיווח שעות
          </DialogTitle>
          <DialogDescription>ניתן לעדכן פרויקט, תאריך, שעות והערות.</DialogDescription>
        </DialogHeader>
        {hourEdit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>שם פרויקט</Label>
              <Select
                value={hourEdit.project}
                onValueChange={(v) => setHourEdit({ ...hourEdit, project: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר פרויקט" />
                </SelectTrigger>
                <SelectContent>
                  {state.projects.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.client ? `${p.client} · ` : ""}
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>תאריך</Label>
              <Input
                type="date"
                value={hourEdit.date}
                max={todayISO()}
                onChange={(e) => setHourEdit({ ...hourEdit, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>זמן מחושב</Label>
              <div className="rounded-xl border border-border bg-surface-2/50 px-3 py-2 text-sm font-semibold text-primary">
                {hourEdit.from && hourEdit.to
                  ? formatHoursMinutes(minutesBetween(hourEdit.from, hourEdit.to))
                  : "—"}
              </div>
            </div>
            <div className="space-y-2">
              <Label>משעה</Label>
              <Select
                value={hourEdit.from}
                onValueChange={(v) => setHourEdit({ ...hourEdit, from: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר שעה" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>עד שעה</Label>
              <Select
                value={hourEdit.to}
                onValueChange={(v) => setHourEdit({ ...hourEdit, to: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר שעה" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>הערות</Label>
              <Input
                value={hourEdit.notes}
                onChange={(e) => setHourEdit({ ...hourEdit, notes: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>חריגים / תוספות</Label>
              <Input
                value={hourEdit.extras}
                onChange={(e) => setHourEdit({ ...hourEdit, extras: e.target.value })}
              />
            </div>
          </div>
        )}
        <DialogFooter className="flex-row-reverse justify-start gap-2">
          <Button variant="brand" onClick={saveHourEdit}>
            שמור שינויים
          </Button>
          <Button variant="secondary" onClick={() => setHourEdit(null)}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const [adminEmail, setAdminEmail] = useState(state.adminEmail ?? "");

  // user form
  const [nu, setNu] = useState({
    username: "",
    password: "",
    full_name: "",
    email: "",
    role: ROLES[0]!,
  });
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
          email: nu.email.trim(),
          role: nu.role,
        },
      ],
    }));
    toast.success(`המשתמש ${nu.full_name} נוצר בהצלחה.`);
    setNu({ username: "", password: "", full_name: "", email: "", role: ROLES[0]! });
  };

  // project form
  const managers = state.users.map((u) => u.full_name);
  const [np, setNp] = useState<{
    name: string;
    client: string;
    manager: string;
    budget: number;
    deliveryDate: string;
    region: Region;
    budgetDays: number;
    saleAmount: number;
    fixedCosts: FixedCost[];
  }>({ name: "", client: "", manager: "", budget: 100, deliveryDate: "", region: "מרכז", budgetDays: 0, saleAmount: 0, fixedCosts: [] });

  const validBudget = (v: number) => Number.isFinite(v) && Number.isInteger(v) && v >= MIN_BUDGET;

  const addProject = (e: React.FormEvent) => {
    e.preventDefault();
    const name = np.name.trim();
    if (!name) {
      toast.error("אנא הזן שם פרויקט.");
      return;
    }
    const budget = Math.round(Number(np.budget));
    if (!validBudget(budget)) {
      toast.error("שעות מנהל פרויקט / עובד חייבות להיות מספר שלם חיובי.");
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
                    client: np.client.trim(),
                    manager: np.manager || "לא הוגדר",
                    budget,
                    deliveryDate: np.deliveryDate,
                    region: np.region,
                    budgetDays: Math.max(0, Math.round(Number(np.budgetDays) || 0)),
                    saleAmount: Math.max(0, Number(np.saleAmount) || 0),
                    fixedCosts: np.fixedCosts,
                  }
                : p,
            )
          : [
              ...prev.projects,
              {
                name,
                client: np.client.trim(),
                manager: np.manager || "לא הוגדר",
                budget,
                deliveryDate: np.deliveryDate,
                region: np.region,
                budgetDays: Math.max(0, Math.round(Number(np.budgetDays) || 0)),
                saleAmount: Math.max(0, Number(np.saleAmount) || 0),
                fixedCosts: np.fixedCosts,
                extraHours: 0,
                team: np.manager ? [np.manager] : [],
                archived: false,
              },
            ],
      };
    });
    toast.success(`הפרויקט '${name}' נוצר בהצלחה עם ${budget} שעות מנהל פרויקט / עובד.`);
    setNp({ name: "", client: "", manager: "", budget: 100, deliveryDate: "", region: "מרכז", budgetDays: 0, saleAmount: 0, fixedCosts: [] });
  };

  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    client: string;
    manager: string;
    budget: number;
    team: string[];
    deliveryDate: string;
    region: Region;
    budgetDays: number;
    extraHours: number;
    extraHoursReason: string;
    saleAmount: number;
    additions: number;
    fixedCosts: FixedCost[];
  }>({
    name: "",
    client: "",
    manager: "",
    budget: 100,
    team: [],
    deliveryDate: "",
    region: "מרכז",
    budgetDays: 0,
    extraHours: 0,
    extraHoursReason: "",
    saleAmount: 0,
    additions: 0,
    fixedCosts: [],
  });

  const startEdit = (p: Project) => {
    setEditTarget(p.name);
    setEditForm({
      name: p.name,
      client: p.client ?? "",
      manager: p.manager,
      budget: p.budget,
      team: p.team ?? [],
      deliveryDate: p.deliveryDate ?? "",
      region: p.region ?? "מרכז",
      budgetDays: p.budgetDays ?? 0,
      extraHours: p.extraHours ?? 0,
      extraHoursReason: p.extraHoursReason ?? "",
      saleAmount: p.saleAmount ?? 0,
      additions: p.additions ?? 0,
      fixedCosts: p.fixedCosts ?? [],
    });
  };

  const saveProject = (e: React.FormEvent) => {
    e.preventDefault();
    const budget = Math.round(Number(editForm.budget));
    if (!validBudget(budget)) {
      toast.error("שעות מנהל פרויקט / עובד חייבות להיות מספר שלם חיובי.");
      return;
    }
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.name === editTarget
          ? {
              ...p,
              name: editForm.name.trim(),
              client: editForm.client.trim(),
              manager: editForm.manager,
              budget,
              deliveryDate: editForm.deliveryDate,
              region: editForm.region,
              budgetDays: Math.max(0, Math.round(Number(editForm.budgetDays) || 0)),
              extraHours: Math.max(0, Math.round(Number(editForm.extraHours) || 0)),
              extraHoursReason: editForm.extraHoursReason.trim(),
              saleAmount: Math.max(0, Number(editForm.saleAmount) || 0),
              additions: Math.max(0, Number(editForm.additions) || 0),
              fixedCosts: editForm.fixedCosts,
              team: editForm.team,
            }
          : p,
      ),
    }));
    setEditTarget(null);
    toast.success("הפרויקט עודכן בהצלחה.");
  };

  const projectByName = (name: string) => state.projects.find((p) => p.name === name);

  const openClosure = (name: string) => {
    const p = projectByName(name);
    const c = p?.closure;
    setCloseForm({
      deliveredToClient: c?.deliveredToClient ?? null,
      docFileSaved: c?.docFileSaved ?? null,
      docFileSentToClient: c?.docFileSentToClient ?? null,
      equipmentOnSite: c?.equipmentOnSite ?? null,
      invoiceIssued: c?.invoiceIssued ?? null,
    });
    setCloseReasons({ ...(c?.reasons ?? {}) });
    setCloseDeliveryDate(c?.deliveryDate ?? "");
    setCloseTarget(name);
  };

  const saveClosure = () => {
    if (!closeTarget) return;
    const unanswered = CLOSURE_QUESTIONS.some((q) => closeForm[q.key] === null);
    if (unanswered) {
      toast.error("יש לענות כן / לא על כל השאלות כדי להשלים את סגירת הפרויקט.");
      return;
    }
    if (closeForm.deliveredToClient && !closeDeliveryDate) {
      toast.error("יש לבחור תאריך מסירת הפרויקט (תאריך תחילת שירות).");
      return;
    }
    const missingReason = CLOSURE_QUESTIONS.find(
      (q) => closeForm[q.key] === false && !(closeReasons[q.key] ?? "").trim(),
    );
    if (missingReason) {
      toast.error(`סומנה תשובת 'לא' בשאלה "${missingReason.label}" — יש לפרט את הסיבה.`);
      return;
    }
    const name = closeTarget;
    const reasons: Partial<Record<ClosureKey, string>> = {};
    CLOSURE_QUESTIONS.forEach((q) => {
      const r = (closeReasons[q.key] ?? "").trim();
      if (closeForm[q.key] === false && r) reasons[q.key] = r;
    });
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.name === name
          ? {
              ...p,
              closure: {
                deliveredToClient: closeForm.deliveredToClient!,
                ...(closeDeliveryDate ? { deliveryDate: closeDeliveryDate } : {}),
                docFileSaved: closeForm.docFileSaved!,
                docFileSentToClient: closeForm.docFileSentToClient!,
                equipmentOnSite: closeForm.equipmentOnSite!,
                invoiceIssued: closeForm.invoiceIssued!,
                ...(Object.keys(reasons).length ? { reasons } : {}),
                closedAt: new Date().toISOString(),
              },
            }
          : p,
      ),
    }));
    setCloseTarget(null);
    toast.success(`סגירת הפרויקט '${name}' הושלמה. כעת ניתן לסווג אותו לקטגוריה.`);
  };

  const moveToCategory = (name: string, category: ProjectCategory) => {
    const p = projectByName(name);
    if (!p?.closure) {
      toast.error("לא ניתן להעביר פרויקט לקטגוריה ללא סגירת פרויקט מלאה.");
      return;
    }
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((x) =>
        x.name === name
          ? {
              ...x,
              archived: true,
              category,
              // בשנת שירות — תאריך תחילת השירות הוא תאריך מסירת הפרויקט מטופס הסגירה
              categorizedAt:
                category === "warranty" && x.closure?.deliveryDate
                  ? new Date(x.closure.deliveryDate).toISOString()
                  : new Date().toISOString(),
            }
          : x,
      ),
    }));
    toast.success(`הפרויקט '${name}' הועבר ל"${CATEGORY_LABELS[category]}".`);
  };

  const restoreProject = (name: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.name === name ? { ...p, archived: false } : p,
      ),
    }));
    toast.success(`הפרויקט '${name}' הוחזר לפרויקטים הפעילים.`);
  };


  const deleteProject = (name: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.name !== name),
      hours: prev.hours.filter((h) => h.project !== name),
      files: prev.files.filter((f) => f.project !== name),
    }));
    setEditTarget(null);
    setDetailProject(null);
    toast.success(`הפרויקט '${name}' נמחק בהצלחה.`);
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

  const goToProjectsTab = () => {
    setView("console");
    setTab("projects");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closureDialog = (
    <Dialog open={!!closeTarget} onOpenChange={(o) => !o && setCloseTarget(null)}>
      <DialogContent dir="rtl" className="text-right sm:max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-warning" />
            סגירת פרויקט — {closeTarget}
          </DialogTitle>
          <DialogDescription>
            יש לענות כן / לא על כל השאלות. על כל תשובת 'לא' יש לפרט את הסיבה. ללא סגירת פרויקט לא ניתן להעביר את הפרויקט לאף קטגוריה.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {CLOSURE_QUESTIONS.map(({ key, label }) => (
            <div key={key} className="space-y-2 rounded-xl border border-border p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{label}</span>
                <div className="flex gap-2">
                  {(
                    [
                      [true, "כן"],
                      [false, "לא"],
                    ] as const
                  ).map(([val, text]) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => setCloseForm((prev) => ({ ...prev, [key]: val }))}
                      className={cn(
                        "min-w-12 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
                        closeForm[key] === val
                          ? val
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-rose-500 bg-rose-500 text-white"
                          : "border-border bg-background text-muted-foreground hover:bg-surface-2/60",
                      )}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
              {key === "deliveredToClient" && closeForm.deliveredToClient === true && (
                <div className="space-y-1.5 border-t border-border/60 pt-2">
                  <Label className="text-xs">
                    תאריך מסירת הפרויקט (תאריך תחילת שירות) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    dir="ltr"
                    className="text-left"
                    value={closeDeliveryDate}
                    onChange={(e) => setCloseDeliveryDate(e.target.value)}
                    onKeyDown={(e) => e.preventDefault()}
                  />
                </div>
              )}
              {closeForm[key] === false && (
                <div className="space-y-1.5 border-t border-border/60 pt-2">
                  <Label className="text-xs">
                    פירוט הסיבה <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    value={closeReasons[key] ?? ""}
                    onChange={(e) =>
                      setCloseReasons((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder="פרט מדוע סומנה תשובת 'לא'..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <DialogFooter className="flex-row-reverse justify-start gap-2">
          <Button variant="brand" onClick={saveClosure}>
            אשר סגירת פרויקט
          </Button>
          <Button variant="secondary" onClick={() => setCloseTarget(null)}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  /** לחצני סגירה + סיווג לקטגוריות עבור פרויקט בודד */
  const CategoryActions = ({ p, compact }: { p: Project; compact?: boolean }) => (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "flex flex-wrap gap-2"}>
      <Button
        size={compact ? "sm" : "default"}
        variant={p.closure ? "soft" : "default"}
        className={
          p.closure
            ? "border border-success/40 text-success"
            : "bg-warning text-warning-foreground hover:bg-warning/90"
        }
        onClick={() => openClosure(p.name)}
      >
        <ShieldCheck className="size-4" />
        {p.closure ? "סגירת פרויקט הושלמה" : "סגירת פרויקט"}
      </Button>
      {PROJECT_CATEGORIES.map((c) => (
        <Button
          key={c}
          size={compact ? "sm" : "default"}
          variant={p.archived && (p.category ?? "warranty") === c ? "brand" : "ghost"}
          disabled={!p.closure}
          title={p.closure ? undefined : "נדרשת סגירת פרויקט לפני סיווג"}
          onClick={() => moveToCategory(p.name, c)}
        >
          <Archive className="size-4" />
          {CATEGORY_LABELS[c]}
        </Button>
      ))}
      {p.archived && (
        <Button size={compact ? "sm" : "default"} variant="ghost" onClick={() => restoreProject(p.name)}>
          <ArchiveRestore className="size-4" />
          החזר לפעילים
        </Button>
      )}
    </div>
  );



  if (detailProject) {
    const detailProjectObj = state.projects.find((p) => p.name === detailProject);
    return (
      <div className="mx-auto max-w-7xl px-5 pb-16">
        <ProjectHoursDetail
          projectName={detailProject}
          onBack={() => setDetailProject(null)}
          onEdit={
            detailProjectObj
              ? () => {
                  setDetailProject(null);
                  startEdit(detailProjectObj);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              : undefined
          }
        />
      </div>
    );
  }

  if (editTarget) {
    return (
      <div className="mx-auto max-w-5xl px-5 pb-16">
        {closureDialog}

        <div className="animate-rise surface-panel rounded-2xl p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Pencil className="size-5 text-primary" />
              עריכת פרויקט · <span className="text-gradient">{editTarget}</span>
            </h2>
            <Button variant="soft" onClick={() => setEditTarget(null)}>
              <ArrowRight className="size-4" />
              חזרה
            </Button>
          </div>
                  <form onSubmit={saveProject} className="animate-fade space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      {historyDatalists}
                      <div className="space-y-2">
                        <Label>שם לקוח</Label>
                        <Input
                          list="allnet-client-history"
                          value={editForm.client}
                          onChange={(e) =>
                            setEditForm({ ...editForm, client: e.target.value })
                          }
                          placeholder="שם הלקוח"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>שם הפרויקט</Label>
                        <Input
                          list="allnet-project-history"
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
                        <Label>שעות מנהל פרויקט / עובד</Label>
                        <Input
                          type="number"
                          min={MIN_BUDGET}
                          step={1}
                          value={editForm.budget}
                          onChange={(e) =>
                            setEditForm({ ...editForm, budget: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ימי עבודה קבלן משנה</Label>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={editForm.budgetDays}
                          onChange={(e) =>
                            setEditForm({ ...editForm, budgetDays: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>תוספת שעות עבודה חריגות (באישור מנהל)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={editForm.extraHours}
                          onChange={(e) =>
                            setEditForm({ ...editForm, extraHours: Number(e.target.value) })
                          }
                        />
                        <p className="text-[11px] text-muted-foreground">
                          השעות נוספות ליעד השעות לצורך חישוב הניצול.
                        </p>
                        <Input
                          value={editForm.extraHoursReason}
                          onChange={(e) =>
                            setEditForm({ ...editForm, extraHoursReason: e.target.value })
                          }
                          placeholder="סיבת האישור (למשל: הארכת עבודות גמר באישור מנהל)"
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
                      <div className="space-y-2">
                        <Label>איזור</Label>
                        <Select
                          value={editForm.region}
                          onValueChange={(v) =>
                            setEditForm({ ...editForm, region: v as Region })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר איזור" />
                          </SelectTrigger>
                          <SelectContent>
                            {REGIONS.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <RegionRates region={editForm.region} />
                      </div>
                      <div className="space-y-2">
                        <Label>סכום מכירת הפרויקט (₪)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={editForm.saleAmount}
                          onChange={(e) =>
                            setEditForm({ ...editForm, saleAmount: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>תוספות מאושרות (₪)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={editForm.additions}
                          onChange={(e) =>
                            setEditForm({ ...editForm, additions: Number(e.target.value) })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          שווי כולל:{" "}
                          <span className="font-semibold text-foreground">
                            {Math.round((Number(editForm.saleAmount) || 0) + (Number(editForm.additions) || 0)).toLocaleString("he-IL")} ₪
                          </span>{" "}
                          (שווי ראשוני + תוספות)
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <FixedCostsEditor
                          value={editForm.fixedCosts}
                          onChange={(fixedCosts) => setEditForm({ ...editForm, fixedCosts })}
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
                    <div className="flex flex-wrap gap-2">
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
                    <Separator />
                    {(() => {
                      const cur = projectByName(editTarget);
                      if (!cur) return null;
                      return (
                        <div className="space-y-3 rounded-xl border border-border bg-surface-2/40 p-4">
                          <div>
                            <p className="font-semibold">סגירה וסיווג פרויקט</p>
                            <p className="text-xs text-muted-foreground">
                              {cur.closure
                                ? "סגירת הפרויקט הושלמה — ניתן להעביר את הפרויקט לאחת מהקטגוריות."
                                : "יש להשלים סגירת פרויקט (3 שאלות חובה) לפני העברה לקטגוריה."}
                            </p>
                          </div>
                          <CategoryActions p={cur} compact />
                        </div>
                      );
                    })()}
                    <Separator />

                    <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                      <div>
                        <p className="font-semibold text-destructive">מחיקת פרויקט</p>
                        <p className="text-xs text-muted-foreground">
                          פעולה זו תמחק את הפרויקט, דיווחי השעות והקבצים שלו לצמיתות.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`האם אתה בטוח שברצונך למחוק את הפרויקט '${editForm.name}'?`)) {
                            deleteProject(editForm.name);
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                        מחק פרויקט
                      </Button>
                    </div>
                  </form>
        </div>
      </div>
    );
  }

  if (view === "service") {
    return (
      <div className="mx-auto max-w-7xl px-5 pb-16">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">
            קריאות <span className="text-gradient">שירות</span>
          </h2>
          <Button variant="soft" onClick={() => setView("console")}>
            <ArrowRight className="size-4" />
            חזרה למרכז הבקרה הראשי
          </Button>
        </div>
        <ServiceCallsAdmin />
      </div>
    );
  }

  if (view === "projects" || view === "archive") {
    const isArchive = view === "archive";
    const list = isArchive ? categoryProjects : activeProjects;
    return (
      <div className="mx-auto max-w-7xl px-5 pb-16">
        {closureDialog}
        <div className="animate-rise surface-panel rounded-2xl p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              {isArchive ? (
                <Archive className="size-5 text-primary" />
              ) : (
                <ListChecks className="size-5 text-primary" />
              )}
              {isArchive ? CATEGORY_LABELS[categoryView] : "רשימת כל הפרויקטים הפעילים"}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="soft" onClick={() => setView("console")}>
                <ArrowRight className="size-4" />
                חזרה למרכז הבקרה הראשי
              </Button>
            </div>
          </div>
          <div className="mb-5 flex flex-wrap gap-2 border-b border-border pb-4">
            <Button variant={isArchive ? "ghost" : "brand"} size="sm" onClick={() => setView("projects")}>
              <ListChecks className="size-4" />
              פרויקטים פעילים ({activeProjects.length})
            </Button>
            {PROJECT_CATEGORIES.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={isArchive && categoryView === c ? "brand" : "ghost"}
                onClick={() => {
                  setCategoryView(c);
                  setView("archive");
                }}
              >
                <Archive className="size-4" />
                {CATEGORY_LABELS[c]} ({categoryCounts[c]})
              </Button>
            ))}
          </div>

          {list.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם לקוח</TableHead>
                  <TableHead className="text-right">שם פרויקט</TableHead>
                  <TableHead className="text-right">שווי פרויקט</TableHead>
                  <TableHead className="text-right">מנהל פרויקט</TableHead>
                  {isArchive && (
                    <>
                      <TableHead className="text-right">תאריך מסירה</TableHead>
                      <TableHead className="text-right">סיום שירות</TableHead>
                      <TableHead className="text-right">ימים לסיום שירות</TableHead>
                    </>
                  )}
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => {
                  const r = rowFor(p.name);
                  return (
                    <TableRow key={p.name} className="transition-colors hover:bg-surface-2/60">
                      <TableCell className="text-sm text-muted-foreground">
                        {p.client || "—"}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setDetailProject(p.name)}
                          className="cursor-pointer font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          {p.name}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">
                            שווי ראשוני: {Math.round(r.saleBase).toLocaleString("he-IL")} ₪
                          </p>
                          <p className="text-xs text-muted-foreground">
                            תוספות מאושרות: {Math.round(r.additions).toLocaleString("he-IL")} ₪
                          </p>
                          <p className="font-semibold">
                            סה"כ: {Math.round(r.sale).toLocaleString("he-IL")} ₪
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{p.manager}</TableCell>
                      {isArchive && (
                        <>
                          <TableCell className="text-sm">
                            <Input
                              type="date"
                              className="w-[9.5rem]"
                              value={handoverOf(p) ?? ""}
                              onChange={(e) =>
                                setProjectDate(p.name, "handoverDate", e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-sm">
                            <Input
                              type="date"
                              className="w-[9.5rem]"
                              value={serviceEndOf(p) ?? ""}
                              onChange={(e) =>
                                setProjectDate(p.name, "serviceEndDate", e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-sm">
                            {(() => {
                              const end = serviceEndOf(p);
                              if (!end)
                                return <span className="text-muted-foreground">—</span>;
                              const daysLeft = Math.ceil(
                                (new Date(`${end}T00:00:00`).getTime() - Date.now()) / 86400000,
                              );
                              return (
                                <Badge
                                  variant={daysLeft <= 30 ? "destructive" : "secondary"}
                                  className="w-fit"
                                >
                                  {daysLeft <= 0
                                    ? "השירות הסתיים — יש לשלוח הסכם שירות"
                                    : `${daysLeft} ימים`}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="soft"
                            onClick={() => {
                              startEdit(p);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            <Pencil className="size-4" />
                            ערוך
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm(`האם אתה בטוח שברצונך למחוק את הפרויקט '${p.name}'?`)) {
                                setState((prev) => ({
                                  ...prev,
                                  projects: prev.projects.filter((x) => x.name !== p.name),
                                }));
                                toast.success(`הפרויקט '${p.name}' נמחק בהצלחה.`);
                              }
                            }}
                          >
                            <Trash2 className="size-4" />
                            מחק
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isArchive
                ? `אין פרויקטים ב"${CATEGORY_LABELS[categoryView]}".`
                : "אין פרויקטים רשומים במערכת כרגע."}
            </p>

          )}
          {!isArchive && list.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/60 p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  שווי כולל של כל הפרויקטים הפעילים
                </p>
                <p className="text-2xl font-bold">
                  {Math.round(list.reduce((a, p) => a + (Number(p.saleAmount) || 0) + (Number(p.additions) || 0), 0)).toLocaleString("he-IL")} ₪
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">רווח כולל צפוי</p>
                <p className="text-xl font-bold">
                  {Math.round(list.reduce((a, p) => a + (Number(p.saleAmount) || 0) + (Number(p.additions) || 0) - calculateProjectCost(state, p.name), 0)).toLocaleString("he-IL")} ₪
                </p>
              </div>
            </div>
          )}
          {!isArchive && (
            <div className="mt-6 flex justify-center border-t border-border pt-5">
              <Button variant="brand" size="lg" onClick={goToProjectsTab}>
                <Plus className="size-4" />
                צור פרויקט חדש
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-16">
      {closureDialog}
      <h2 className="animate-rise mb-6 text-2xl font-bold">
        מרכז <span className="text-gradient">בקרה ניהולי</span>
      </h2>


      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="פרויקטים פעילים" icon={<Briefcase className="size-4" />}>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${activeProjects.length ? "text-primary" : ""}`}>
              {activeProjects.length}
            </span>
            {activeProjects.length > 0 && (
              <Badge variant="default" className="animate-pulse">
                פעילים
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {archivedProjects.length > 0
              ? `פרויקטים סגורים: ${archivedProjects.length} (שנת שירות ${categoryCounts.warranty} · הסכם שירות ${categoryCounts.service} · לא בשירות ${categoryCounts.noservice})`
              : "אין פרויקטים סגורים"}
          </p>

          <Button
            variant={activeProjects.length ? "brand" : "soft"}
            size="sm"
            className="mt-3 w-full"
            onClick={() => setView("projects")}
          >
            צפה בכל הפרויקטים
          </Button>
        </KpiCard>

        <div className="service-green">
        <KpiCard title="קריאות שירות" icon={<Headset className="size-4" />} delay={40}>
          <div className="flex items-center gap-2">
            <span
              className={`text-2xl font-bold ${openServiceCalls ? "text-primary" : ""}`}
            >
              {openServiceCalls}
            </span>
            {unassignedServiceCalls > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {unassignedServiceCalls} ללא טכנאי
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {state.serviceCalls.length
              ? `סה"כ קריאות במערכת: ${state.serviceCalls.length}`
              : "לא נפתחו קריאות שירות"}
          </p>
          <Button
            variant={openServiceCalls ? "brand" : "soft"}
            size="sm"
            className="mt-3 w-full"
            onClick={() => setView("service")}
          >
            נהל קריאות שירות
          </Button>
        </KpiCard>
        </div>

        <KpiCard title="פרויקטים לפני מסירה" icon={<CalendarClock className="size-4" />} delay={80}>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${upcoming.length ? "text-destructive" : ""}`}>
              {upcoming.length}
            </span>
            {upcoming.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                מסירה בתוך 14 ימים
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {upcoming.length ? `הקרוב: ${upcoming[0]!.name} · ${formatDateIL(upcoming[0]!.deliveryDate)}` : "אין מסירות ב-14 הימים הקרובים"}
          </p>
          <Button
            variant={upcoming.length ? "brand" : "soft"}
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
            {alerts.length ? `הגבוה ביותר: ${alerts[0]!.name} · ${alerts[0]!.pct}%` : "כל הפרויקטים ביעד השעות"}
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
                      מועד מסירה: {formatDateIL(p.deliveryDate)} · {r.manager} · {r.reported} מתוך {r.budget} שעות
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

      {warrantyEnding.length > 0 && (
        <div className="animate-fade surface-panel mb-8 rounded-2xl border border-warning/40 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="size-5 text-warning" />
            התראת סיום שירות (30 יום) — יש לשלוח ללקוח הסכם שירות
            <Badge variant="destructive" className="animate-pulse">
              {warrantyEnding.length}
            </Badge>
          </h3>
          <div className="space-y-3">
            {warrantyEnding.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setDetailProject(p.name)}
                className="hover-lift w-full cursor-pointer rounded-xl border border-border p-3 text-right transition-all hover:border-primary/50"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">
                    {p.client ? `${p.client} · ` : ""}
                    {p.name}
                  </span>
                  <Badge variant={p.daysLeft <= 0 ? "destructive" : "secondary"}>
                    {p.daysLeft <= 0
                      ? "השירות הסתיים"
                      : `סיום שירות בעוד ${p.daysLeft} ימים`}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {p.startedAt ? `תאריך מסירה: ${formatDateIL(p.startedAt)} · ` : ""}
                  סיום שירות: {formatDateIL(p.endsAt)} · יש לשלוח ללקוח הסכם שירות.
                </p>
              </button>
            ))}
          </div>
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
              התרעת ניצול שעות: פרויקט '{a.name}' הגיע ל-{a.pct}% מיעד השעות ({a.reported} מתוך {a.budget}{" "}
              שעות). נדרש מעקב.
            </div>
          ))}

          {activeProjects.length ? (
            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <div className="space-y-6">
                <div className="surface-panel rounded-2xl p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">התפלגות פרויקטים</h3>
                  </div>

                  {dashRows.length ? (
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={560}>
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <Pie
                            data={dashRows.map((r) => ({ ...r, value: 1 }))}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius="34%"
                            outerRadius="99%"
                            paddingAngle={1.5}
                            labelLine={false}
                            label={SliceLabel}
                            isAnimationActive={false}
                          >
                            {dashRows.map((r, i) => {
                              const isHovered = hoveredSlice === r.name;
                              return (
                                <Cell
                                  key={r.name}
                                  fill={isHovered ? "#22c55e" : CHART_COLORS[i % 6]}
                                  stroke="var(--background)"
                                  strokeWidth={2}
                                  className="cursor-pointer transition-all duration-200"
                                  onClick={() => setDetailProject(r.name)}
                                  onMouseEnter={() => setHoveredSlice(r.name)}
                                  onMouseLeave={() => setHoveredSlice(null)}
                                />
                              );
                            })}
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
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-xs font-medium text-muted-foreground">
                            שווי פרויקטים בעבודה
                          </p>
                          <p className="text-xl font-bold text-foreground">
                            {Math.round(dashRows.reduce((sum, r) => sum + r.sale, 0)).toLocaleString("he-IL")} ₪
                          </p>
                        </div>
                      </div>
                    </div>
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
        <Tabs value={tab} onValueChange={setTab} dir="rtl" className="animate-fade">
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
            {Object.values(colFilters).some((v) => v.length) && (
              <div className="surface-panel flex flex-wrap items-center gap-2 rounded-2xl p-4">
                <span className="text-xs font-semibold text-muted-foreground">סינון פעיל:</span>
                {Object.entries(colFilters).flatMap(([col, vals]) =>
                  vals.map((v) => (
                    <button
                      key={`${col}-${v}`}
                      type="button"
                      onClick={() => toggleColFilter(col, v)}
                      className="brand-gradient cursor-pointer rounded-full px-3 py-1 text-xs text-primary-foreground"
                    >
                      {v} ✕
                    </button>
                  )),
                )}
                <Button size="sm" variant="ghost" onClick={() => setColFilters({})}>
                  נקה הכל
                </Button>
              </div>
            )}


            <div className="surface-panel rounded-2xl p-5">
              {hourEditDialog}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">יומן דיווחי שעות</h3>
                <Button
                  variant="soft"
                  onClick={() =>
                    downloadCsv(
                      filteredHours.map((h) => ({
                        "שם המדווח": h.reporter,
                        "שם לקוח": hourClient(h),
                        פרויקט: h.project,
                        תאריך: formatDateIL(h.date),
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
                        {(
                          [
                            ["reporter", "שם המדווח"],
                            ["client", "שם לקוח"],
                            ["project", "שם פרויקט"],
                            ["date", "תאריך"],
                            ["from", "משעה"],
                            ["to", "עד שעה"],
                            ["worked", "זמן עבודה"],
                            ["extras", "חריגים"],
                            ["notes", "הערות"],
                          ] as const
                        ).map(([col, label]) => (
                          <TableHead key={col} className="text-right">
                            <ColumnFilter
                              label={label}
                              options={hourColOptions(col)}
                              selected={colFilters[col] ?? []}
                              onToggle={(v) => toggleColFilter(col, v)}
                              onClear={() => clearColFilter(col)}
                            />
                          </TableHead>
                        ))}
                        <TableHead className="text-right">צרופות</TableHead>
                        <TableHead className="text-right">פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHours.map((h) => (
                        <TableRow key={h.id} className="transition-colors hover:bg-surface-2/60">
                          <TableCell className="font-medium">{h.reporter}</TableCell>
                          <TableCell>{hourClient(h)}</TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => setDetailProject(h.project)}
                              className="cursor-pointer text-primary underline-offset-4 hover:underline"
                            >
                              {h.project}
                            </button>
                          </TableCell>
                          <TableCell>{formatDateIL(h.date)}</TableCell>
                          <TableCell>{h.from}</TableCell>
                          <TableCell>{h.to}</TableCell>
                          <TableCell className="text-primary">{h.worked}</TableCell>
                          <TableCell>{h.extras || "—"}</TableCell>
                          <TableCell className="max-w-48 truncate">{h.notes || "—"}</TableCell>
                          <TableCell>
                            {h.attachments?.length ? (
                              <Button size="sm" variant="soft" onClick={() => setHourAtt(h)}>
                                <Paperclip className="size-4" />
                                {h.attachments.length}
                              </Button>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="soft"
                                onClick={() =>
                                  setHourEdit({
                                    id: h.id,
                                    project: h.project,
                                    date: h.date,
                                    from: h.from,
                                    to: h.to,
                                    notes: h.notes ?? "",
                                    extras: h.extras ?? "",
                                  })
                                }
                              >
                                <Pencil className="size-4" />
                                ערוך
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => deleteHour(h.id)}
                              >
                                <Trash2 className="size-4" />
                                מחק
                              </Button>
                            </div>
                          </TableCell>
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

              <Dialog open={!!hourAtt} onOpenChange={(o) => !o && setHourAtt(null)}>
                <DialogContent dir="rtl" className="max-w-3xl text-right">
                  <DialogHeader>
                    <DialogTitle className="text-right">
                      צרופות לדיווח — {hourAtt?.reporter} · {hourAtt ? formatDateIL(hourAtt.date) : ""}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2">
                    {(hourAtt?.attachments ?? []).map((a) => (
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
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="mt-6 space-y-6">
            <div className="surface-panel rounded-2xl p-6">
              <h3 className="mb-4 text-lg font-semibold">דוא״ל מנהל מערכת לאיפוס סיסמה</h3>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-64 flex-1 space-y-2">
                  <Label>כתובת דוא״ל</Label>
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>
                <Button
                  variant="brand"
                  onClick={() => {
                    setState((prev) => ({ ...prev, adminEmail: adminEmail.trim() }));
                    toast.success("כתובת הדוא״ל של מנהל המערכת נשמרה.");
                  }}
                >
                  שמור
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                כתובת זו משמשת לאיפוס סיסמת מנהל המערכת ממסך הכניסה.
              </p>
            </div>

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
                  <Label>דוא״ל (לאיפוס סיסמה)</Label>
                  <Input
                    type="email"
                    value={nu.email}
                    onChange={(e) => setNu({ ...nu, email: e.target.value })}
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
                {historyDatalists}
                <div className="space-y-2">
                  <Label>שם לקוח</Label>
                  <Input
                    list="allnet-client-history"
                    value={np.client}
                    onChange={(e) => setNp({ ...np, client: e.target.value })}
                    placeholder="שם הלקוח"
                  />
                </div>
                <div className="space-y-2">
                  <Label>שם הפרויקט</Label>
                  <Input
                    list="allnet-project-history"
                    value={np.name}
                    onChange={(e) => setNp({ ...np, name: e.target.value })}
                  />
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
                  <Label>שעות מנהל פרויקט / עובד</Label>
                  <Input
                    type="number"
                    min={MIN_BUDGET}
                    step={1}
                    value={np.budget}
                    onChange={(e) => setNp({ ...np, budget: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ימי עבודה קבלן משנה</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={np.budgetDays}
                    onChange={(e) => setNp({ ...np, budgetDays: Number(e.target.value) })}
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
                <div className="space-y-2">
                  <Label>איזור</Label>
                  <Select
                    value={np.region}
                    onValueChange={(v) => setNp({ ...np, region: v as Region })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר איזור" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <RegionRates region={np.region} />
                </div>
                <div className="space-y-2">
                  <Label>סכום מכירת הפרויקט (₪)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={np.saleAmount}
                    onChange={(e) => setNp({ ...np, saleAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-3">
                  <FixedCostsEditor
                    value={np.fixedCosts}
                    onChange={(fixedCosts) => setNp({ ...np, fixedCosts })}
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
                <div className="flex flex-wrap gap-2">
                  {PROJECT_CATEGORIES.map((c) => (
                    <Button
                      key={c}
                      variant="soft"
                      size="sm"
                      onClick={() => {
                        setCategoryView(c);
                        setView("archive");
                      }}
                    >
                      <Archive className="size-4" />
                      {CATEGORY_LABELS[c]} ({categoryCounts[c]})
                    </Button>
                  ))}
                </div>
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
                            {p.client ? `לקוח: ${p.client} · ` : ""}{p.manager} · {p.budget} שעות ·{" "}
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ColumnFilter({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-xs font-semibold transition-colors hover:text-primary ${
            selected.length ? "text-primary" : ""
          }`}
        >
          {label}
          {selected.length > 0 && (
            <span className="brand-gradient rounded-full px-1.5 text-[10px] text-primary-foreground">
              {selected.length}
            </span>
          )}
          <ChevronDown className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-72 w-56 overflow-y-auto p-2" dir="rtl">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold">{label}</span>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="cursor-pointer text-[11px] text-primary hover:underline"
            >
              נקה
            </button>
          )}
        </div>
        <div className="space-y-1">
          {options.length ? (
            options.map((o) => (
              <label
                key={o}
                className="flex cursor-pointer items-center gap-2 rounded-md p-1 text-xs hover:bg-surface-2/60"
              >
                <Checkbox
                  checked={selected.includes(o)}
                  onCheckedChange={() => onToggle(o)}
                />
                <span className="truncate">{o}</span>
              </label>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">אין ערכים זמינים</span>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}


function UserRow({ username }: { username: string }) {
  const { state, setState } = useAllNet();
  const user = state.users.find((u) => u.username === username);
  const [form, setForm] = useState({
    full_name: user?.full_name ?? "",
    password: user?.password ?? "",
    email: user?.email ?? "",
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
          <Badge variant="secondary" className="font-mono text-xs">
            {user.username}
          </Badge>
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
            <Label>שם משתמש (לצפייה בלבד)</Label>
            <Input value={user.username} readOnly disabled className="bg-surface-2/60" />
          </div>
          <div className="space-y-2">
            <Label>דוא״ל לאיפוס סיסמה</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                        email: form.email.trim(),
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
