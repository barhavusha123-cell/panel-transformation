import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  FileSpreadsheet,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAllNet } from "@/lib/allnet/store";
import type { Client, ClientDocRow } from "@/lib/allnet/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

const emptyForm = {
  name: "",
  contactName: "",
  managementPhone: "",
  accountingContact: "",
  accountingPhone: "",
  office: "",
  email: "",
  taxId: "",
  address: "",
  notes: "",
  sla: false,
  docNotes: "",
  docRows: [] as ClientDocRow[],
};

/** קטגוריות תיעוד קבועות — עד 5 שורות לכל קטגוריה */
const DOC_CATEGORIES = [
  "תקשורת",
  "מצלמות אבטחה",
  "מערכות אזעקה",
  "בקרות כניסה ואינטרקומים",
  "מחשוב",
  "רישיונות",
  "אינטרנט",
] as const;

const MAX_DOC_ROWS_PER_CATEGORY = 5;

const DOC_FIELDS: { key: keyof ClientDocRow; label: string }[] = [
  { key: "item", label: "הפריט" },
  { key: "ip", label: "כתובת IP" },
  { key: "location", label: "מיקום" },
  { key: "serial", label: "מספר סידורי" },
  { key: "access", label: "משתמש" },
  { key: "password", label: "סיסמא" },
  { key: "notes", label: "הערות" },
];

/** התאמת כותרות עמודות מאקסל לשדות התיעוד */
const HEADER_MAP: { field: keyof ClientDocRow; hints: string[] }[] = [
  { field: "category", hints: ["קטגוריה", "סוג", "מערכת ראשית", "category", "type"] },
  { field: "item", hints: ["פריט", "מערכת", "רכיב", "תיאור", "שם", "item", "device", "name", "description"] },
  { field: "model", hints: ["דגם", "יצרן", "model", "vendor", "manufacturer", "brand"] },
  { field: "ip", hints: ["ip", "כתובת ip", "כתובת", "mac", "address", "host"] },
  { field: "location", hints: ["מיקום", "אתר", "חדר", "קומה", "location", "site", "room"] },
  { field: "serial", hints: ["מספר סידורי", "סידורי", "serial", "s/n", "sn"] },
  { field: "access", hints: ["גישה", "משתמש", "user", "username", "login", "access"] },
  { field: "password", hints: ["סיסמא", "סיסמה", "password", "pass", "pwd"] },
  { field: "notes", hints: ["הערות", "הערה", "notes", "comment", "remark"] },
];

const matchField = (header: string): keyof ClientDocRow | null => {
  const h = header.trim().toLowerCase();
  if (!h) return null;
  for (const { field, hints } of HEADER_MAP) {
    if (hints.some((x) => h === x.toLowerCase() || h.includes(x.toLowerCase()))) return field;
  }
  return null;
};

const FIRST_CLIENT_NUMBER = 26001;

