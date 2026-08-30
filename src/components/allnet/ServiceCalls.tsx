import { useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  Eye,
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
import { formatDateIL, nowStamp } from "@/lib/allnet/utils";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SERVICE_PRIORITIES,
  SERVICE_PRIORITY_LABELS,
  SERVICE_STATUSES,
  SERVICE_STATUS_LABELS,
  type ServiceAttachment,
  type ServiceCall,
  type ServiceCallPriority,
  type ServiceCallStatus,
} from "@/lib/allnet/types";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
    new: "bg-destructive/10 text-destructive border-destructive/30",
    assigned: "bg-primary/10 text-primary border-primary/30",
    in_progress: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    done: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[status]}`}>
      {SERVICE_STATUS_LABELS[status]}
    </span>
  );
}

function priorityBadge(p: ServiceCallPriority) {
  if (p === "high")
    return (
      <Badge variant="destructive" className="text-xs">
        דחופה
      </Badge>
    );
  return (
    <Badge variant={p === "normal" ? "secondary" : "outline"} className="text-xs">
      {SERVICE_PRIORITY_LABELS[p]}
    </Badge>
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
        <span className="text-base font-bold">קריאה #{call.number}</span>
        {statusBadge(call.status)}
        {priorityBadge(call.priority)}
        <span className="text-sm">
          <span className="text-muted-foreground">לקוח: </span>
          <span className="font-semibold">{call.client}</span>
        </span>
        <span className="text-sm">
          <span className="text-muted-foreground">טכנאי: </span>
          <span className="font-semibold">{technicianName}</span>
        </span>
        <span className="text-xs text-muted-foreground">נפתחה {formatDateIL(call.createdAt)}</span>
        {call.closedAt && (
          <span className="text-xs font-medium text-emerald-700">
            נסגרה {formatDateIL(call.closedAt)}
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
            <span className="text-muted-foreground">פרויקט: </span>
            {call.project}
          </p>
        )}
        {call.contact && (
          <p>
            <span className="text-muted-foreground">איש קשר: </span>
            {call.contact}
          </p>
        )}
        {call.address && (
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">כתובת: </span>
            {call.address}
          </p>
        )}
      </div>

      <p className="mt-3 font-semibold">{call.subject}</p>
      {call.description && (
        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
          {call.description}
        </p>
      )}

      <div className="mt-3">
        <Attachments items={call.attachments} />
      </div>

      {call.updates.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground">יומן טיפול</p>
          {call.updates.map((u) => (
            <div key={u.id} className="rounded-xl bg-surface-2/60 p-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
              <span className="text-muted-foreground">שם הלקוח המאשר: </span>
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
            <p className="text-xs text-muted-foreground">נחתם בתאריך {formatDateIL(call.approvedAt)}</p>
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
  const { state, setState } = useAllNet();
  const technicians = useTechnicians();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [client, setClient] = useState("");
  const [project, setProject] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ServiceCallPriority>("normal");
  const [technician, setTechnician] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [attachments, setAttachments] = useState<ServiceAttachment[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | ServiceCallStatus>("all");
  const [techFilter, setTechFilter] = useState("all");
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

  const clients = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...state.projects.map((p) => p.client ?? ""),
            ...state.serviceCalls.map((c) => c.client ?? ""),
          ]
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "he")),
    [state.projects, state.serviceCalls],
  );

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
      .filter((c) => (statusFilter === "all" ? true : c.status === statusFilter))
      .filter((c) => (techFilter === "all" ? true : c.technician === techFilter))
      .slice()
      .sort((a, b) => b.number - a.number);
  }, [state.serviceCalls, statusFilter, techFilter]);

  const techName = (username?: string) =>
    technicians.find((u) => u.username === username)?.full_name ?? "לא שויך";

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
    toast.success(`קריאת שירות #${call.number} נפתחה בהצלחה.`);
    reset();
    setOpen(false);
  };

  const patch = (id: string, updater: (c: ServiceCall) => ServiceCall) =>
    setState((prev) => ({
      ...prev,
      serviceCalls: prev.serviceCalls.map((c) => (c.id === id ? updater(c) : c)),
    }));

  const remove = (id: string) =>
    setState((prev) => ({ ...prev, serviceCalls: prev.serviceCalls.filter((c) => c.id !== id) }));

  const counts = useMemo(
    () => ({
      open: state.serviceCalls.filter((c) => c.status !== "done").length,
      unassigned: state.serviceCalls.filter((c) => !c.technician).length,
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
        <Button variant="brand" className="ms-auto" onClick={() => setOpen((o) => !o)}>
          <Plus className="size-4" />
          {open ? "סגור טופס" : "פתח קריאת שירות"}
        </Button>
      </div>

      {open && (
        <form onSubmit={create} className="animate-rise surface-panel rounded-2xl p-4 sm:p-6">
          <h4 className="mb-4 text-base font-bold">פתיחת קריאת שירות חדשה</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>שם לקוח</Label>
              <Input
                list="service-clients"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="שם הלקוח"
              />
              <datalist id="service-clients">
                {clients.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label>אתר (לא חובה)</Label>
              <Input
                list="service-projects"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="שם האתר / הפרויקט"
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
            </div>

            <div className="space-y-2">
              <Label>איש קשר בשטח</Label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="שם וטלפון" />
            </div>

            <div className="space-y-2">
              <Label>כתובת האתר</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="כתובת" />
            </div>

            <div className="space-y-3 md:col-span-2">
              <Label>תמונות וקבצים</Label>
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

          <div className="mt-5 flex justify-end">
            <Button type="submit" variant="brand" size="lg">
              <Send className="size-4" />
              פתח קריאת שירות
            </Button>
          </div>
        </form>
      )}

      <div className="surface-panel flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <div className="min-w-40 flex-1 space-y-1">
          <Label className="text-xs">סינון לפי סטטוס</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              {SERVICE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SERVICE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-40 flex-1 space-y-1">
          <Label className="text-xs">סינון לפי טכנאי</Label>
          <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הטכנאים</SelectItem>
              {technicians.map((u) => (
                <SelectItem key={u.username} value={u.username}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {calls.length ? (
        <div className="space-y-4">
          {calls.map((call) => (
            <CallCard key={call.id} call={call} technicianName={techName(call.technician)}>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-44 space-y-1">
                  <Label className="text-xs">
                    <UserCog className="me-1 inline size-3" />
                    שיוך טכנאי
                  </Label>
                  <Select
                    value={call.technician || "none"}
                    onValueChange={(v) =>
                      patch(call.id, (c) => ({
                        ...c,
                        technician: v === "none" ? undefined : v,
                        status: v === "none" ? "new" : c.status === "new" ? "assigned" : c.status,
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
                    value={call.status}
                    onValueChange={(v) =>
                      patch(call.id, (c) => ({
                        ...c,
                        status: v as ServiceCallStatus,
                        closedAt: v === "done" ? (c.closedAt ?? nowStamp()) : undefined,
                      }))
                    }
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
                <Button variant="soft" onClick={() => setEditing(call)}>
                  <Pencil className="size-4" />
                  ערוך קריאה
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm(`למחוק את קריאת השירות #${call.number}?`)) {
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
          ))}
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
              עריכת קריאת שירות #{editing?.number}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>שם לקוח</Label>
                <Input
                  list="service-clients"
                  value={editing.client}
                  onChange={(e) => setEditing({ ...editing, client: e.target.value })}
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
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="soft" onClick={() => editCameraRef.current?.click()}>
                    <Camera className="size-4" />
                    צילום ממצלמה
                  </Button>
                  <Button type="button" variant="outline" onClick={() => editFileRef.current?.click()}>
                    <Paperclip className="size-4" />
                    צירוף קבצים
                  </Button>
                </div>
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
        .filter((c) => c.technician === user?.username && c.status !== "done")
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
      closedAt:
        status === "done"
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
                  onChange={(e) =>
                    patch(call.id, (c) => ({ ...c, approverName: e.target.value }))
                  }
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
          <p className="text-right text-sm text-muted-foreground">
            האם לסגור את קריאת השירות?
          </p>
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
