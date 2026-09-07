import { useMemo, useState } from "react";
import {
  Briefcase,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAllNet } from "@/lib/allnet/store";
import { ROLES, type Role } from "@/lib/allnet/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("");

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const dim = size === "lg" ? "size-16 text-xl" : "size-9 text-xs";
  return (
    <span
      className={`relative flex ${dim} shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-blue-dark`}
    >
      {name.trim() ? initials(name) : <UserRound className="size-1/2" />}
    </span>
  );
}

export function UserDirectory() {
  const { state, setState } = useAllNet();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const users = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...state.users].sort((a, b) =>
      a.full_name.localeCompare(b.full_name, "he"),
    );
    if (!q) return list;
    return list.filter((u) =>
      [u.full_name, u.username, u.email ?? "", u.role].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [state.users, query]);

  const projectsOf = (fullName: string) =>
    state.projects.filter(
      (p) => !p.archived && (p.team?.includes(fullName) || p.manager === fullName),
    );

  const clientNameOf = (clientId?: string) =>
    state.clients.find((c) => c.id === clientId)?.name ?? "";

  const remove = (username: string, fullName: string) => {
    if (!window.confirm(`למחוק את המשתמש "${fullName}"?`)) return;
    setState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.username !== username),
    }));
    toast.success("המשתמש הוסר בהצלחה.");
  };

  return (
    <div className="space-y-5">
      <div className="surface-panel rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">ניהול משתמשים</h3>
              <p className="text-xs text-muted-foreground">
                {state.users.length} משתמשים פעילים · לחץ על שורה לעריכת פרופיל והרשאות
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="brand" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              משתמש חדש
            </Button>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="relative max-w-sm">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם, תפקיד או דוא״ל"
            className="ps-9"
          />
        </div>
      </div>

      {users.length === 0 ? (
        <p className="surface-panel rounded-2xl p-6 text-sm text-muted-foreground">
          {state.users.length === 0
            ? "עוד לא נרשמו משתמשים. לחץ על \"משתמש חדש\" כדי להתחיל."
            : "לא נמצאו משתמשים התואמים לחיפוש."}
        </p>
      ) : (
        <div className="surface-panel overflow-hidden rounded-2xl">
          <div className="hidden items-center gap-3 border-b border-border/60 bg-muted/40 px-4 py-2 text-[11px] font-medium text-muted-foreground lg:grid lg:grid-cols-[minmax(0,2fr)_10rem_8rem_9rem_6rem_5rem]">
            <span>שם משתמש / שם מלא</span>
            <span>דוא״ל</span>
            <span>תפקיד</span>
            <span>לקוח משויך</span>
            <span>פרויקטים</span>
            <span className="text-center">פעולות</span>
          </div>
          <ul className="divide-y divide-border/50">
            {users.map((u) => {
              const projectsCount = projectsOf(u.full_name).length;
              const clientName = clientNameOf(u.clientId);
              return (
                <li
                  key={u.username}
                  className="group flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm transition-colors hover:bg-muted/40 lg:grid lg:grid-cols-[minmax(0,2fr)_10rem_8rem_9rem_6rem_5rem] lg:gap-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 lg:w-auto lg:min-w-0">
                    <Avatar name={u.full_name} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{u.full_name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {u.username}
                      </span>
                    </span>
                  </div>
                  <span className="w-40 shrink-0 truncate text-muted-foreground lg:w-auto">
                    {u.email ? (
                      <span className="flex items-center gap-1.5">
                        <Mail className="size-3.5 shrink-0" />
                        <span className="truncate" dir="ltr">{u.email}</span>
                      </span>
                    ) : (
                      ""
                    )}
                  </span>
                  <span className="w-32 shrink-0 truncate lg:w-auto">
                    <Badge variant="outline" className="text-[11px]">
                      {u.role}
                    </Badge>
                  </span>
                  <span className="w-36 shrink-0 truncate text-muted-foreground lg:w-auto">
                    {u.role === "לקוח" && clientName ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="size-3.5 shrink-0" />
                        {clientName}
                      </span>
                    ) : (
                      ""
                    )}
                  </span>
                  <span className="w-20 shrink-0 lg:w-auto">
                    {projectsCount > 0 ? (
                      <Badge variant="secondary" className="text-[11px]">
                        {projectsCount} פרויקטים
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </span>
                  <span className="flex w-20 shrink-0 justify-end gap-1 lg:w-auto">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      title="ערוך"
                      onClick={() => setSelected(u.username)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive hover:bg-destructive/10"
                      title="מחק"
                      onClick={() => remove(u.username, u.full_name)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {selected && <UserDetailsDialog username={selected} onClose={() => setSelected(null)} />}

      <CreateUserDialog
        open={creating}
        onOpenChange={setCreating}
        onCreate={(nu) => {
          if (state.users.some((u) => u.username === nu.username)) {
            toast.error("שם המשתמש כבר קיים במערכת.");
            return false;
          }
          setState((prev) => ({ ...prev, users: [...prev.users, nu] }));
          toast.success(`המשתמש ${nu.full_name} נוצר בהצלחה.`);
          return true;
        }}
      />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (u: {
    username: string;
    password: string;
    full_name: string;
    email: string;
    role: Role;
    clientId?: string;
  }) => boolean;
}) {
  const empty = {
    username: "",
    password: "",
    full_name: "",
    email: "",
    role: ROLES[0]!,
    clientId: "",
  };
  const [nu, setNu] = useState(empty);
  const { state } = useAllNet();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-5 text-primary" />
            יצירת משתמש חדש
          </DialogTitle>
          <DialogDescription>הזן את פרטי הזהות וההרשאה של המשתמש.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>שם מלא</Label>
            <Input
              value={nu.full_name}
              onChange={(e) => setNu({ ...nu, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>שם משתמש</Label>
            <Input
              value={nu.username}
              onChange={(e) => setNu({ ...nu, username: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>דוא״ל</Label>
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
          <div className="space-y-2 sm:col-span-2">
            <Label>תפקיד</Label>
            <Select value={nu.role} onValueChange={(v) => setNu({ ...nu, role: v as Role })}>
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
          {nu.role === "לקוח" && (
            <div className="space-y-2 sm:col-span-2">
              <Label>שיוך ללקוח</Label>
              <Select value={nu.clientId} onValueChange={(v) => setNu({ ...nu, clientId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר לקוח מרשימת הלקוחות" />
                </SelectTrigger>
                <SelectContent>
                  {state.clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                משתמש בתפקיד "לקוח" יוכל לפתוח קריאות שירות בלבד עבור האתרים של הלקוח.
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="flex-row-reverse justify-start gap-2">
          <Button
            variant="brand"
            onClick={() => {
              if (!nu.username.trim() || !nu.password.trim() || !nu.full_name.trim()) {
                toast.error("יש למלא שם מלא, שם משתמש וסיסמה.");
                return;
              }
              if (nu.role === "לקוח" && !nu.clientId) {
                toast.error("יש לשייך את המשתמש ללקוח.");
                return;
              }
              const ok = onCreate({
                username: nu.username.trim(),
                password: nu.password.trim(),
                full_name: nu.full_name.trim(),
                email: nu.email.trim(),
                role: nu.role,
                ...(nu.clientId ? { clientId: nu.clientId } : {}),
              });
              if (ok) {
                setNu(empty);
                onOpenChange(false);
              }
            }}
          >
            צור משתמש
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserDetailsDialog({ username, onClose }: { username: string; onClose: () => void }) {
  const { state, setState } = useAllNet();
  const user = state.users.find((u) => u.username === username);
  const [form, setForm] = useState({
    full_name: user?.full_name ?? "",
    password: user?.password ?? "",
    email: user?.email ?? "",
    role: (user?.role ?? ROLES[0]!) as Role,
    clientId: user?.clientId ?? "",
  });
  if (!user) return null;

  const activeProjects = state.projects.filter((p) => !p.archived);

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
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right">
          <div className="flex items-center gap-4">
            <Avatar name={user.full_name} size="lg" />
            <div className="min-w-0">
              <DialogTitle className="truncate">{user.full_name}</DialogTitle>
              <DialogDescription className="truncate">
                {user.email || "ללא כתובת דוא״ל"} · {user.username}
              </DialogDescription>
              <Badge variant="outline" className="mt-2 text-xs">
                {user.role}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <Tabs defaultValue="profile" className="mt-2">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="profile">
              <UserRound className="size-4" />
              פרופיל
            </TabsTrigger>
            <TabsTrigger value="access">
              <ShieldCheck className="size-4" />
              הרשאות
            </TabsTrigger>
            <TabsTrigger value="projects">
              <Briefcase className="size-4" />
              פרויקטים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4 grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-2 sm:col-span-2">
              <Label className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                דוא״ל לאיפוס סיסמה
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </TabsContent>

          <TabsContent value="access" className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>תפקיד</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as Role })}
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
            {form.role === "לקוח" && (
              <div className="space-y-2">
                <Label>שיוך ללקוח</Label>
                <Select
                  value={form.clientId}
                  onValueChange={(v) => setForm({ ...form, clientId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <KeyRound className="size-4 text-muted-foreground" />
                שינוי סיסמה
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-4 space-y-2">
            <Label>שיוך לפרויקטים (ניתן לבחור מספר פרויקטים)</Label>
            {activeProjects.length ? (
              <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
                {activeProjects.map((p) => (
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
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 flex-row-reverse justify-start gap-2">
          <Button
            variant="brand"
            onClick={() => {
              setState((prev) => ({
                ...prev,
                users: prev.users.map((u) => {
                  if (u.username !== username) return u;
                  const { clientId: _drop, ...rest } = u;
                  return {
                    ...rest,
                    full_name: form.full_name.trim(),
                    password: form.password.trim(),
                    email: form.email.trim(),
                    role: form.role,
                    ...(form.role === "לקוח" && form.clientId ? { clientId: form.clientId } : {}),
                  };
                }),
              }));
              toast.success("פרטי המשתמש עודכנו בהצלחה.");
              onClose();
            }}
          >
            שמור שינויים
          </Button>
          <Button variant="secondary" onClick={onClose}>
            סגור
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
              onClose();
            }}
          >
            <Trash2 className="size-4" />
            מחק משתמש
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
