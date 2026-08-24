import { useState } from "react";
import { AlertTriangle, LogOut, Settings } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/allnet-logo-t.png.asset.json";
import { useAllNet } from "@/lib/allnet/store";
import { MASTER_PASSWORD } from "@/lib/allnet/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TopBar() {
  const { state, setState, session, setSession, resetAll } = useAllNet();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [master, setMaster] = useState("");
  const [curr, setCurr] = useState("");
  const [next, setNext] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const isAdmin = session?.kind === "admin";

  const changePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirmPwd) {
      toast.error("הסיסמאות החדשות אינן תואמות.");
      return;
    }
    if (next.trim().length < 3) {
      toast.error("הסיסמה קצרה מדי.");
      return;
    }

    if (isAdmin) {
      if (curr !== state.adminPassword) {
        toast.error("סיסמה נוכחית שגויה.");
        return;
      }
      setState((prev) => ({ ...prev, adminPassword: next.trim() }));
      toast.success("סיסמת המנהל עודכנה בהצלחה.");
    } else if (session?.user) {
      const u = state.users.find((x) => x.username === session.user!.username);
      if (!u || String(u.password) !== curr) {
        toast.error("סיסמה נוכחית שגויה.");
        return;
      }
      setState((prev) => ({
        ...prev,
        users: prev.users.map((x) =>
          x.username === u.username ? { ...x, password: next.trim() } : x,
        ),
      }));
      setSession({ ...session, user: { ...u, password: next.trim() } });
      toast.success("הסיסמה האישית עודכנה בהצלחה.");
    }
    setCurr("");
    setNext("");
    setConfirmPwd("");
  };

  const doReset = () => {
    if (master !== MASTER_PASSWORD) {
      toast.error("סיסמת מנהל ראשי שגויה. האיפוס בוטל.");
      return;
    }
    resetAll();
    setResetOpen(false);
    setSettingsOpen(false);
    setConfirmStep(false);
    setMaster("");
    toast.success("המערכת אופסה בהצלחה.");
  };

  return (
    <>
      <header className="surface-panel animate-fade sticky top-0 z-40 mb-6 rounded-b-2xl border-x-0 border-t-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <button
            type="button"
            title="חזרה למרכז הבקרה הניהולי"
            onClick={() => window.dispatchEvent(new CustomEvent("allnet:home"))}
            className="flex items-center gap-4 rounded-xl px-2 py-1 text-right transition-colors hover:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src={logo.url}
              alt="לוגו AllNet"
              width={1307}
              height={578}
              className="h-10 w-auto object-contain sm:h-12"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                פלטפורמת ניהול תפעול ארגוני — <span className="text-gradient">AllNet</span>
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                פורטל בקרת פרויקטים ומעקב שעות עבודה
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-border bg-surface-2/70 px-3 py-1.5 text-xs text-muted-foreground sm:inline">
              {isAdmin ? "מנהל מערכת" : session?.user?.full_name}
            </span>
            <Button
              size="icon"
              variant="secondary"
              title="הגדרות מערכת"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              title="התנתק"
              className="hover:bg-destructive/15 hover:text-destructive"
              onClick={() => setSession(null)}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent dir="rtl" className="surface-panel text-right sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle>הגדרות חשבון ואבטחה</DialogTitle>
            <DialogDescription>ניהול סיסמאות ופרטי אבטחה</DialogDescription>
          </DialogHeader>

          <form onSubmit={changePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>סיסמה נוכחית</Label>
              <Input type="password" value={curr} onChange={(e) => setCurr(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>סיסמה חדשה</Label>
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>אימות סיסמה חדשה</Label>
              <Input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
              />
            </div>
            <Button type="submit" variant="brand" className="w-full">
              עדכן סיסמה
            </Button>
          </form>

          {isAdmin && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">בקרת חירום</h3>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    setResetOpen(true);
                    setConfirmStep(false);
                  }}
                >
                  <AlertTriangle className="size-4" />
                  איפוס קשיח למערכת
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent dir="rtl" className="surface-panel text-right sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle>אישור איפוס מערכת כללי</DialogTitle>
            <DialogDescription>
              פעולה זו תמחק לצמיתות את כל דיווחי השעות, הפרויקטים, המשתמשים והקבצים שהועלו.
            </DialogDescription>
          </DialogHeader>

          {!confirmStep ? (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setResetOpen(false)}>
                ביטול
              </Button>
              <Button variant="destructive" onClick={() => setConfirmStep(true)}>
                המשך
              </Button>
            </div>
          ) : (
            <div className="animate-fade space-y-3">
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                נדרשת סיסמת מנהל-על (Master Password) לאימות
              </p>
              <div className="space-y-2">
                <Label>סיסמת מנהל ראשי</Label>
                <Input
                  type="password"
                  value={master}
                  onChange={(e) => setMaster(e.target.value)}
                />
              </div>
              <Button variant="destructive" className="w-full" onClick={doReset}>
                אשר איפוס קשיח
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
