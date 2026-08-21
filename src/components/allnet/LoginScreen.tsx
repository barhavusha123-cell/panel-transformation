import { useState } from "react";
import { KeyRound, LogIn, ShieldCheck, User2 } from "lucide-react";
import logo from "@/assets/allnet-logo.png.asset.json";
import { useAllNet } from "@/lib/allnet/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LoginScreen() {
  const { state, setSession } = useAllNet();
  const [uname, setUname] = useState("user");
  const [pwd, setPwd] = useState("user123");
  const [adminPwd, setAdminPwd] = useState("");
  const [error, setError] = useState("");

  const employeeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const match = state.users.find(
      (u) => u.username === uname.trim() && String(u.password) === pwd.trim(),
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
          <div className="relative mb-8">
            <div className="absolute inset-0 -m-8 rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-2xl" />
            <div className="absolute inset-0 -m-3 rounded-full border border-primary/10 bg-white/40 shadow-2xl backdrop-blur-sm" />
            <img
              src={logo.url}
              alt="לוגו AllNet"
              width={816}
              height={816}
              className="relative size-96 object-contain drop-shadow-[0_14px_40px_rgba(0,0,0,0.12)]"
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
              </form>
            </TabsContent>
          </Tabs>

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
