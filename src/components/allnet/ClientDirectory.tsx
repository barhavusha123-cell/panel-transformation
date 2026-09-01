import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAllNet } from "@/lib/allnet/store";
import type { Client } from "@/lib/allnet/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const emptyForm = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  taxId: "",
  address: "",
  notes: "",
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
      [c.name, c.contactName, c.phone, c.email, c.taxId, c.address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [clients, query]);

  const projectCount = useMemo(() => {
    const map = new Map<string, number>();
    state.projects.forEach((p) => {
      const n = (p.client ?? "").trim();
      if (n) map.set(n, (map.get(n) ?? 0) + 1);
    });
    return map;
  }, [state.projects]);

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
      phone: c.phone ?? "",
      email: c.email ?? "",
      taxId: c.taxId ?? "",
      address: c.address ?? "",
      notes: c.notes ?? "",
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
                phone: form.phone.trim(),
                email: form.email.trim(),
                taxId: form.taxId.trim(),
                address: form.address.trim(),
                notes: form.notes.trim(),
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
        phone: form.phone.trim(),
        email: form.email.trim(),
        taxId: form.taxId.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
        createdAt: new Date().toISOString(),
      };
      return { ...prev, clients: [...list, client] };
    });
    toast.success(editingId ? "פרטי הלקוח עודכנו." : "הלקוח נוצר בהצלחה.");
    setOpen(false);
  };

  const remove = (c: Client) => {
    const linked = projectCount.get(c.name.trim()) ?? 0;
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="surface-panel flex flex-col gap-3 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    {c.taxId && (
                      <p className="text-xs text-muted-foreground">ח.פ {c.taxId}</p>
                    )}
                  </div>
                </div>
                <Badge variant="secondary">
                  {projectCount.get(c.name.trim()) ?? 0} פרויקטים
                </Badge>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {c.contactName && (
                  <p className="flex items-center gap-2">
                    <UserRound className="size-3.5" /> {c.contactName}
                  </p>
                )}
                {c.phone && (
                  <p className="flex items-center gap-2" dir="ltr" style={{ textAlign: "end" }}>
                    <Phone className="size-3.5" /> {c.phone}
                  </p>
                )}
                {c.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="size-3.5" /> {c.email}
                  </p>
                )}
                {c.address && (
                  <p className="flex items-center gap-2">
                    <MapPin className="size-3.5" /> {c.address}
                  </p>
                )}
                {c.notes && <p className="text-xs">הערות: {c.notes}</p>}
              </div>
              <div className="mt-auto flex gap-2 pt-1">
                <Button size="sm" variant="soft" onClick={() => openEdit(c)}>
                  <Pencil className="size-4" />
                  ערוך
                </Button>
                <Button
                  size="sm"
                  variant="soft"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => remove(c)}
                >
                  <Trash2 className="size-4" />
                  מחק
                </Button>
              </div>
            </div>
          ))}
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
              <Label>שם הלקוח *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="שם החברה / הלקוח"
              />
            </div>
            <div className="space-y-2">
              <Label>איש קשר</Label>
              <Input
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>טלפון</Label>
              <Input
                dir="ltr"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
