import { cn } from "@/lib/utils";
import { ClientPicker } from "./ClientPicker";
import { useNavigate } from "@tanstack/react-router";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarIcon,
  Camera,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileText,
  Headset,
  Paperclip,
  Pencil,
  Plus,
  Send,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAllNet } from "@/lib/allnet/store";
import { formatDateIL, getAllTimeOptions, nowStamp } from "@/lib/allnet/utils";
import { parseDalekServicePdf } from "@/lib/allnet/dalekPdf.functions";

import { openServiceCallReport, openServiceCallsBulkReport } from "@/lib/allnet/serviceReport";

const TIME_OPTIONS = getAllTimeOptions();

/** בורר שעה עם גלילה — עוגן התחלה 07:00 / סיום 16:00 */
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
    setTimeout(() => {
      document
        .querySelector<HTMLElement>(`[data-time-option="${anchorTime}"]`)
        ?.scrollIntoView({ block: "start" });
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SignaturePad } from "@/components/allnet/SignaturePad";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SERVICE_PRIORITIES,
  SERVICE_PRIORITY_LABELS,
  SERVICE_STATUSES,
  SERVICE_STATUS_LABELS,
  isClosedStatus,
  formatCallNumber,
  type ServiceAttachment,
  type ServiceCall,
  type ServiceCallPriority,
  type ServiceCallStatus,
} from "@/lib/allnet/types";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** סדר חשיבות סטטוסים לתצוגה: חדשה → בטיפול → שויכה לטכנאי → טופלה */
const STATUS_ORDER: Record<ServiceCallStatus, number> = {
  new: 0,
  in_progress: 1,
  assigned: 2,
  done: 3,
  closed: 4,
};

/** מספר קריאות מרבי בעמוד */
const PAGE_SIZE = 10;

const readFile = (file: File) =>
  new Promise<ServiceAttachment>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        id: uid(),
        name: file.name || "צילום מצלמה",
        dataUrl: String(reader.result),
        isImage: file.type.startsWith("image/"),
      });
    reader.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));
    reader.readAsDataURL(file);
  });