const nextClientNumber = (list: { clientNumber?: number }[]) =>
  Math.max(
    FIRST_CLIENT_NUMBER - 1,
    ...list.map((c) => c.clientNumber ?? 0),
  ) + 1;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function ClientDirectory() {
  const { state, setState } = useAllNet();
  const clients = state.clients ?? [];
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState("details");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // השלמת מספרי לקוח ללקוחות ותיקים (לפי סדר ההקמה)
  useEffect(() => {
    if (!clients.some((c) => !c.clientNumber)) return;
    setState((prev) => {
      const list = prev.clients ?? [];
      if (!list.some((c) => !c.clientNumber)) return prev;
      let next = nextClientNumber(list);
      const ordered = [...list].sort((a, b) =>
        (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
      );
      const assigned = new Map<string, number>();
      ordered.forEach((c) => {
        if (!c.clientNumber) assigned.set(c.id, next++);
      });
      return {
        ...prev,
        clients: list.map((c) =>
          assigned.has(c.id) ? { ...c, clientNumber: assigned.get(c.id)! } : c,
        ),
      };
    });
  }, [clients, setState]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...clients].sort((a, b) => a.name.localeCompare(b.name, "he"));
    if (!q) return list;
    return list.filter((c) =>
      [c.name, c.contactName, c.managementPhone, c.accountingContact, c.accountingPhone, c.office, c.phone, c.email, c.taxId, c.address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [clients, query]);


  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setTab("details");
    setOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      contactName: c.contactName ?? "",
      managementPhone: c.managementPhone ?? c.phone ?? "",
      accountingContact: c.accountingContact ?? "",
      accountingPhone: c.accountingPhone ?? "",
      office: c.office ?? "",
      email: c.email ?? "",
      taxId: c.taxId ?? "",
      address: c.address ?? "",
      notes: c.notes ?? "",
      sla: c.sla ?? false,
      docNotes: c.docNotes ?? "",
      docRows: c.docRows ?? [],
    });
    setTab("details");
    setOpen(true);
  };

  const addDocRow = () =>
    setForm((f) => ({ ...f, docRows: [...f.docRows, { id: newId() }] }));

  const updateDocRow = (id: string, key: keyof ClientDocRow, value: string) =>
    setForm((f) => ({
      ...f,
      docRows: f.docRows.map((r) => (r.id === id ? { ...r, [key]: value } : r)),
    }));

  const removeDocRow = (id: string) =>
    setForm((f) => ({ ...f, docRows: f.docRows.filter((r) => r.id !== id) }));

  /** ייבוא תיק תיעוד מקובץ אקסל — כל גיליון, זיהוי כותרות אוטומטי */
  const importExcel = async (file: File) => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rows: ClientDocRow[] = [];
      wb.SheetNames.forEach((sheetName) => {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) return;
        const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          blankrows: false,
          defval: "",
        });
        if (!grid.length) return;
        // איתור שורת הכותרות (השורה הראשונה עם 2+ תאים מזוהים)
        let headerIdx = -1;
        let mapping: (keyof ClientDocRow | null)[] = [];
        for (let i = 0; i < Math.min(grid.length, 10); i++) {
          const cand = (grid[i] ?? []).map((c) => matchField(String(c ?? "")));
          if (cand.filter(Boolean).length >= 2) {
            headerIdx = i;
            mapping = cand;
            break;
          }
        }
        const headers = headerIdx >= 0 ? (grid[headerIdx] as unknown[]) : [];
        const start = headerIdx >= 0 ? headerIdx + 1 : 0;
        for (let i = start; i < grid.length; i++) {
          const line = grid[i] ?? [];
          if (!line.some((c) => String(c ?? "").trim())) continue;
          const row: ClientDocRow = { id: newId(), category: sheetName };
          const extras: string[] = [];
          line.forEach((cell, idx) => {
            const val = String(cell ?? "").trim();
            if (!val) return;
            const field = mapping[idx] ?? null;
            if (field && field !== "id") {
              row[field] = row[field] ? `${row[field]} | ${val}` : val;
            } else {
              const h = String(headers[idx] ?? "").trim();
              extras.push(h ? `${h}: ${val}` : val);
            }
          });
          if (extras.length) {
            row.notes = [row.notes, extras.join(" · ")].filter(Boolean).join(" · ");
          }
          if (!row.item && !row.ip && !row.notes && !row.model) continue;
          rows.push(row);
        }
      });
      if (!rows.length) {
        toast.error("לא נמצאו שורות מידע בקובץ.");
        return;
      }
      setForm((f) => ({ ...f, docRows: [...f.docRows, ...rows] }));
      toast.success(`יובאו ${rows.length} שורות תיעוד מהקובץ.`);
    } catch {
      toast.error("שגיאה בקריאת קובץ האקסל.");
    }
  };

  const save = () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("יש להזין שם לקוח.");
      return;
    }
    const dup = clients.some(
      (c) => c.id !== editingId && c.name.trim() === name,
    );
    if (dup) {
      toast.error("קיים כבר לקוח בשם זה.");
      return;
    }
    setState((prev) => {
      const list = prev.clients ?? [];
      if (editingId) {
        const old = list.find((c) => c.id === editingId);
        const updated = list.map((c) =>
          c.id === editingId
            ? {
                ...c,
                name,
                contactName: form.contactName.trim(),
                managementPhone: form.managementPhone.trim(),
                accountingContact: form.accountingContact.trim(),
                accountingPhone: form.accountingPhone.trim(),
                office: form.office.trim(),
                phone: form.managementPhone.trim(),
                email: form.email.trim(),
                taxId: form.taxId.trim(),
                address: form.address.trim(),
                notes: form.notes.trim(),
                sla: form.sla,
                docNotes: form.docNotes,
                docRows: form.docRows,
              }
            : c,
        );
        // אם שם הלקוח השתנה — לעדכן גם את הפרויקטים המשויכים
        const projects =
          old && old.name !== name
            ? prev.projects.map((p) =>
                (p.client ?? "").trim() === old.name ? { ...p, client: name } : p,
              )
            : prev.projects;
        return { ...prev, clients: updated, projects };
      }
      const client: Client = {
        id: newId(),
        clientNumber: nextClientNumber(list),
        name,
        contactName: form.contactName.trim(),
        managementPhone: form.managementPhone.trim(),
        accountingContact: form.accountingContact.trim(),
        accountingPhone: form.accountingPhone.trim(),
        office: form.office.trim(),
        phone: form.managementPhone.trim(),
        email: form.email.trim(),
        taxId: form.taxId.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
        sla: form.sla,
        docNotes: form.docNotes,
        docRows: form.docRows,
        createdAt: new Date().toISOString(),
      };
      return { ...prev, clients: [...list, client] };
    });
    toast.success(editingId ? "פרטי הלקוח עודכנו." : "הלקוח נוצר בהצלחה.");
    setOpen(false);
  };

  const remove = (c: Client) => {
    const linked = state.projects.filter(
      (p) => (p.client ?? "").trim() === c.name.trim(),
    ).length;
    if (linked > 0) {
      toast.error(`לא ניתן למחוק — ללקוח משויכים ${linked} פרויקטים.`);
      return;
    }
    if (!window.confirm(`למחוק את הלקוח "${c.name}"?`)) return;
    setState((prev) => ({
      ...prev,
      clients: (prev.clients ?? []).filter((x) => x.id !== c.id),
    }));
    toast.success("הלקוח נמחק.");
  };

  return (
    <div className="space-y-5">
      <div className="surface-panel rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">ניהול לקוחות</h3>
              <p className="text-xs text-muted-foreground">
                {clients.length} לקוחות רשומים · ניתן לבחור לקוח מתוך הרשימה בהקמת פרויקט
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="brand" onClick={openNew}>
              <Plus className="size-4" />
              לקוח חדש
            </Button>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="relative max-w-sm">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לקוח לפי שם, טלפון, דוא״ל..."
            className="ps-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="surface-panel rounded-2xl p-6 text-sm text-muted-foreground">
          {clients.length === 0
            ? "עוד לא נרשמו לקוחות. לחץ על \"לקוח חדש\" כדי להתחיל."
            : "לא נמצאו לקוחות התואמים לחיפוש."}
        </p>
      ) : (
        <div className="surface-panel overflow-hidden rounded-2xl">
          <div className="hidden items-center gap-3 border-b border-border/60 bg-muted/40 px-4 py-2 text-[11px] font-medium text-muted-foreground lg:grid lg:grid-cols-[4rem_minmax(0,2fr)_9rem_9rem_7rem_10rem_5rem]">
            <span>מס׳ לקוח</span>
            <span>שם הלקוח</span>
            <span>מנהל / בעלים</span>
            <span>הנהלת חשבונות</span>
            <span>משרד</span>
            <span>דוא״ל</span>
            <span className="text-center">פעולות</span>
          </div>
          <ul className="divide-y divide-border/50">
            {filtered.map((c) => (
              <li
                key={c.id}
                className="group flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm transition-colors hover:bg-muted/40 lg:grid lg:grid-cols-[4rem_minmax(0,2fr)_9rem_9rem_7rem_10rem_5rem] lg:gap-3"
              >
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground lg:w-auto">
                  {c.clientNumber ?? "—"}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-2 lg:w-auto lg:min-w-0">
                  <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Building2 className="size-3.5" />
                  </div>
                  <span className="truncate font-medium">{c.name}</span>
                  {c.taxId && (
                    <span className="hidden shrink-0 text-[11px] text-muted-foreground lg:inline">
                      ח.פ {c.taxId}
                    </span>
                  )}
                </div>
                <span className="w-36 shrink-0 truncate text-muted-foreground lg:w-auto">
                  {c.contactName || c.managementPhone || c.phone ? (
                    <span className="flex flex-col gap-0.5">
                      {c.contactName && (
                        <span className="flex items-center gap-1.5">
                          <UserRound className="size-3.5 shrink-0" />
                          {c.contactName}
                        </span>
                      )}
                      {(c.managementPhone || c.phone) && (
                        <span className="flex items-center gap-1.5 text-[11px]" dir="ltr" style={{ textAlign: "end" }}>
                          <Phone className="size-3 shrink-0" />
                          {c.managementPhone || c.phone}
                        </span>
                      )}
                    </span>
                  ) : (
                    ""
                  )}
                </span>
                <span className="w-36 shrink-0 truncate text-muted-foreground lg:w-auto">
                  {c.accountingContact || c.accountingPhone ? (
                    <span className="flex flex-col gap-0.5">
                      {c.accountingContact && (
                        <span className="flex items-center gap-1.5">
                          <UserRound className="size-3.5 shrink-0" />
                          {c.accountingContact}
                        </span>
                      )}
                      {c.accountingPhone && (
                        <span className="flex items-center gap-1.5 text-[11px]" dir="ltr" style={{ textAlign: "end" }}>
                          <Phone className="size-3 shrink-0" />
                          {c.accountingPhone}
                        </span>
                      )}
                    </span>
                  ) : (
                    ""
                  )}
                </span>
                <span className="w-28 shrink-0 truncate text-muted-foreground lg:w-auto">
                  {c.office || ""}
                </span>
                <span className="w-40 shrink-0 truncate text-muted-foreground lg:w-auto">
                  {c.email ? (
                    <span className="flex items-center gap-1.5">
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate" dir="ltr">{c.email}</span>
                    </span>
                  ) : (
                    ""
                  )}
                </span>
                <span className="flex w-20 shrink-0 justify-end gap-1 lg:w-auto">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    title="ערוך"
                    onClick={() => openEdit(c)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive hover:bg-destructive/10"
                    title="מחק"
                    onClick={() => remove(c)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </span>
                {c.address && (
                  <span className="flex w-full items-center gap-1.5 text-[11px] text-muted-foreground lg:hidden">
                    <MapPin className="size-3" />
                    {c.address}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "עריכת לקוח" : "פתיחת לקוח חדש"}</DialogTitle>
            <DialogDescription>
              פרטי הלקוח ישמשו בהקמת פרויקטים ובקריאות שירות.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="details">פרטי לקוח</TabsTrigger>
              <TabsTrigger value="docs">
                תיעוד ומידע נוסף
                {form.docRows.length > 0 && (
                  <span className="ms-2 rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                    {form.docRows.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>מספר לקוח</Label>
              <Input
                readOnly
                disabled
                dir="ltr"
                className="bg-muted/50"
                value={
                  editingId
                    ? String(
                        clients.find((c) => c.id === editingId)?.clientNumber ?? "",
                      )
                    : String(nextClientNumber(clients))
                }
              />
              <p className="text-[11px] text-muted-foreground">
                מספר רץ אוטומטי — אינו ניתן לעריכה.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>שם הלקוח *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="שם החברה / הלקוח"
              />
            </div>
            <div className="space-y-2">
              <Label>מנהל / בעלים</Label>
              <Input
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                placeholder="שם מנהל / בעלים"
              />
            </div>
            <div className="space-y-2">
              <Label>טלפון</Label>
              <Input
                dir="ltr"
                value={form.managementPhone}
                onChange={(e) => setForm({ ...form, managementPhone: e.target.value })}
                placeholder="טלפון מנהל / בעלים"
              />
            </div>
            <div className="space-y-2">
              <Label>הנהלת חשבונות</Label>
              <Input
                value={form.accountingContact}
                onChange={(e) => setForm({ ...form, accountingContact: e.target.value })}
                placeholder="איש קשר הנהלת חשבונות"
              />
            </div>
            <div className="space-y-2">
              <Label>טלפון הנהלת חשבונות</Label>
              <Input
                dir="ltr"
                value={form.accountingPhone}
                onChange={(e) => setForm({ ...form, accountingPhone: e.target.value })}
                placeholder="טלפון איש קשר הנהלת חשבונות"
              />
            </div>
            <div className="space-y-2">
              <Label>דוא״ל</Label>
              <Input
                type="email"
                dir="ltr"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>משרד</Label>
              <Input
                value={form.office}
                onChange={(e) => setForm({ ...form, office: e.target.value })}
                placeholder="כתובת / מספר משרד"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>ח.פ / עוסק מורשה</Label>
              <Input
                dir="ltr"
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>כתובת</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>הערות</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <Checkbox
                  checked={form.sla}
                  onCheckedChange={(v) => setForm({ ...form, sla: v === true })}
                  className="mt-0.5"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">SLA</span>
                  <span className="block text-xs text-muted-foreground">
                    בסימון אפשרות זו, קריאות שירות שייפתחו עבור לקוח זה יתועדפו
                    אוטומטית כדחופות.
                  </span>
                </span>
              </label>
            </div>
          </div>
            </TabsContent>

            <TabsContent value="docs" className="mt-4 space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) void importExcel(f);
                }}
                className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                }`}
              >
                <UploadCloud className="mx-auto size-6 text-primary" />
                <p className="mt-1 text-sm font-medium">
                  גרור לכאן תיק תיעוד באקסל (xlsx / xls / csv)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  הנתונים ייפרסו אוטומטית לטבלה — כל גיליון יזוהה כקטגוריה והכותרות
                  יותאמו לשדות (מערכת, יצרן/דגם, IP, מיקום, גישה, הערות).
                </p>
                <Button
                  variant="soft"
                  size="sm"
                  className="mt-2"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileSpreadsheet className="size-4" />
                  בחר קובץ
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importExcel(f);
                    e.target.value = "";
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {form.docRows.length} שורות תיעוד
                </p>
                <div className="flex gap-2">
                  {form.docRows.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setForm((f) => ({ ...f, docRows: [] }))}
                    >
                      <Trash2 className="size-4" />
                      נקה הכל
                    </Button>
                  )}
                  <Button variant="brand" size="sm" onClick={addDocRow}>
                    <Plus className="size-4" />
                    שורה חדשה
                  </Button>
                </div>
              </div>

              {form.docRows.length > 0 && (
                <div className="max-h-[45vh] overflow-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/60 text-[11px] text-muted-foreground">
                      <tr>
                        {DOC_FIELDS.map((f) => (
                          <th key={f.key} className="p-1.5 text-start font-medium">
                            {f.label}
                          </th>
                        ))}
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {form.docRows.map((row) => (
                        <tr key={row.id} className="align-top">
                          {DOC_FIELDS.map((f) => (
                            <td key={f.key} className="p-1">
                              {f.key === "category" ? (
                                <Input
                                  list="allnet-doc-categories"
                                  className="h-8 text-xs"
                                  value={row[f.key] ?? ""}
                                  onChange={(e) =>
                                    updateDocRow(row.id, f.key, e.target.value)
                                  }
                                />
                              ) : (
                                <Input
                                  className="h-8 text-xs"
                                  dir={f.key === "ip" ? "ltr" : undefined}
                                  value={row[f.key] ?? ""}
                                  onChange={(e) =>
                                    updateDocRow(row.id, f.key, e.target.value)
                                  }
                                />
                              )}
                            </td>
                          ))}
                          <td className="p-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-destructive hover:bg-destructive/10"
                              title="מחק שורה"
                              onClick={() => removeDocRow(row.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <datalist id="allnet-doc-categories">
                    {DOC_CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              )}

              <div className="space-y-2">
                <Label>מידע טכני חופשי / הערות תיעוד</Label>
                <Textarea
                  rows={5}
                  value={form.docNotes}
                  onChange={(e) => setForm({ ...form, docNotes: e.target.value })}
                  placeholder="טופולוגיית רשת, טווחי IP, VLANים, ספקי אינטרנט, פרטי ארונות תקשורת, מערכות מתח נמוך, הרשאות גישה וכו'"
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="soft" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button variant="brand" onClick={save}>
              {editingId ? "שמור שינויים" : "צור לקוח"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
