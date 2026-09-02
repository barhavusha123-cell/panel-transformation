import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ClipboardPaste,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useAllNet } from "@/lib/allnet/store";
import type { Client } from "@/lib/allnet/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
};

const FIRST_CLIENT_NUMBER = 26001;

const nextClientNumber = (list: { clientNumber?: number }[]) =>
  Math.max(
    FIRST_CLIENT_NUMBER - 1,
    ...list.map((c) => c.clientNumber ?? 0),
  ) + 1;

/** פענוח טקסט חופשי / חתימת מייל לפרטי לקוח */
function parseSignatureText(raw: string) {
  const text = raw.trim();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const result = {
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
  };
  if (!text) return result;

  const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (emailMatch) result.email = emailMatch[0];

  const phoneMatches = text.match(/0\d{1,2}[-\s]?\d{3}[-\s]?\d{4}/g) ?? [];
  if (phoneMatches[0]) result.managementPhone = phoneMatches[0].replace(/\s+/g, "-");
  if (phoneMatches[1]) result.accountingPhone = phoneMatches[1].replace(/\s+/g, "-");

  const taxMatch = text.match(/(?:ח\.?פ\.?|עוסק מורשה|ע\.?מ\.?)\s*[:\-]?\s*(\d{8,9})/);
  if (taxMatch?.[1]) result.taxId = taxMatch[1];

  const kv = (labels: string[]) => {
    for (const line of lines) {
      for (const lbl of labels) {
        const m = line.match(new RegExp(`^${lbl}\\s*[:\\-]\\s*(.+)$`));
        if (m?.[1]) return m[1].trim();
      }
    }
    return "";
  };

  result.name =
    kv(["שם הלקוח", "שם חברה", "חברה", "לקוח", "company"]) ||
    lines.find((l) => /(בע"מ|בע״מ|לימיטד|ltd|חברת)/i.test(l))?.replace(/\s*[-–|].*$/, "").trim() ||
    "";
  result.contactName = kv(["מנהל", "בעלים", "איש קשר", "contact"]) || "";
  result.office = kv(["משרד"]) || "";
  result.address = kv(["כתובת", "address"]) || "";

  // ניחוש שם איש קשר משורה ראשונה שאינה חברה/טלפון/מייל
  if (!result.contactName) {
    const person = lines.find(
      (l) =>
        !l.includes("@") &&
        !/0\d{1,2}[-\s]?\d{3}/.test(l) &&
        !/(בע"מ|בע״מ|לימיטד|ltd|חברת)/i.test(l) &&
        l.split(/\s+/).length <= 4,
    );
    if (person && person !== result.name) result.contactName = person;
  }

  if (!result.name) {
    const domain = result.email.split("@")[1];
    if (domain) result.name = domain.split(".")[0];
  }

  return result;
}

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
    });
    setOpen(true);
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
          <Button variant="brand" onClick={openNew}>
            <Plus className="size-4" />
            לקוח חדש
          </Button>
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
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "עריכת לקוח" : "פתיחת לקוח חדש"}</DialogTitle>
            <DialogDescription>
              פרטי הלקוח ישמשו בהקמת פרויקטים ובקריאות שירות.
            </DialogDescription>
          </DialogHeader>
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
