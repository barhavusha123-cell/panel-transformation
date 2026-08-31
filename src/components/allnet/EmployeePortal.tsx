import { useMemo, useRef, useState } from "react";
import { Camera, CalendarClock, CalendarIcon, ClipboardCheck, ListChecks, FolderOpen, Headset, Paperclip, Send, Timer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAllNet } from "@/lib/allnet/store";
import { formatDateIL, formatHoursMinutes, getAllTimeOptions, minutesBetween, todayISO } from "@/lib/allnet/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MAX_SUB_WORKERS, type ServiceAttachment } from "@/lib/allnet/types";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { ServiceCallsTechnician } from "./ServiceCalls";
import { BoqChecklist } from "./BoqChecklist";

const TIME_OPTIONS = getAllTimeOptions();

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function TimeSelect({
  value,
  onChange,
  placeholder,
  anchorTime = "07:00",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  anchorTime?: string;
}) {
  const handleOpen = (open: boolean) => {
    if (!open) return;
    // גלילה אוטומטית לשעת העוגן (התחלה 07:00 / סיום 16:00)
    setTimeout(() => {
      const anchor = document.querySelector<HTMLElement>(
        `[data-time-option="${anchorTime}"]`,
      );
      anchor?.scrollIntoView({ block: "start" });
    }, 30);
  };

  return (
    <Select value={value} onValueChange={onChange} onOpenChange={handleOpen}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {TIME_OPTIONS.map((t) => (
          <SelectItem key={t} value={t} data-time-option={t}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EmployeePortal() {
  const { state, setState, session } = useAllNet();
  const user = session?.user;

  const [client, setClient] = useState("");
  const [project, setProject] = useState("");
  const [reportDate, setReportDate] = useState(todayISO());
  const [dateOpen, setDateOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [extras, setExtras] = useState("");
  const [notes, setNotes] = useState("");
  const [docFilter, setDocFilter] = useState("all");
  const [workers, setWorkers] = useState(1);
  const [workerNames, setWorkerNames] = useState("");
  const [attachments, setAttachments] = useState<ServiceAttachment[]>([]);
  const [attPreview, setAttPreview] = useState<ServiceAttachment | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = await Promise.all(
      Array.from(files).map(
        (f) =>
          new Promise<ServiceAttachment>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name: f.name,
                dataUrl: String(reader.result),
                isImage: f.type.startsWith("image/"),
              });
            reader.onerror = reject;
            reader.readAsDataURL(f);
          }),
      ),
    );
    setAttachments((prev) => [...prev, ...list]);
  };

  const myHours = useMemo(
    () => state.hours.filter((h) => h.username === user?.username).slice().reverse(),
    [state.hours, user],
  );

  const activeProjects = useMemo(
    () => state.projects.filter((p) => !p.archived),
    [state.projects],
  );

  const clients = useMemo(
    () =>
      Array.from(
        new Set(activeProjects.map((p) => (p.client ?? "").trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "he")),
    [activeProjects],
  );

  const projectOptions = useMemo(
    () =>
      client ? activeProjects.filter((p) => (p.client ?? "").trim() === client) : activeProjects,
    [activeProjects, client],
  );

  const myOpenCalls = useMemo(
    () =>
      state.serviceCalls.filter(
        (c) => c.technician === user?.username && c.status !== "done",
      ).length,
    [state.serviceCalls, user],
  );

  const livePreview = from && to ? formatHoursMinutes(minutesBetween(from, to)) : "—";

  /** פרויקטים שמנוהלים על ידי המשתמש הנוכחי */
  const managedProjects = useMemo(
    () =>
      user ? state.projects.filter((p) => p.manager === user.full_name).map((p) => p.name) : [],
    [state.projects, user],
  );

  const isManager = managedProjects.length > 0 && user?.role !== "קבלן משנה";

  /** דיווחי קבלני המשנה בפרויקטים של מנהל הפרויקט בלבד */
  const subHours = useMemo(
    () =>
      state.hours
        .filter((h) => h.role === "קבלן משנה" && managedProjects.includes(h.project))
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id)),
    [state.hours, managedProjects],
  );

  const pendingSubHours = subHours.filter((h) => !h.approved).length;

  const toggleApproval = (id: number, approved: boolean) => {
    setState((prev) => ({
      ...prev,
      hours: prev.hours.map((h) =>
        h.id === id
          ? {
              ...h,
              approved,
              approvedBy: approved ? (user?.full_name ?? "") : "",
              approvedAt: approved ? new Date().toISOString() : "",
            }
          : h,
      ),
    }));
    toast.success(approved ? "השעות אושרו." : "האישור בוטל.");
  };


  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!project) {
      toast.error("אנא בחר פרויקט תקין.");
      return;
    }
    if (!reportDate) {
      toast.error("אנא בחר תאריך דיווח.");
      return;
    }
    if (reportDate > todayISO()) {
      toast.error("לא ניתן להזין דיווח שעות עבור תאריך עתידי.");
      return;
    }
    if (!from || !to) {
      toast.error("אנא בחר שעות התחלה וסיום תקינות.");
      return;
    }
    const isSub = user.role === "קבלן משנה";
    if (isSub && !workerNames.trim()) {
      toast.error("אנא ציין את שמות העובדים שהיו באתר באותו היום.");
      return;
    }
    const duplicate =
      !isSub &&
      state.hours.some((h) => h.username === user.username && h.date === reportDate);
    if (duplicate) {
      toast.error("קיים כבר דיווח שעות עבור תאריך זה. לא ניתן לדווח פעמיים באותו היום.");
      return;
    }
    const minutes = minutesBetween(from, to);

    const entry = {
      id: (state.hours.at(-1)?.id ?? 0) + 1,
      username: user.username,
      project,
      client:
        (state.projects.find((p) => p.name === project)?.client ?? "").trim() || client.trim(),
      reporter: user.full_name,
      role: user.role,
      from,
      to,
      worked: formatHoursMinutes(minutes),
      minutes,
      decimal: Math.round((minutes / 60) * 100) / 100,
      date: reportDate,
      notes,
      extras,
      workers: isSub ? workers : 1,
      workerNames: isSub ? workerNames.trim() : "",
      attachments,
    };
    setState((prev) => ({ ...prev, hours: [...prev.hours, entry] }));
    toast.success("הדיווח נקלט בהצלחה.");
    setNotes("");
    setExtras("");
    setWorkerNames("");
    setAttachments([]);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pb-16">
      <div className="animate-rise mb-6">
        <h2 className="text-2xl font-bold">
          שלום, <span className="text-gradient">{user?.full_name}</span>
        </h2>
        <p className="text-sm text-muted-foreground">{user?.role}</p>
      </div>

      <Tabs defaultValue="report" dir="rtl">
        <TabsList className="bg-surface-2/70 p-1">
          <TabsTrigger
            value="report"
            className="data-[state=active]:brand-gradient rounded-lg data-[state=active]:text-primary-foreground"
          >
            <Timer className="size-4" />
            דיווח שעות
          </TabsTrigger>
          <TabsTrigger
            value="docs"
            className="data-[state=active]:brand-gradient rounded-lg data-[state=active]:text-primary-foreground"
          >
            <FolderOpen className="size-4" />
            תוכניות ומסמכים
          </TabsTrigger>
          <TabsTrigger
            value="service"
            className="rounded-lg text-emerald-600 data-[state=active]:service-green data-[state=active]:brand-gradient data-[state=active]:text-primary-foreground"
          >
            <Headset className="size-4" />
            קריאות שירות
            {myOpenCalls > 0 && (
              <span className="ms-1 rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                {myOpenCalls}
              </span>
            )}
          </TabsTrigger>
          {isManager && (
            <TabsTrigger
              value="subs"
              className="data-[state=active]:brand-gradient rounded-lg data-[state=active]:text-primary-foreground"
            >
              <ClipboardCheck className="size-4" />
              אישור שעות קבלני משנה
              {pendingSubHours > 0 && (
                <span className="ms-1 rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                  {pendingSubHours}
                </span>
              )}
            </TabsTrigger>
          )}
          {isManager && (
            <TabsTrigger
              value="boq"
              className="data-[state=active]:brand-gradient rounded-lg data-[state=active]:text-primary-foreground"
            >
              <ListChecks className="size-4" />
              כתב כמויות
            </TabsTrigger>
          )}
        </TabsList>

        {isManager && (
          <TabsContent value="boq" className="animate-fade mt-6 space-y-6">
            <div className="surface-panel rounded-2xl p-6">
              <h3 className="mb-1 text-lg font-semibold">כתב כמויות וביצוע בפרויקטים שלך</h3>
              <p className="text-sm text-muted-foreground">
                סימון פריטים שבוצעו מתעדכן אונליין ומשתקף בדשבורד הניהולי.
              </p>
            </div>
            {managedProjects.map((name) => (
              <div key={name} className="space-y-2">
                <p className="text-sm font-bold">{name}</p>
                <BoqChecklist projectName={name} />
              </div>
            ))}
          </TabsContent>
        )}


        {isManager && (
          <TabsContent value="subs" className="animate-fade mt-6">
            <div className="surface-panel rounded-2xl p-6">
              <h3 className="mb-1 text-lg font-semibold">דיווחי שעות של קבלני משנה</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                מוצגים דיווחים בפרויקטים שבניהולך בלבד. סמן את התיבה לאישור השעות.
              </p>
              {subHours.length ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">אישור</TableHead>
                        <TableHead className="text-right">תאריך</TableHead>
                        <TableHead className="text-right">פרויקט</TableHead>
                        <TableHead className="text-right">קבלן</TableHead>
                        <TableHead className="text-right">עובדים</TableHead>
                        <TableHead className="text-right">משעה</TableHead>
                        <TableHead className="text-right">עד שעה</TableHead>
                        <TableHead className="text-right">זמן עבודה</TableHead>
                        <TableHead className="text-right">סטטוס</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subHours.map((h) => (
                        <TableRow key={h.id} className="transition-colors hover:bg-surface-2/60">
                          <TableCell>
                            <Checkbox
                              checked={Boolean(h.approved)}
                              onCheckedChange={(c) => toggleApproval(h.id, Boolean(c))}
                            />
                          </TableCell>
                          <TableCell>{formatDateIL(h.date)}</TableCell>
                          <TableCell className="font-medium">{h.project}</TableCell>
                          <TableCell>{h.reporter}</TableCell>
                          <TableCell>{h.workerNames || h.workers || "—"}</TableCell>
                          <TableCell>{h.from}</TableCell>
                          <TableCell>{h.to}</TableCell>
                          <TableCell className="text-primary">{h.worked}</TableCell>
                          <TableCell>
                            {h.approved ? (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                                אושר{h.approvedBy ? ` · ${h.approvedBy}` : ""}
                              </span>
                            ) : (
                              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground">
                                ממתין לאישור
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  אין דיווחי קבלני משנה בפרויקטים שלך.
                </p>
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="service" className="animate-fade mt-6">
          <ServiceCallsTechnician />
        </TabsContent>

        <TabsContent value="report" className="animate-fade mt-6 space-y-6">
          <form onSubmit={submit} className="surface-panel rounded-2xl p-6">
            <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold">
              <CalendarClock className="size-5 text-primary" />
              טופס דיווח שעות עבודה
            </h3>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>שם לקוח</Label>
                <Select
                  value={client}
                  onValueChange={(v) => {
                    setClient(v);
                    const p = state.projects.find((x) => x.name === project);
                    if (p && (p.client ?? "").trim() !== v) setProject("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>שם פרויקט</Label>
                <Select
                  value={project}
                  onValueChange={(v) => {
                    setProject(v);
                    const c = (state.projects.find((x) => x.name === v)?.client ?? "").trim();
                    if (c) setClient(c);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר פרויקט" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectOptions.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>תאריך הדיווח</Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-right font-normal",
                        !reportDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="size-4" />
                      {reportDate ? formatDateIL(reportDate) : "בחר תאריך"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={reportDate ? new Date(`${reportDate}T00:00:00`) : undefined}
                      onSelect={(d) => {
                        if (!d) return;
                        setReportDate(toISO(d));
                        setDateOpen(false);
                      }}
                      disabled={(d) => d > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 md:col-span-2">
                <div className="space-y-2">
                  <Label>משעה</Label>
                  <TimeSelect value={from} onChange={setFrom} placeholder="בחר שעה" />
                </div>

                <div className="space-y-2">
                  <Label>עד שעה</Label>
                  <TimeSelect value={to} onChange={setTo} placeholder="בחר שעה" anchorTime="16:00" />
                </div>
              </div>


              {user?.role === "קבלן משנה" && (
                <div className="grid gap-5 md:col-span-2 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>כמה עובדים היו באותו היום?</Label>
                  <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-surface/60 p-3">
                    {Array.from({ length: MAX_SUB_WORKERS }, (_, i) => i + 1).map((n) => (
                      <label key={n} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={workers === n}
                          onCheckedChange={(c) => setWorkers(c ? n : 1)}
                        />
                        {n}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>
                    שמות העובדים שהיו באתר <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={workerNames}
                    onChange={(e) => setWorkerNames(e.target.value)}
                    placeholder="לדוגמה: מוחמד, יוסי"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    ניתן לדווח מספר דיווחים באותו תאריך (צוותים באתרים שונים).
                  </p>
                </div>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label>תיאור העבודה והערות</Label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>חריגים / תוספות שינויים (אופציונלי)</Label>
                <Input value={extras} onChange={(e) => setExtras(e.target.value)} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>צירוף תמונות / קבצים (אופציונלי)</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="soft"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="size-4" />
                    צילום ממצלמה
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="size-4" />
                    העלאת קובץ
                  </Button>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      void addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {attachments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 rounded-lg border border-border bg-surface/70 p-2"
                      >
                        {a.isImage ? (
                          <button type="button" onClick={() => setAttPreview(a)}>
                            <img
                              src={a.dataUrl}
                              alt={a.name}
                              className="size-12 rounded object-cover"
                            />
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-xs">
                            <Paperclip className="size-4" />
                            {a.name}
                          </span>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            setAttachments((prev) => prev.filter((x) => x.id !== a.id))
                          }
                        >
                          הסר
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Dialog open={!!attPreview} onOpenChange={(o) => !o && setAttPreview(null)}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="text-right">{attPreview?.name}</DialogTitle>
                </DialogHeader>
                {attPreview && (
                  <img
                    src={attPreview.dataUrl}
                    alt={attPreview.name}
                    className="max-h-[70vh] w-full rounded-lg object-contain"
                  />
                )}
              </DialogContent>
            </Dialog>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm">
                זמן עבודה מחושב: <span className="font-bold text-primary">{livePreview}</span>
              </div>
              <Button type="submit" variant="brand" size="lg">
                <Send className="size-4" />
                שלח דיווח שעות
              </Button>
            </div>
          </form>

          <div className="surface-panel rounded-2xl p-6">
            <h3 className="mb-4 text-lg font-semibold">דיווחי שעות אחרונים שלי</h3>
            {myHours.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">תאריך</TableHead>
                      <TableHead className="text-right">פרויקט</TableHead>
                      <TableHead className="text-right">משעה</TableHead>
                      <TableHead className="text-right">עד שעה</TableHead>
                      <TableHead className="text-right">זמן עבודה</TableHead>
                      <TableHead className="text-right">הערות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myHours.map((h) => (
                      <TableRow key={h.id} className="transition-colors hover:bg-surface-2/60">
                        <TableCell>{formatDateIL(h.date)}</TableCell>
                        <TableCell className="font-medium">{h.project}</TableCell>
                        <TableCell>{h.from}</TableCell>
                        <TableCell>{h.to}</TableCell>
                        <TableCell className="text-primary">{h.worked}</TableCell>
                        <TableCell className="max-w-56 truncate">{h.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                אין שעות מדווחות תחת חשבון זה.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="docs" className="animate-fade mt-6">
          <div className="surface-panel space-y-4 rounded-2xl p-6">
            <h3 className="text-lg font-semibold">מסמכי פרויקט ותוכניות עבודה</h3>
            <div className="max-w-xs space-y-2">
              <Label>סנן תוכניות לפי פרויקט</Label>
              <Select value={docFilter} onValueChange={setDocFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הצג הכל</SelectItem>
                  {state.projects.filter((p) => !p.archived).map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DocumentList projectFilter={docFilter === "all" ? null : docFilter} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
