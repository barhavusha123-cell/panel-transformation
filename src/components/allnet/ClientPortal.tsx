import { useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, Headset, MapPin, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useAllNet } from "@/lib/allnet/store";
import { nowStamp } from "@/lib/allnet/utils";
import {
  SERVICE_STATUS_LABELS,
  formatCallNumber,
  type ServiceAttachment,
  type ServiceCall,
  type ServiceCallStatus,
} from "@/lib/allnet/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

interface SiteOption {
  id: string;
  name: string;
  address?: string;
}

const statusTone: Record<ServiceCallStatus, string> = {
  new: "bg-red-100 text-red-700 border-red-200",
  assigned: "bg-orange-100 text-orange-700 border-orange-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  done: "bg-emerald-100 text-emerald-700 border-emerald-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
};

export function ClientPortal() {
  const { state, setState, session } = useAllNet();
  const user = session?.user ?? null;

  const client = useMemo(() => {
    if (!user) return null;
    return (
      state.clients.find((c) => c.id === user.clientId) ??
      state.clients.find((c) => c.name.trim() === user.full_name.trim()) ??
      null
    );
  }, [state.clients, user]);

  const sites = useMemo<SiteOption[]>(() => {
    if (!client) return [];
    const list: SiteOption[] = (client.sites ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      ...(s.address ? { address: s.address } : {}),
    }));
    if (list.length) return list;
    // fallback — פרויקטים של הלקוח או כתובת ראשית עד שיוקמו אתרים
    const fromProjects: SiteOption[] = state.projects
      .filter((p) => (p.client ?? "").trim() === client.name.trim())
      .map((p) => ({ id: `p-${p.name}`, name: p.name }));
    if (fromProjects.length) return fromProjects;
    return client.address ? [{ id: "main", name: client.address, address: client.address }] : [];
  }, [client, state.projects]);

  const [site, setSite] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [attachments, setAttachments] = useState<ServiceAttachment[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const myCalls = useMemo(
    () =>
      state.serviceCalls
        .filter(
          (c) =>
            c.source === "client" &&
            (c.createdBy === user?.username || (client && c.client.trim() === client.name.trim())),
        )
        .slice()
        .sort((a, b) => b.number - a.number),
    [state.serviceCalls, user, client],
  );

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      const reader = new FileReader();
      reader.onload = () =>
        setAttachments((prev) => [
          ...prev,
          {
            id: uid(),
            name: f.name,
            dataUrl: String(reader.result),
            isImage: f.type.startsWith("image/"),
          },
        ]);
      reader.readAsDataURL(f);
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) {
      toast.error("המשתמש אינו משויך ללקוח. יש לפנות למנהל המערכת.");
      return;
    }
    if (!site) {
      toast.error("יש לבחור אתר.");
      return;
    }
    if (!subject.trim()) {
      toast.error("יש להזין את מהות התקלה.");
      return;
    }
    const siteName = sites.find((s) => s.id === site)?.name ?? site;
    const siteAddress = sites.find((s) => s.id === site)?.address ?? client.address;

    const call: ServiceCall = {
      id: uid(),
      number: (state.serviceCalls.at(-1)?.number ?? 0) + 1,
      client: client.name,
      project: undefined,
      subject: subject.trim(),
      description: description.trim(),
      priority: client.sla ? "high" : "normal",
      technician: undefined,
      status: "new",
      createdAt: nowStamp(),
      createdBy: user?.username ?? client.name,
      contact: contact.trim() || client.contactName || undefined,
      address: siteAddress || undefined,
      attachments,
      updates: [
        {
          id: uid(),
          at: nowStamp(),
          by: user?.full_name ?? client.name,
          text: `הקריאה נפתחה על ידי הלקוח מפורטל הלקוחות — אתר: ${siteName}`,
          status: "new",
        },
      ],
      source: "client",
      site: siteName,
    };

    setState((prev) => ({ ...prev, serviceCalls: [...prev.serviceCalls, call] }));
    toast.success(`קריאת השירות ${formatCallNumber(call.number)} נפתחה ונשלחה למוקד.`);
    setSite("");
    setSubject("");
    setDescription("");
    setContact("");
    setAttachments([]);
  };

  const confirmClosure = (call: ServiceCall) => {
    const at = nowStamp();
    const by = user?.full_name ?? client?.name ?? "לקוח";
    setState((prev) => ({
      ...prev,
      serviceCalls: prev.serviceCalls.map((c) =>
        c.id === call.id
          ? {
              ...c,
              clientClosedAt: at,
              clientClosedBy: by,
              updates: [
                ...c.updates,
                {
                  id: uid(),
                  at,
                  by,
                  text: "הלקוח אישר שהתקלה נסגרה וניתן לסגור את הקריאה.",
                  status: "done" as ServiceCallStatus,
                },
              ],
            }
          : c,
      ),
    }));
    toast.success("תודה! אישור סגירת הקריאה נשלח למוקד.");
  };

  if (!user) return null;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="surface-panel rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Headset className="size-5 text-primary" />
              פתיחת קריאת שירות
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {client ? client.name : "לא שויך לקוח למשתמש זה"}
              {client?.sla && (
                <span className="mr-2 font-semibold text-destructive">· לקוח בשירות SLA</span>
              )}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {myCalls.length} קריאות שנפתחו
          </Badge>
        </div>

        {!client ? (
          <p className="mt-6 text-sm text-muted-foreground">
            יש לפנות למנהל המערכת לשיוך המשתמש ללקוח ולהגדרת האתרים.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                אתר
              </Label>
              <Select value={site} onValueChange={setSite}>
                <SelectTrigger>
                  <SelectValue placeholder={sites.length ? "בחר אתר" : "לא הוגדרו אתרים"} />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>איש קשר באתר</Label>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="שם / טלפון"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>מהות התקלה</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="לדוגמה: מצלמה 4 לא משדרת"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>תיאור מפורט</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="פרט את התקלה, מתי התחילה וכל מידע רלוונטי"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>צילום התקלה / קבצים</Label>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera className="size-4" />
                  צלם תקלה
                </Button>
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="size-4" />
                  צרף קובץ
                </Button>
              </div>
              {attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {attachments.map((a) => (
                    <div
                      key={a.id}
                      className="relative flex w-28 flex-col items-center gap-1 rounded-xl border border-border p-2"
                    >
                      {a.isImage ? (
                        <img
                          src={a.dataUrl}
                          alt={a.name}
                          className="h-16 w-full rounded-lg object-cover"
                        />
                      ) : (
                        <Paperclip className="size-8 text-muted-foreground" />
                      )}
                      <span className="w-full truncate text-[11px] text-muted-foreground">
                        {a.name}
                      </span>
                      <button
                        type="button"
                        aria-label="הסר קובץ"
                        onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                        className="absolute -left-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" variant="brand" className="w-full sm:w-auto">
                <Send className="size-4" />
                שלח קריאת שירות
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="surface-panel rounded-2xl p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <CheckCircle2 className="size-5 text-primary" />
          הקריאות שלי
        </h3>
        <div className="mt-4 space-y-3">
          {myCalls.map((c) => (
            <div key={c.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {formatCallNumber(c.number)} · {c.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.site ? `${c.site} · ` : ""}
                    {c.createdAt}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={statusTone[c.status]}>
                    {SERVICE_STATUS_LABELS[c.status]}
                  </Badge>
                  {c.clientClosedAt && (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      אושרה סגירה · {c.clientClosedAt}
                    </Badge>
                  )}
                </div>
              </div>

              {/* עדכוני סטטוס מהמוקד — מסונכרן תמיד */}
              {c.updates.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                  {c.updates.map((u) => (
                    <li key={u.id}>
                      <span className="font-medium text-foreground">{u.at}</span> · {u.by}
                      {u.status ? ` · ${SERVICE_STATUS_LABELS[u.status]}` : ""} — {u.text}
                    </li>
                  ))}
                </ul>
              )}

              {c.status === "done" && !c.clientClosedAt && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 p-3">
                  <span className="text-sm text-emerald-800">
                    הטיפול הסתיים — נא לאשר שהתקלה נסגרה.
                  </span>
                  <Button type="button" size="sm" onClick={() => confirmClosure(c)}>
                    <CheckCircle2 className="size-4" />
                    מאשר שהתקלה נסגרה
                  </Button>
                </div>
              )}
            </div>
          ))}
          {!myCalls.length && (
            <p className="text-sm text-muted-foreground">טרם נפתחו קריאות שירות.</p>
          )}
        </div>
      </div>
    </div>
  );
}
