import { useMemo, useState } from "react";
import { CalendarClock, FolderOpen, Send, Timer } from "lucide-react";
import { toast } from "sonner";
import { useAllNet } from "@/lib/allnet/store";
import { formatHoursMinutes, getAllTimeOptions, minutesBetween, todayISO } from "@/lib/allnet/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const TIME_OPTIONS = getAllTimeOptions();

export function EmployeePortal() {
  const { state, setState, session } = useAllNet();
  const user = session?.user;

  const [project, setProject] = useState("");
  const [sub, setSub] = useState("ללא");
  const [reportDate, setReportDate] = useState(todayISO());
  const [from, setFrom] = useState("07:00");
  const [to, setTo] = useState("17:00");
  const [extras, setExtras] = useState("");
  const [notes, setNotes] = useState("");
  const [docFilter, setDocFilter] = useState("all");

  const subs = useMemo(
    () => state.projects.find((p) => p.name === project)?.subs ?? [],
    [state.projects, project],
  );

  const myHours = useMemo(
    () => state.hours.filter((h) => h.username === user?.username).slice().reverse(),
    [state.hours, user],
  );

  const livePreview = from && to ? formatHoursMinutes(minutesBetween(from, to)) : "—";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!project) {
      toast.error("אנא בחר פרויקט תקין.");
      return;
    }
    if (!from || !to) {
      toast.error("אנא בחר שעות התחלה וסיום תקינות.");
      return;
    }
    const minutes = minutesBetween(from, to);
    const entry = {
      id: (state.hours.at(-1)?.id ?? 0) + 1,
      username: user.username,
      project,
      sub: sub === "ללא" ? "" : sub,
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
    };
    setState((prev) => ({ ...prev, hours: [...prev.hours, entry] }));
    toast.success("הדיווח נקלט בהצלחה.");
    setSub("ללא");
    setNotes("");
    setExtras("");
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
        </TabsList>

        <TabsContent value="report" className="animate-fade mt-6 space-y-6">
          <form onSubmit={submit} className="surface-panel rounded-2xl p-6">
            <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold">
              <CalendarClock className="size-5 text-primary" />
              טופס דיווח שעות עבודה
            </h3>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>שם פרויקט ראשי</Label>
                <Select value={project} onValueChange={setProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר פרויקט" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.projects.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>תת פרויקט (אופציונלי)</Label>
                <Select value={sub} onValueChange={setSub}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ללא">ללא</SelectItem>
                    {subs.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>תאריך הדיווח</Label>
                <Input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>חריגים / תוספות שינויים (אופציונלי)</Label>
                <Input value={extras} onChange={(e) => setExtras(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>משעה</Label>
                <Select value={from} onValueChange={setFrom}>
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
                <Select value={to} onValueChange={setTo}>
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

              <div className="space-y-2 md:col-span-2">
                <Label>תיאור העבודה והערות</Label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

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
                      <TableHead className="text-right">תת פרויקט</TableHead>
                      <TableHead className="text-right">משעה</TableHead>
                      <TableHead className="text-right">עד שעה</TableHead>
                      <TableHead className="text-right">זמן עבודה</TableHead>
                      <TableHead className="text-right">הערות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myHours.map((h) => (
                      <TableRow key={h.id} className="transition-colors hover:bg-surface-2/60">
                        <TableCell>{h.date}</TableCell>
                        <TableCell className="font-medium">{h.project}</TableCell>
                        <TableCell>{h.sub || "—"}</TableCell>
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
                  {state.projects.map((p) => (
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
