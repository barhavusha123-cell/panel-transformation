import { useEffect, useRef, useState } from "react";
import {
  CloudDownload,
  DatabaseBackup,
  FileSpreadsheet,
  History,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAllNet } from "@/lib/allnet/store";
import {
  AUTO_BACKUP_INTERVAL_DAYS,
  MAX_SNAPSHOTS,
  deleteSnapshot,
  downloadBackupFile,
  downloadHoursCsv,
  isAutoBackupDue,
  lastAutoBackupAt,
  listSnapshots,
  markAutoBackup,
  readBackupFile,
  saveSnapshot,
  type Snapshot,
} from "@/lib/allnet/backup";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
const kb = (n: number) => `${Math.max(1, Math.round(n / 1024))} KB`;

/** מרכז גיבוי ושחזור — גיבוי אוטומטי שבועי + ייצוא/יבוא ידני */
export function BackupCenter() {
  const { state, setState, hydrated } = useAllNet();
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [last, setLast] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const ranRef = useRef(false);

  const refresh = () => {
    setSnaps(listSnapshots());
    setLast(lastAutoBackupAt());
  };

  useEffect(() => {
    refresh();
  }, []);

  // גיבוי אוטומטי: פעם בשבוע נשמרת תמונת מצב מקומית ויורד קובץ JSON
  useEffect(() => {
    if (!hydrated || ranRef.current) return;
    ranRef.current = true;
    if (!isAutoBackupDue()) return;
    if (state.projects.length === 0 && state.hours.length === 0) return;
    saveSnapshot(state, "auto");
    downloadBackupFile(state);
    markAutoBackup();
    refresh();
    toast.success("בוצע גיבוי אוטומטי שבועי — קובץ הגיבוי ירד לתיקיית ההורדות.");
  }, [hydrated, state]);

  const manualBackup = () => {
    saveSnapshot(state, "manual");
    downloadBackupFile(state);
    refresh();
    toast.success("נוצר גיבוי ידני והקובץ ירד למחשב.");
  };

  const restore = (snap: Snapshot) => {
    if (!window.confirm(`לשחזר את המערכת לגיבוי מתאריך ${fmt(snap.createdAt)}?`)) return;
    setState(() => snap.state);
    toast.success("המערכת שוחזרה מהגיבוי הנבחר.");
  };

  const removeSnap = (id: string) => {
    deleteSnapshot(id);
    refresh();
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      const restored = await readBackupFile(file);
      if (!window.confirm("טעינת קובץ גיבוי תחליף את כל הנתונים הקיימים. להמשיך?")) return;
      saveSnapshot(state, "manual");
      setState(() => restored);
      refresh();
      toast.success("הנתונים נטענו מקובץ הגיבוי בהצלחה.");
    } catch {
      toast.error("קובץ הגיבוי אינו תקין.");
    }
  };

  return (
    <div className="space-y-4 text-right">
      <div className="rounded-xl border border-border bg-surface-2/50 p-3 text-xs leading-relaxed text-muted-foreground">
        גיבוי אוטומטי מתבצע אחת ל־{AUTO_BACKUP_INTERVAL_DAYS} ימים: נשמרת תמונת מצב מקומית
        בדפדפן (עד {MAX_SNAPSHOTS} גרסאות אחרונות) ובמקביל יורד קובץ{" "}
        <span className="font-semibold text-foreground">JSON</span> לתיקיית ההורדות של המחשב,
        בשם <span className="font-mono">allnet-backup-תאריך-שעה.json</span>. הקובץ מכיל את כל
        המשתמשים, הפרויקטים, דיווחי השעות, המסמכים וההגדרות.
        <br />
        גיבוי אחרון: {last ? fmt(new Date(last).toISOString()) : "טרם בוצע"}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button variant="brand" onClick={manualBackup}>
          <CloudDownload className="size-4" /> גבה עכשיו (JSON)
        </Button>
        <Button variant="secondary" onClick={() => downloadHoursCsv(state)}>
          <FileSpreadsheet className="size-4" /> ייצוא שעות (CSV)
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" /> שחזור מקובץ
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <History className="size-4" /> גרסאות שמורות בדפדפן
        </h4>
        {snaps.length === 0 ? (
          <p className="text-xs text-muted-foreground">אין עדיין גיבויים שמורים.</p>
        ) : (
          <ul className="max-h-56 space-y-2 overflow-y-auto pl-1">
            {snaps.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-xs"
              >
                <span className="flex items-center gap-2">
                  <DatabaseBackup className="size-3.5 text-primary" />
                  {fmt(s.createdAt)} · {s.kind === "auto" ? "אוטומטי" : "ידני"} · {kb(s.size)}
                </span>
                <span className="flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => restore(s)}>
                    שחזר
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="hover:text-destructive"
                    onClick={() => removeSnap(s.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