function statusBadge(status: ServiceCallStatus) {
  const map: Record<ServiceCallStatus, string> = {
    new: "bg-red-500/10 text-red-600 border-red-500/30",
    assigned: "bg-orange-500/10 text-orange-600 border-orange-500/30",
    in_progress: "bg-yellow-400/10 text-yellow-600 border-yellow-400/30",
    done: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    closed: "bg-slate-500/10 text-slate-600 border-slate-500/30",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[status]}`}>
      {SERVICE_STATUS_LABELS[status]}
    </span>
  );
}

function priorityBadge(p: ServiceCallPriority, status?: ServiceCallStatus) {
  if (p === "high") {
    const isDone = status === "done" || status === "closed";
    return (
      <Badge
        variant={isDone ? "default" : "destructive"}
        className={`text-xs ${isDone ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20" : ""}`}
      >
        דחופה
      </Badge>
    );
  }
  return (
    <Badge variant={p === "normal" ? "secondary" : "outline"} className="text-xs">
      {SERVICE_PRIORITY_LABELS[p]}
    </Badge>
  );
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** בורר תאריך לסינון (בחירה מלוח שנה בלבד) */
function DateFilterButton({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-right font-normal", className)}
        >
          <CalendarIcon className="size-4" />
          {value ? (
            formatDateIL(dayKey(value))
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          className="pointer-events-auto p-3"
        />
        {value && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange(undefined)}
            >
              נקה תאריך
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** אזור גרירת קבצים מהמחשב */
function DropArea({
  onFiles,
  children,
}: {
  onFiles: (files: FileList | null) => void;
  children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(e.dataTransfer.files);
      }}
      className={`rounded-xl border-2 border-dashed p-3 transition-colors ${
        over ? "border-primary bg-primary/5" : "border-border bg-surface/40"
      }`}
    >
      <p className="mb-2 text-xs text-muted-foreground">
        ניתן לגרור קבצים מהמחשב לכאן, או לצרף באמצעות הכפתורים
      </p>
      {children}
    </div>
  );
}

/** גלריית קבצים/תמונות של קריאה */
function Attachments({
  items,
  onRemove,
}: {
  items: ServiceAttachment[];
  onRemove?: (id: string) => void;
}) {
  const [preview, setPreview] = useState<ServiceAttachment | null>(null);
  if (!items.length) return null;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {items.map((a) => (
          <div
            key={a.id}
            className="group relative overflow-hidden rounded-xl border border-border bg-surface"
          >
            {a.isImage ? (
              <button type="button" onClick={() => setPreview(a)}>
                <img src={a.dataUrl} alt={a.name} className="size-24 object-cover" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPreview(a)}
                className="flex size-24 flex-col items-center justify-center gap-1 p-2 text-center"
              >
                <Paperclip className="size-5 text-primary" />
                <span className="line-clamp-2 text-[10px] text-muted-foreground">{a.name}</span>
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(a.id)}
                className="absolute left-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-90"
                aria-label="הסר קובץ"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-right">{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview &&
            (preview.isImage ? (
              <img
                src={preview.dataUrl}
                alt={preview.name}
                className="max-h-[70vh] w-full rounded-lg object-contain"
              />
            ) : (
              <iframe
                src={preview.dataUrl}
                title={preview.name}
                className="h-[70vh] w-full rounded-lg border border-border"
              />
            ))}
          {preview && (
            <a
              href={preview.dataUrl}
              download={preview.name}
              className="text-sm font-medium text-primary underline"
            >
              הורדת הקובץ
            </a>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** כרטיס קריאת שירות — משמש גם באדמין וגם בטכנאי */
function CallCard({
  call,
  children,
  technicianName,
}: {
  call: ServiceCall;
  children?: React.ReactNode;
  technicianName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="animate-rise hover-lift surface-panel rounded-2xl p-4 sm:p-5">
      {/* תקציר הקריאה — תמיד גלוי, לחיצה פותחת/מכווצת */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-right"
        aria-expanded={expanded}
      >
        <span className="brand-gradient flex size-9 items-center justify-center rounded-lg text-primary-foreground">
          <Headset className="size-4" />
        </span>
        <span className="text-sm font-semibold text-foreground">
          קריאה {formatCallNumber(call.number)}
        </span>
        {statusBadge(call.status)}
        {priorityBadge(call.priority, call.status)}
        {call.source === "client" && (
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
            קריאת שירות מהלקוח{call.site ? ` · ${call.site}` : ""}
          </span>
        )}
        <span className="text-sm text-foreground">לקוח: {call.client}</span>
        <span className="text-sm text-foreground">טכנאי: {technicianName}</span>
        <span className="text-sm text-foreground">נפתחה {formatDateIL(call.createdAt)}</span>
        {call.closedAt && (
          <span className="text-sm text-foreground">נסגרה {formatDateIL(call.closedAt)}</span>
        )}
        {call.clientClosedAt && (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            אושר סגירה ע״י הלקוח · {formatDateIL(call.clientClosedAt)}
          </span>
        )}
        <ChevronDown
          className={`ms-auto size-5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <>
          <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">לקוח: </span>
              <span className="font-semibold">{call.client}</span>
            </p>
            <p>
              <span className="text-muted-foreground">טכנאי: </span>
              <span className="font-semibold">{technicianName}</span>
            </p>
            {call.project && (
              <p>
                <span className="text-foreground">פרויקט: </span>
                {call.project}
              </p>
            )}
            {call.contact && (
              <p>
                <span className="text-foreground">איש קשר: </span>
                {call.contact}
              </p>
            )}
            {call.address && (
              <p className="sm:col-span-2">
                <span className="text-foreground">כתובת: </span>
                {call.address}
              </p>
            )}
            {(call.workFrom || call.workTo) && (
              <p>
                <span className="text-foreground">שעות עבודה באתר: </span>
                {call.workFrom || "—"} - {call.workTo || "—"}
              </p>
            )}
            {call.additionalTechnician !== undefined && (
              <p>
                <span className="text-foreground">טכנאי נוסף באתר: </span>
                {call.additionalTechnician
                  ? `כן${call.additionalTechnicianName ? ` — ${call.additionalTechnicianName}` : ""}`
                  : "לא"}
              </p>
            )}
            {call.equipmentSupplied && (
              <p className="sm:col-span-2">
                <span className="text-foreground">ציוד שסופק: </span>
                <span className="whitespace-pre-wrap">{call.equipmentSupplied}</span>
              </p>
            )}
            {call.followUp && (
              <p className="sm:col-span-2">
                <span className="text-foreground">נושאים להמשך טיפול / הצעת מחיר: </span>
                <span className="whitespace-pre-wrap">{call.followUp}</span>
              </p>
            )}
          </div>

          <p className="mt-3 font-semibold">{call.subject}</p>
          {call.description && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{call.description}</p>
          )}

          <div className="mt-3">
            <Attachments items={call.attachments} />
          </div>

          {call.updates.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground">יומן טיפול</p>
              {call.updates.map((u) => (
                <div key={u.id} className="rounded-xl bg-surface-2/60 p-3 text-sm">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-foreground">
                    <span className="font-semibold text-foreground">{u.by}</span>
                    <span>{formatDateIL(u.at)}</span>
                    {u.status && <span>· עודכן ל{SERVICE_STATUS_LABELS[u.status]}</span>}
                  </div>
                  <p className="whitespace-pre-wrap">{u.text}</p>
                </div>
              ))}
            </div>
          )}

          {(call.approverName || call.approverSignature) && (
            <div className="mt-4 space-y-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground">אישור לקוח</p>
              {call.approverName && (
                <p className="text-sm">
                  <span className="text-foreground">שם הלקוח המאשר: </span>
                  <span className="font-semibold">{call.approverName}</span>
                </p>
              )}
              {call.approverSignature && (
                <div className="max-w-xs rounded-xl border border-border bg-white p-2">
                  <img
                    src={call.approverSignature}
                    alt="חתימת הלקוח המאשר"
                    className="h-24 w-full object-contain"
                  />
                </div>
              )}
              {call.approvedAt && (
                <p className="text-xs text-muted-foreground">
                  נחתם בתאריך {formatDateIL(call.approvedAt)}
                </p>
              )}
            </div>
          )}

          {children && <div className="mt-4 border-t border-border pt-3">{children}</div>}
        </>
      )}
    </div>
  );
}

function useTechnicians() {
  const { state } = useAllNet();
  return useMemo(() => state.users, [state.users]);
}

/** ניהול קריאות שירות — צד מנהל */
export function ServiceCallsAdmin() {
  const navigate = useNavigate();
  const { state, setState } = useAllNet();
  const technicians = useTechnicians();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [client, setClient] = useState("");
  const [project, setProject] = useState("");

  /** פתיחת טופס קריאה חדשה עם נתוני פרויקט מאזור "פרויקטים בשנת שירות" */
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{ client?: string; project?: string }>).detail ?? {};
      setClient(d.client ?? "");
      setProject(d.project ?? "");
      setOpen(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("allnet:new-service-call", handler);
    return () => window.removeEventListener("allnet:new-service-call", handler);
  }, []);

  const handleClientChange = (name: string) => {
    setClient(name);
    const matched = state.clients?.find((c) => (c.name ?? "").trim() === name.trim());
    if (matched?.address) {
      setProject(matched.address);
    }
    if (matched?.sla) {
      setPriority("high");
    }
  };

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ServiceCallPriority>("normal");
  const [technician, setTechnician] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [attachments, setAttachments] = useState<ServiceAttachment[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | ServiceCallStatus>("all");
  const [techFilter, setTechFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [siteFilter, setSiteFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [dalekOpen, setDalekOpen] = useState(false);
  const [dalekLoading, setDalekLoading] = useState(false);
  const dalekRef = useRef<HTMLInputElement>(null);

  const [numberFilter, setNumberFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  /** מצב תצוגה: פעילות / היסטוריה (סגורות) */
  const [view, setView] = useState<"active" | "history">("active");
  /** טיוטת שינויים לכל קריאה — נשמרת רק בלחיצה על "אישור" */
  const [drafts, setDrafts] = useState<
    Record<string, { technician?: string | undefined; status?: ServiceCallStatus }>
  >({});

  const [editing, setEditing] = useState<ServiceCall | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);
  const editCameraRef = useRef<HTMLInputElement>(null);

  const addEditFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const loaded = await Promise.all(Array.from(files).map(readFile));
      setEditing((prev) =>
        prev ? { ...prev, attachments: [...prev.attachments, ...loaded] } : prev,
      );
    } catch {
      toast.error("אירעה שגיאה בטעינת הקובץ.");
    }
  };

  // רק לקוחות שהוקמו בלשונית "ניהול לקוחות"
  const clients = useMemo(
    () =>
      Array.from(
        new Set((state.clients ?? []).map((c) => (c.name ?? "").trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "he")),
    [state.clients],
  );

  const selectedClientSla = useMemo(() => {
    const matched = state.clients?.find((c) => (c.name ?? "").trim() === (client ?? "").trim());
    return !!matched?.sla;
  }, [state.clients, client]);

  const projectNames = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...state.projects.map((p) => p.name ?? ""),
            ...state.serviceCalls.map((c) => c.project ?? ""),
          ]
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "he")),
    [state.projects, state.serviceCalls],
  );

  const calls = useMemo(() => {
    return state.serviceCalls
      .filter((c) => (view === "active" ? !isClosedStatus(c.status) : isClosedStatus(c.status)))
      .filter((c) => (statusFilter === "all" ? true : c.status === statusFilter))
      .filter((c) => (techFilter === "all" ? true : c.technician === techFilter))
      .filter((c) => (clientFilter === "all" ? true : c.client === clientFilter))
      .filter((c) => (siteFilter === "all" ? true : c.project === siteFilter))
      .filter((c) => {
        const q = numberFilter.trim().toLowerCase();
        if (!q || q === "all") return true;
        const digits = q.replace(/[^0-9]/g, "");
        const full = formatCallNumber(c.number).toLowerCase();
        return (
          full.includes(q) ||
          (digits !== "" &&
            (String(c.number).includes(digits) || full.replace(/[^0-9]/g, "").includes(digits)))
        );
      })
      .filter((c) => {
        if (!dateFrom && !dateTo) return true;
        const key = c.createdAt.slice(0, 10);
        if (dateFrom && key < dayKey(dateFrom)) return false;
        if (dateTo && key > dayKey(dateTo)) return false;
        return true;
      })
      .slice()
      .sort((a, b) => {
        const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        return s !== 0 ? s : b.number - a.number;
      });
  }, [
    state.serviceCalls,
    view,
    statusFilter,
    techFilter,
    clientFilter,
    siteFilter,
    numberFilter,
    dateFrom,
    dateTo,
  ]);

  // עימוד — עד 10 קריאות בעמוד
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(calls.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageCalls = calls.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  useEffect(
    () => setPage(1),
    [statusFilter, techFilter, clientFilter, siteFilter, numberFilter, dateFrom, dateTo],
  );

  const clientOptions = useMemo(
    () =>
      Array.from(
        new Set(state.serviceCalls.map((c) => c.client).filter((v): v is string => !!v)),
      ).sort((a, b) => a.localeCompare(b, "he")),
    [state.serviceCalls],
  );

  const siteOptions = useMemo(
    () =>
      Array.from(
        new Set(state.serviceCalls.map((c) => c.project).filter((v): v is string => !!v)),
      ).sort((a, b) => a.localeCompare(b, "he")),
    [state.serviceCalls],
  );

  const techName = (username?: string) =>
    technicians.find((u) => u.username === username)?.full_name ?? "לא שויך";

  const importDalekPdf = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) {
      toast.error("יש לגרור קובץ PDF בלבד.");
      return;
    }
    setDalekLoading(true);
    try {
      const att = await readFile(file);
      const parsed = await parseDalekServicePdf({
        data: { filename: file.name, dataUrl: att.dataUrl },
      });
      setClient(parsed.client?.trim() || "דלק מוטורס");
      if (parsed.project) setProject(parsed.project);
      if (parsed.subject) setSubject(parsed.subject);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.contact) setContact(parsed.contact);
      if (parsed.address) setAddress(parsed.address);
      if (parsed.priority) setPriority(parsed.priority);
      setAttachments((prev) => [...prev, att]);
      setOpen(true);
      setDalekOpen(false);
      toast.success("הנתונים מה-PDF נטענו לטופס קריאת השירות.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "לא הצלחתי לקרוא את הקובץ.");
    } finally {
      setDalekLoading(false);
    }
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const loaded = await Promise.all(Array.from(files).map(readFile));
      setAttachments((prev) => [...prev, ...loaded]);
    } catch {
      toast.error("אירעה שגיאה בטעינת הקובץ.");
    }
  };

  const reset = () => {
    setClient("");
    setProject("");
    setSubject("");
    setDescription("");
    setPriority("normal");
    setTechnician("");
    setContact("");
    setAddress("");
    setAttachments([]);
  };

  const handleCancel = () => {
    reset();
    setOpen(false);
    void navigate({ to: "/" });
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.trim()) {
      toast.error("אנא הזן שם לקוח.");
      return;
    }
    if (!subject.trim()) {
      toast.error("אנא הזן את מהות קריאת השירות.");
      return;
    }

    const call: ServiceCall = {
      id: uid(),
      number: (state.serviceCalls.at(-1)?.number ?? 0) + 1,
      client: client.trim(),
      project: project || undefined,
      subject: subject.trim(),
      description: description.trim(),
      priority,
      technician: technician || undefined,
      status: technician ? "assigned" : "new",
      createdAt: nowStamp(),
      createdBy: "מנהל מערכת",
      contact: contact.trim() || undefined,
      address: address.trim() || undefined,
      attachments,
      updates: [],
    };
    setState((prev) => ({ ...prev, serviceCalls: [...prev.serviceCalls, call] }));
    toast.success(`קריאת שירות ${formatCallNumber(call.number)} נפתחה בהצלחה.`);
    reset();
    setOpen(false);
  };

  const patch = (id: string, updater: (c: ServiceCall) => ServiceCall) =>
    setState((prev) => ({
      ...prev,
      serviceCalls: prev.serviceCalls.map((c) => (c.id === id ? updater(c) : c)),
    }));

  /** טקסטי מענה ללקוח לפי קריאה */
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  /** שליחת מענה ללקוח — נשמר ביומן הקריאה ומוצג גם בפורטל הלקוח */
  const sendReply = (call: ServiceCall) => {
    const text = (replyTexts[call.id] ?? "").trim();
    if (!text) return;
    patch(call.id, (c) => ({
      ...c,
      updates: [
        ...c.updates,
        { id: uid(), at: nowStamp(), by: "מנהל מערכת", text: `מענה ללקוח: ${text}` },
      ],
    }));
    setReplyTexts((prev) => ({ ...prev, [call.id]: "" }));
    toast.success(`המענה נשלח ויוצג ללקוח בקריאה ${formatCallNumber(call.number)}.`);
  };

  const remove = (id: string) =>
    setState((prev) => ({ ...prev, serviceCalls: prev.serviceCalls.filter((c) => c.id !== id) }));

  const counts = useMemo(
    () => ({
      open: state.serviceCalls.filter((c) => !isClosedStatus(c.status)).length,
      unassigned: state.serviceCalls.filter((c) => !c.technician && !isClosedStatus(c.status))
        .length,
    }),
    [state.serviceCalls],
  );

  return (
    <div className="service-green space-y-5">
      <div className="surface-panel flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Headset className="size-5 text-primary" />
          קריאות שירות
        </h3>
        <Badge variant="secondary">פתוחות: {counts.open}</Badge>
        <Badge variant="outline">ללא טכנאי: {counts.unassigned}</Badge>
        <Button variant="outline" className="ms-auto" onClick={() => setDalekOpen((o) => !o)}>
          <FileText className="size-4" />
          קריאות שירות דלק מוטורס
        </Button>
        <Button variant="brand" onClick={() => setOpen((o) => !o)}>
          <Plus className="size-4" />
          {open ? "סגור טופס" : "פתח קריאת שירות"}
        </Button>
      </div>

      {dalekOpen && (
        <div className="animate-rise surface-panel space-y-3 rounded-2xl p-4 sm:p-6">
          <h4 className="text-base font-bold">קריאות שירות דלק מוטורס</h4>
          <p className="text-xs text-muted-foreground">
            גרור לכאן קובץ PDF של קריאת שירות מהלקוח — הנתונים ייקראו אוטומטית ויוזנו לטופס קריאת
            השירות שלנו.
          </p>
          <DropArea onFiles={(f) => void importDalekPdf(f)}>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="soft"
                disabled={dalekLoading}
                onClick={() => dalekRef.current?.click()}
              >
                <Paperclip className="size-4" />
                בחירת קובץ PDF
              </Button>
              {dalekLoading && (
                <span className="text-xs text-muted-foreground">קורא את הקובץ…</span>
              )}
            </div>
          </DropArea>
          <input
            ref={dalekRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              void importDalekPdf(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {open && (
        <form onSubmit={create} className="animate-rise surface-panel rounded-2xl p-4 sm:p-6">
          <h4 className="mb-4 text-base font-bold">פתיחת קריאת שירות חדשה</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>שם לקוח</Label>
              <ClientPicker value={client} onChange={handleClientChange} clients={clients} />
            </div>

            <div className="space-y-2">
              <Label>כתובת / אתר (ניתן לשנות / להוסיף ידנית)</Label>
              <Input
                list="service-projects"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="כתובת / שם האתר / הפרויקט"
              />
              <datalist id="service-projects">
                {projectNames.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>מהות קריאת השירות</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="לדוגמה: תקלה במצלמה בכניסה הראשית"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>תיאור מפורט</Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="פרט את התקלה, מיקום, ומה נדרש מהטכנאי"
              />
            </div>

            <div className="space-y-2">
              <Label>שיוך טכנאי</Label>
              <Select
                value={technician || "none"}
                onValueChange={(v) => setTechnician(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר טכנאי" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא שיוך</SelectItem>
                  {technicians.map((u) => (
                    <SelectItem key={u.username} value={u.username}>
                      {u.full_name} · {u.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>דחיפות</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as ServiceCallPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {SERVICE_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClientSla && (
                <p className="text-xs font-semibold text-[var(--brand-red)]">לקוח בשירות SLA</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>איש קשר בשטח</Label>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="שם וטלפון"
              />
            </div>

            <div className="space-y-2">
              <Label>כתובת האתר</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="כתובת"
              />
            </div>

            <div className="space-y-3 md:col-span-2">
              <Label>תמונות וקבצים</Label>
              <DropArea onFiles={(f) => void addFiles(f)}>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="soft" onClick={() => cameraRef.current?.click()}>
                    <Camera className="size-4" />
                    צילום ממצלמה
                  </Button>
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                    <Paperclip className="size-4" />
                    צירוף קבצים
                  </Button>
                </div>
              </DropArea>
              <input
                ref={cameraRef}
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
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  void addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Attachments
                items={attachments}
                onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" size="lg" onClick={handleCancel}>
              ביטול
            </Button>
            <Button type="submit" variant="brand" size="lg">
              <Send className="size-4" />
              פתח קריאת שירות
            </Button>
          </div>
        </form>
      )}

      <div className="surface-panel grid grid-cols-7 items-start gap-2 rounded-2xl p-3">
        <div className="min-w-0 space-y-1">
          <Label className="text-[11px]">סטטוס</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              {SERVICE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SERVICE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-[11px]">טכנאי</Label>
          <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              {technicians.map((u) => (
                <SelectItem key={u.username} value={u.username}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-[11px]">לקוח</Label>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              {clientOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-[11px]">אתר</Label>
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              {siteOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-[11px]">מספר קריאה</Label>
          <Input
            className="h-9 text-xs"
            value={numberFilter === "all" ? "" : numberFilter}
            onChange={(e) => setNumberFilter(e.target.value)}
            placeholder="AL2600001"
            list="call-number-options"
          />
          <datalist id="call-number-options">
            {state.serviceCalls
              .slice()
              .sort((a, b) => a.number - b.number)
              .map((c) => (
                <option key={c.id} value={formatCallNumber(c.number)} />
              ))}
          </datalist>
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-[11px]">מתאריך</Label>
          <DateFilterButton
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="מתאריך"
            className="h-9 text-xs"
          />
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-[11px]">עד תאריך</Label>
          <DateFilterButton
            value={dateTo}
            onChange={setDateTo}
            placeholder="עד תאריך"
            className="h-9 text-xs"
          />
        </div>
      </div>

      {calls.length ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/60 px-4 py-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={calls.length > 0 && calls.every((c) => selectedIds.includes(c.id))}
                onCheckedChange={(v) =>
                  setSelectedIds(
                    v
                      ? Array.from(new Set([...selectedIds, ...calls.map((c) => c.id)]))
                      : selectedIds.filter((id) => !calls.some((c) => c.id === id)),
                  )
                }
              />
              בחר את כל הקריאות המסוננות
              {selectedIds.length > 0 && (
                <Badge variant="secondary">{selectedIds.length} נבחרו</Badge>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="soft"
                disabled={!selectedIds.length}
                onClick={() => {
                  const chosen = state.serviceCalls.filter((c) => selectedIds.includes(c.id));
                  const ok = openServiceCallsBulkReport(chosen, techName);
                  if (ok)
                    toast.success(
                      `הופק דוח מרוכז עבור ${chosen.length} קריאות — ניתן לשמור כ-PDF.`,
                    );
                  else toast.error("החלון נחסם על ידי הדפדפן. יש לאשר חלונות קופצים.");
                }}
              >
                <FileText className="size-4" />
                הפק דוח PDF לקריאות שנבחרו
              </Button>
            </div>
          </div>
          {pageCalls.map((call, idx) => (
            <div key={call.id}>
              {idx > 0 && pageCalls[idx - 1]!.status !== call.status && (
                <div className="my-2 flex items-center gap-3" role="separator">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {SERVICE_STATUS_LABELS[call.status]}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              <CallCard call={call} technicianName={techName(call.technician)}>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex cursor-pointer items-center gap-2 pb-2 text-xs font-medium text-muted-foreground">
                    <Checkbox
                      checked={selectedIds.includes(call.id)}
                      onCheckedChange={(v) =>
                        setSelectedIds((prev) =>
                          v ? [...prev, call.id] : prev.filter((id) => id !== call.id),
                        )
                      }
                    />
                    בחר לדוח
                  </label>
                  <div className="min-w-44 space-y-1">
                    <Label className="text-xs">
                      <UserCog className="me-1 inline size-3" />
                      שיוך טכנאי
                    </Label>
                    <Select
                      value={drafts[call.id]?.technician ?? call.technician ?? "none"}
                      onValueChange={(v) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [call.id]: { ...prev[call.id], technician: v },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">ללא שיוך</SelectItem>
                        {technicians.map((u) => (
                          <SelectItem key={u.username} value={u.username}>
                            {u.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-40 space-y-1">
                    <Label className="text-xs">סטטוס</Label>
                    <Select
                      value={drafts[call.id]?.status ?? call.status}
                      onValueChange={(v) => {
                        const next = v as ServiceCallStatus;
                        if (
                          (next === "done" || next === "closed") &&
                          call.source === "client" &&
                          !(replyTexts[call.id] ?? "").trim()
                        ) {
                          setReplyTexts((prev) => ({
                            ...prev,
                            [call.id]: "התקלה טופלה אנא סגור את הקריאה מצידך באפליקציה",
                          }));
                        }
                        setDrafts((prev) => ({
                          ...prev,
                          [call.id]: { ...prev[call.id], status: next },
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {SERVICE_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex min-w-64 flex-1 items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">מענה ללקוח</Label>
                      <Input
                        value={replyTexts[call.id] ?? ""}
                        onChange={(e) =>
                          setReplyTexts((prev) => ({ ...prev, [call.id]: e.target.value }))
                        }
                        placeholder="כתוב הודעה שתוצג ללקוח…"
                      />
                    </div>
                    <Button
                      variant="soft"
                      onClick={() => sendReply(call)}
                      disabled={!(replyTexts[call.id] ?? "").trim()}
                    >
                      <Send className="size-4" />
                      שלח
                    </Button>
                  </div>
                  <Button
                    onClick={() => {
                      const d = drafts[call.id];
                      if (d) {
                        patch(call.id, (c) => {
                          const tech =
                            d.technician === undefined
                              ? c.technician
                              : d.technician === "none"
                                ? undefined
                                : d.technician;
                          let status = d.status ?? c.status;
                          if (d.status === undefined && d.technician !== undefined) {
                            status = !tech ? "new" : c.status === "new" ? "assigned" : c.status;
                          }
                          return {
                            ...c,
                            technician: tech,
                            status,
                            closedAt:
                              status === "closed" ? (c.closedAt ?? nowStamp()) : undefined,
                          };
                        });
                      }
                      if ((replyTexts[call.id] ?? "").trim()) sendReply(call);
                      setDrafts((prev) => {
                        const next = { ...prev };
                        delete next[call.id];
                        return next;
                      });
                      setStatusFilter("all");
                      toast.success(`הנתונים נשמרו לקריאה ${formatCallNumber(call.number)}.`);
                    }}
                  >
                    <CheckCircle2 className="size-4" />
                    אישור
                  </Button>

                  <Button variant="soft" onClick={() => setEditing(call)}>
                    <Pencil className="size-4" />
                    ערוך קריאה
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const ok = openServiceCallReport(call, techName(call.technician));
                      if (ok) toast.success("דוח השירות הופק — ניתן לשמור כ-PDF ולשלוח ללקוח.");
                      else toast.error("החלון נחסם על ידי הדפדפן. יש לאשר חלונות קופצים.");
                    }}
                  >
                    <FileText className="size-4" />
                    הפק דוח שירות (PDF)
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm(`למחוק את קריאת השירות ${formatCallNumber(call.number)}?`)) {
                        remove(call.id);
                        toast.success("קריאת השירות נמחקה.");
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                    מחק קריאה
                  </Button>
                </div>
              </CallCard>
            </div>
          ))}
          {/* מעבר עמודים */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 border-t border-border pt-4">
              <Button
                variant="soft"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                הקודם
              </Button>
              <span className="text-sm text-muted-foreground">
                עמוד {safePage} מתוך {totalPages} · {calls.length} קריאות
              </span>
              <Button
                variant="soft"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                הבא
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">
          אין קריאות שירות להצגה.
        </p>
      )}

      {/* עריכת קריאת שירות קיימת */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="service-green max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">
              עריכת קריאת שירות {editing ? formatCallNumber(editing.number) : ""}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>שם לקוח</Label>
                <ClientPicker
                  value={editing.client}
                  onChange={(v) => setEditing({ ...editing, client: v })}
                  clients={clients}
                />
              </div>

              <div className="space-y-2">
                <Label>אתר (לא חובה)</Label>
                <Input
                  list="service-projects"
                  value={editing.project ?? ""}
                  onChange={(e) => setEditing({ ...editing, project: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>מהות קריאת השירות</Label>
                <Input
                  value={editing.subject}
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>תיאור מפורט</Label>
                <Textarea
                  rows={3}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>דחיפות</Label>
                <Select
                  value={editing.priority}
                  onValueChange={(v) =>
                    setEditing({ ...editing, priority: v as ServiceCallPriority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {SERVICE_PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>שיוך טכנאי</Label>
                <Select
                  value={editing.technician || "none"}
                  onValueChange={(v) =>
                    setEditing({ ...editing, technician: v === "none" ? undefined : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא שיוך</SelectItem>
                    {technicians.map((u) => (
                      <SelectItem key={u.username} value={u.username}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>איש קשר בשטח</Label>
                <Input
                  value={editing.contact ?? ""}
                  onChange={(e) => setEditing({ ...editing, contact: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>כתובת האתר</Label>
                <Input
                  value={editing.address ?? ""}
                  onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                />
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label>תמונות וקבצים</Label>
                <DropArea onFiles={(f) => void addEditFiles(f)}>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="soft"
                      onClick={() => editCameraRef.current?.click()}
                    >
                      <Camera className="size-4" />
                      צילום ממצלמה
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => editFileRef.current?.click()}
                    >
                      <Paperclip className="size-4" />
                      צירוף קבצים
                    </Button>
                  </div>
                </DropArea>
                <input
                  ref={editCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    void addEditFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={editFileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void addEditFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <Attachments
                  items={editing.attachments}
                  onRemove={(id) =>
                    setEditing({
                      ...editing,
                      attachments: editing.attachments.filter((a) => a.id !== id),
                    })
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>שם הלקוח המאשר</Label>
                <Input
                  value={editing.approverName ?? ""}
                  onChange={(e) => setEditing({ ...editing, approverName: e.target.value })}
                  placeholder="שם מלא של הלקוח שאישר את הטיפול"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>חתימת הלקוח המאשר</Label>
                <SignaturePad
                  value={editing.approverSignature}
                  onSave={(dataUrl) =>
                    setEditing({
                      ...editing,
                      approverSignature: dataUrl,
                      approvedAt: nowStamp(),
                    })
                  }
                  onClear={() =>
                    setEditing({
                      ...editing,
                      approverSignature: undefined,
                      approvedAt: undefined,
                    })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  ביטול
                </Button>
                <Button
                  variant="brand"
                  onClick={() => {
                    if (!editing.client.trim() || !editing.subject.trim()) {
                      toast.error("שם לקוח ומהות הקריאה הם שדות חובה.");
                      return;
                    }
                    const next: ServiceCall = {
                      ...editing,
                      client: editing.client.trim(),
                      subject: editing.subject.trim(),
                      project: editing.project?.trim() || undefined,
                      contact: editing.contact?.trim() || undefined,
                      address: editing.address?.trim() || undefined,
                      approverName: editing.approverName?.trim() || undefined,
                    };
                    patch(next.id, () => next);
                    setEditing(null);
                    toast.success("קריאת השירות עודכנה בהצלחה.");
                  }}
                >
                  שמור שינויים
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** קריאות שירות המשויכות לטכנאי המחובר */
export function ServiceCallsTechnician() {
  const { state, setState, session } = useAllNet();
  const user = session?.user;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);
  const cameraRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const myCalls = useMemo(
    () =>
      state.serviceCalls
        .filter((c) => c.technician === user?.username && c.status !== "done" && c.status !== "closed")
        .slice()
        .sort((a, b) => b.number - a.number),
    [state.serviceCalls, user],
  );

  const patch = (id: string, updater: (c: ServiceCall) => ServiceCall) =>
    setState((prev) => ({
      ...prev,
      serviceCalls: prev.serviceCalls.map((c) => (c.id === id ? updater(c) : c)),
    }));

  const respond = (call: ServiceCall, status?: ServiceCallStatus) => {
    const text = (drafts[call.id] ?? "").trim();
    if (!text && !status) {
      toast.error("אנא כתוב עדכון טיפול.");
      return;
    }
    patch(call.id, (c) => ({
      ...c,
      status: status ?? c.status,
      closedAt: isClosedStatus(status ?? c.status)
        ? (c.closedAt ?? nowStamp())
        : status
          ? undefined
          : c.closedAt,
      updates: [
        ...c.updates,
        {
          id: uid(),
          at: nowStamp(),
          by: user?.full_name ?? "טכנאי",
          text: text || `הקריאה עודכנה לסטטוס ${SERVICE_STATUS_LABELS[status ?? c.status]}`,
          ...(status ? { status } : {}),
        },
      ],
    }));
    setDrafts((d) => ({ ...d, [call.id]: "" }));
    toast.success("העדכון נשמר ונשלח למנהל.");
  };

  const addPhoto = async (call: ServiceCall, files: FileList | null) => {
    if (!files?.length) return;
    try {
      const loaded = await Promise.all(Array.from(files).map(readFile));
      patch(call.id, (c) => ({ ...c, attachments: [...c.attachments, ...loaded] }));
      toast.success("התמונה צורפה לקריאה.");
    } catch {
      toast.error("אירעה שגיאה בצירוף התמונה.");
    }
  };

  if (!myCalls.length)
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">
        אין קריאות שירות המשויכות אליך כרגע.
      </p>
    );

  return (
    <div className="service-green space-y-4">
      {myCalls.map((call) => (
        <CallCard key={call.id} call={call} technicianName={user?.full_name ?? ""}>
          <div className="space-y-3">
            <div className="space-y-3 rounded-xl border border-border bg-surface-2/50 p-3">
              <p className="text-xs font-semibold text-muted-foreground">שעות עבודה באתר</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">משעה</Label>
                  <TimeSelect
                    value={call.workFrom ?? ""}
                    onChange={(v) => patch(call.id, (c) => ({ ...c, workFrom: v }))}
                    placeholder="בחר שעה"
                    anchorTime="07:00"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">עד שעה</Label>
                  <TimeSelect
                    value={call.workTo ?? ""}
                    onChange={(v) => patch(call.id, (c) => ({ ...c, workTo: v }))}
                    placeholder="בחר שעה"
                    anchorTime="16:00"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">טכנאי נוסף באתר?</Label>
                <div className="flex gap-2">
                  {(
                    [
                      { v: true, label: "כן" },
                      { v: false, label: "לא" },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      onClick={() =>
                        patch(call.id, (c) => ({
                          ...c,
                          additionalTechnician: o.v,
                          ...(o.v ? {} : { additionalTechnicianName: undefined }),
                        }))
                      }
                      className={`rounded-lg border px-4 py-1.5 text-xs font-semibold transition-all ${
                        call.additionalTechnician === o.v
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                {call.additionalTechnician === true && (
                  <Input
                    className="mt-2"
                    placeholder="שם הטכנאי הנוסף"
                    value={call.additionalTechnicianName ?? ""}
                    onChange={(e) =>
                      patch(call.id, (c) => ({
                        ...c,
                        additionalTechnicianName: e.target.value,
                      }))
                    }
                  />
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ציוד שסופק</Label>
                <Textarea
                  rows={2}
                  placeholder="פרט את הציוד שסופק ללקוח (מלל חופשי)"
                  value={call.equipmentSupplied ?? ""}
                  onChange={(e) =>
                    patch(call.id, (c) => ({ ...c, equipmentSupplied: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">נושאים להמשך טיפול / הצעת מחיר</Label>
                <Textarea
                  rows={2}
                  placeholder="מה נותר לטיפול? האם נדרשת הצעת מחיר? (מלל חופשי)"
                  value={call.followUp ?? ""}
                  onChange={(e) => patch(call.id, (c) => ({ ...c, followUp: e.target.value }))}
                />
              </div>
            </div>

            <Textarea
              rows={3}
              placeholder="עדכון טיפול / תשובה למנהל"
              value={drafts[call.id] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [call.id]: e.target.value }))}
            />

            <div className="space-y-3 rounded-xl border border-border bg-surface-2/50 p-3">
              <p className="text-xs font-semibold text-muted-foreground">אישור לקוח בשטח</p>
              <div className="space-y-2">
                <Label className="text-xs">שם הלקוח המאשר</Label>
                <Input
                  value={call.approverName ?? ""}
                  onChange={(e) => patch(call.id, (c) => ({ ...c, approverName: e.target.value }))}
                  placeholder="שם מלא של הלקוח המאשר"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">חתימת הלקוח המאשר</Label>
                <SignaturePad
                  value={call.approverSignature}
                  onSave={(dataUrl) => {
                    patch(call.id, (c) => ({
                      ...c,
                      approverSignature: dataUrl,
                      approvedAt: nowStamp(),
                    }));
                    toast.success("חתימת הלקוח נשמרה.");
                  }}
                  onClear={() =>
                    patch(call.id, (c) => ({
                      ...c,
                      approverSignature: undefined,
                      approvedAt: undefined,
                    }))
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  ניתן לחתום ישירות במסך הטלפון באמצעות האצבע.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="brand" size="sm" onClick={() => respond(call)}>
                <Send className="size-4" />
                שלח עדכון
              </Button>
              <Button variant="soft" size="sm" onClick={() => respond(call, "in_progress")}>
                <Eye className="size-4" />
                בטיפול
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmCloseId(call.id)}>
                <CheckCircle2 className="size-4" />
                סיום טיפול
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cameraRefs.current[call.id]?.click()}
              >
                <Camera className="size-4" />
                צרף תמונה
              </Button>
              <input
                ref={(el) => {
                  cameraRefs.current[call.id] = el;
                }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  void addPhoto(call, e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </CallCard>
      ))}

      <Dialog open={!!confirmCloseId} onOpenChange={(open) => !open && setConfirmCloseId(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">סגירת קריאת שירות</DialogTitle>
          </DialogHeader>
          <p className="text-right text-sm text-muted-foreground">האם לסגור את קריאת השירות?</p>
          <div className="flex flex-row-reverse justify-end gap-2">
            <Button
              variant="brand"
              onClick={() => {
                const call = myCalls.find((c) => c.id === confirmCloseId);
                if (call) {
                  respond(call, "done");
                  toast.success("הטופס נשלח למנהל בהצלחה", { duration: 3000 });
                }
                setConfirmCloseId(null);
              }}
            >
              כן
            </Button>
            <Button variant="outline" onClick={() => setConfirmCloseId(null)}>
              לא
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
