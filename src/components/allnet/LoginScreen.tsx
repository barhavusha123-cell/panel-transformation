import { useState } from "react";
import { KeyRound, LogIn, MailCheck, ShieldCheck, User2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/allnet-logo-t.png.asset.json";
import { useAllNet } from "@/lib/allnet/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from(
    { length: 10 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export function LoginScreen() {
  const { state, setState, setSession } = useAllNet();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetMode, setResetMode] = useState<"employee" | "admin">("employee");
  const [resetId, setResetId] = useState("");
  const [uname, setUname] = useState("");
  const [pwd, setPwd] = useState("");
  const [adminPwd, setAdminPwd] = useState("");
  const [error, setError] = useState("");

  const employeeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const match = state.users.find(
      (u) =>
        u.username.trim().toLowerCase() === uname.trim().toLowerCase() &&
        String(u.password) === pwd.trim(),
    );
    if (match) {
      setError("");
      setSession({ kind: "employee", user: match });
    } else {
      setError("פרטי ההתחברות שגויים.");
    }
  };

  const adminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPwd === state.adminPassword) {
      setError("");
      setSession({ kind: "admin", user: null });
    } else {
      setError("סיסמת מנהל שגויה.");
    }
  };

  const submitReset = (e: React.FormEvent) => {
    e.preventDefault();
    const id = resetId.trim().toLowerCase();
    if (!id) return;
    const temp = randomPassword();
    if (resetMode === "admin") {
      const adminMail = (state.adminEmail ?? "").trim().toLowerCase();
      if (!adminMail || adminMail !== id) {
        toast.error("כתובת הדוא״ל אינה תואמת לכתובת מנהל המערכת הרשומה.");
        return;
      }
      setState((prev) => ({ ...prev, adminPassword: temp }));
    } else {
      const match = state.users.find(
        (u) =>
          u.username.toLowerCase() === id || (u.email ?? "").trim().toLowerCase() === id,
      );
      if (!match) {
        toast.error("לא נמצא משתמש עם שם המשתמש או הדוא״ל שהוזנו.");
        return;
      }
      if (!match.email) {
        toast.error("לא הוגדרה כתובת דוא״ל למשתמש זה. יש לפנות למנהל המערכת.");
        return;
      }
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.username === match.username ? { ...u, password: temp } : u,
        ),
      }));
    }
    setResetOpen(false);
    setResetId("");
    toast.success(`נשלח דוא״ל לאיפוס סיסמה. סיסמה זמנית: ${temp}`, { duration: 12000 });
  };

  const resetLink = (mode: "employee" | "admin") => (
    <button
      type="button"
      onClick={() => {
        setResetMode(mode);
        setResetOpen(true);
      }}
      className="mt-1 w-full cursor-pointer text-center text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
    >
      שכחת סיסמה? איפוס באמצעות דוא״ל
    </button>
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-1/4 size-[38rem] rounded-full bg-primary/10 blur-3xl"
        style={{ animation: "float-slow 9s ease-in-out infinite" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/4 size-[34rem] rounded-full bg-accent/10 blur-3xl"
        style={{ animation: "float-slow 11s ease-in-out infinite" }}
      />

      <div className="animate-rise relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-6 w-full max-w-[18rem]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -m-6 rounded-full bg-gradient-to-br from-primary/12 via-accent/8 to-transparent blur-2xl"
            />
            <img
              src={logo.url}
              alt="לוגו AllNet"
              width={1307}
              height={578}
              className="relative h-auto w-full object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.10)]"
            />
          </div>
          <h1 className="text-gradient text-4xl font-extrabold tracking-tight">ברוך הבא</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            התחבר למערכת ניהול תפעול ארגוני — AllNet
          </p>
        </div>

        <div className="surface-panel rounded-2xl p-6">
          <Tabs defaultValue="employee" dir="rtl" onValueChange={() => setError("")}>
            <TabsList className="grid w-full grid-cols-2 bg-surface-2/70 p-1">
              <TabsTrigger
                value="employee"
                className="data-[state=active]:brand-gradient rounded-lg data-[state=active]:text-primary-foreground"
              >
                <User2 className="size-4" />
                פורטל עובדים
              </TabsTrigger>
              <TabsTrigger
                value="admin"
                className="data-[state=active]:brand-gradient rounded-lg data-[state=active]:text-primary-foreground"
              >
                <ShieldCheck className="size-4" />
                גישת מנהלים
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employee" className="animate-fade mt-6">
              <form onSubmit={employeeLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="uname">שם משתמש</Label>
                  <Input id="uname" value={uname} onChange={(e) => setUname(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pwd">סיסמה</Label>
                  <Input
                    id="pwd"
                    type="password"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="brand" className="w-full">
                  <LogIn className="size-4" />
                  התחבר למערכת
                </Button>
                {resetLink("employee")}
              </form>
            </TabsContent>

            <TabsContent value="admin" className="animate-fade mt-6">
              <form onSubmit={adminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apwd">סיסמת מנהל מערכת</Label>
                  <Input
                    id="apwd"
                    type="password"
                    value={adminPwd}
                    onChange={(e) => setAdminPwd(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="brand" className="w-full">
                  <KeyRound className="size-4" />
                  אימות והתחברות מנהל
                </Button>
                {resetLink("admin")}
              </form>
            </TabsContent>
          </Tabs>

          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogContent dir="rtl" className="text-right sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MailCheck className="size-5 text-primary" />
                  איפוס סיסמה בדוא״ל
                </DialogTitle>
                <DialogDescription>
                  {resetMode === "admin"
                    ? "הזן את כתובת הדוא״ל הרשומה של מנהל המערכת ותישלח סיסמה חדשה."
                    : "הזן שם משתמש או כתובת דוא״ל ותישלח סיסמה זמנית לאיפוס."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={submitReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rid">
                    {resetMode === "admin" ? "דוא״ל מנהל המערכת" : "שם משתמש או דוא״ל"}
                  </Label>
                  <Input id="rid" value={resetId} onChange={(e) => setResetId(e.target.value)} />
                </div>
                <Button type="submit" variant="brand" className="w-full">
                  שלח סיסמה חדשה
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {error && (
            <p className="animate-fade mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
