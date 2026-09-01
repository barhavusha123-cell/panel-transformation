import { useEffect, useMemo, useState } from "react";
import { Calculator, Save, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useAllNet } from "@/lib/allnet/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { FixedCostsEditor } from "./FixedCostsEditor";
import {
  EMPLOYEE_DAY_RATE,
  EMPLOYEE_HOUR_RATE,
  EMPLOYEE_FULL_DAY_MINUTES,
  MAX_SUB_WORKERS,
  REGIONS,
  subDayRate,
  type FixedCost,
  type Project,
  type Region,
} from "@/lib/allnet/types";

const ils = (n: number) => `${Math.round(n).toLocaleString("he-IL")} ₪`;
const EMPLOYEE_DAY_HOURS = EMPLOYEE_FULL_DAY_MINUTES / 60;

export function ProjectSimulation({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project?: Project | null;
}) {
  const { setState } = useAllNet();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [manager, setManager] = useState("");
  const [region, setRegion] = useState<Region>("מרכז");
  const [saleAmount, setSaleAmount] = useState(0);
  const [additions, setAdditions] = useState(0);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [crewSize, setCrewSize] = useState(2);
  /** אחוז מתקציב העבודה שמוקצה לעובדי חברה */
  const [employeeShare, setEmployeeShare] = useState(50);
  const [targetProfit, setTargetProfit] = useState(0);

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? "");
    setClient(project?.client ?? "");
    setManager(project?.manager ?? "");
    setRegion(project?.region ?? "מרכז");
    setSaleAmount(Number(project?.saleAmount) || 0);
    setAdditions(Number(project?.additions) || 0);
    setFixedCosts(project?.fixedCosts ? project.fixedCosts.map((c) => ({ ...c })) : []);
    // טוען סימולציה שמורה אם קיימת
    const sim = project?.simulation;
    if (sim) {
      setRegion(sim.region);
      setSaleAmount(sim.saleAmount);
      setAdditions(sim.additions);
      setFixedCosts(sim.fixedCosts.map((c) => ({ ...c })));
      setCrewSize(sim.crewSize);
      setEmployeeShare(sim.employeeShare);
      setTargetProfit(sim.targetProfit);
    } else {
      setCrewSize(2);
      setEmployeeShare(50);
      setTargetProfit(0);
    }
  }, [open, project]);

  const calc = useMemo(() => {
    const revenue = (Number(saleAmount) || 0) + (Number(additions) || 0);
    const fixed = fixedCosts.reduce((a, c) => a + (Number(c.amount) || 0), 0);
    const profitTarget = Math.max(0, (revenue * (Number(targetProfit) || 0)) / 100);
    const labourBudget = Math.max(0, revenue - fixed - profitTarget);

    const crewRate = subDayRate(region, crewSize);
    const share = Math.min(100, Math.max(0, Number(employeeShare) || 0));
    const employeeBudget = (labourBudget * share) / 100;
    const contractorBudget = labourBudget - employeeBudget;

    const employeeDays = employeeBudget / EMPLOYEE_DAY_RATE;
    const employeeHours = employeeDays * EMPLOYEE_DAY_HOURS;
    const partialHours = employeeBudget / EMPLOYEE_HOUR_RATE;
    const contractorDays = crewRate > 0 ? contractorBudget / crewRate : 0;

    const usedCost = employeeDays * EMPLOYEE_DAY_RATE + contractorDays * crewRate + fixed;
    const usedPercent = revenue > 0 ? (usedCost / revenue) * 100 : 0;

    return {
      revenue,
      fixed,
      profitTarget,
      labourBudget,
      crewRate,
      employeeBudget,
      contractorBudget,
      employeeDays,
      employeeHours,
      partialHours,
      contractorDays,
      usedCost,
      usedPercent,
      maxEmployeeDays: labourBudget / EMPLOYEE_DAY_RATE,
      maxEmployeeHours: (labourBudget / EMPLOYEE_DAY_RATE) * EMPLOYEE_DAY_HOURS,
      maxContractorDays: crewRate > 0 ? labourBudget / crewRate : 0,
    };
  }, [saleAmount, additions, fixedCosts, targetProfit, region, crewSize, employeeShare]);

  const mixRows = [0, 25, 50, 75, 100].map((s) => {
    const empBudget = (calc.labourBudget * s) / 100;
    const conBudget = calc.labourBudget - empBudget;
    return {
      share: s,
      empDays: empBudget / EMPLOYEE_DAY_RATE,
      empHours: (empBudget / EMPLOYEE_DAY_RATE) * EMPLOYEE_DAY_HOURS,
      conDays: calc.crewRate > 0 ? conBudget / calc.crewRate : 0,
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="size-5 text-emerald-600" />
            סימולציית רווחיות פרויקט
          </DialogTitle>
          <DialogDescription>
            הזן את פרמטרי הפרויקט וקבל מיידית כמה שעות עובדי חברה וכמה ימי צוות קבלן נכנסים
            עד ניצול של 100% מתקציב הפרויקט.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* פרמטרים */}
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>שם פרויקט</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="פרויקט לדוגמה" />
              </div>
              <div className="space-y-1.5">
                <Label>שם לקוח</Label>
                <Input value={client} onChange={(e) => setClient(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>מנהל פרויקט</Label>
                <Input value={manager} onChange={(e) => setManager(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>אזור</Label>
                <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>שווי פרויקט (מכירה) ₪</Label>
                <Input
                  type="number"
                  min={0}
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>תוספות מאושרות ₪</Label>
                <Input
                  type="number"
                  min={0}
                  value={additions}
                  onChange={(e) => setAdditions(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>גודל צוות קבלן (עובדים)</Label>
                <Select value={String(crewSize)} onValueChange={(v) => setCrewSize(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: MAX_SUB_WORKERS }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} עובדים — {ils(subDayRate(region, n))} ליום
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>רווח גולמי (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={90}
                  value={targetProfit}
                  onChange={(e) => setTargetProfit(Number(e.target.value))}
                />
              </div>
            </div>

            <FixedCostsEditor value={fixedCosts} onChange={setFixedCosts} />

            <div className="space-y-2 rounded-xl border border-border bg-surface/60 p-4">
              <div className="flex items-center justify-between">
                <Label>חלוקת תקציב העבודה — עובדי חברה</Label>
                <Badge variant="secondary">
                  {employeeShare}% חברה / {100 - employeeShare}% קבלן
                </Badge>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={employeeShare}
                onChange={(e) => setEmployeeShare(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>
          </div>

          {/* תוצאות */}
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <TrendingUp className="size-4" />
                <span className="font-semibold">תקציב זמין לעבודה</span>
              </div>
              <p className="mt-1 text-3xl font-bold">{ils(calc.labourBudget)}</p>
              <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                <span>הכנסה כוללת: {ils(calc.revenue)}</span>
                <span>עלויות קבועות: {ils(calc.fixed)}</span>
                <span>רווח גולמי שנשמר: {ils(calc.profitTarget)}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">מקסימום עובדי חברה (100% מהתקציב)</p>
                <p className="text-2xl font-bold">{calc.maxEmployeeHours.toFixed(0)} שעות</p>
                <p className="text-sm text-muted-foreground">
                  {calc.maxEmployeeDays.toFixed(1)} ימי עבודה · {ils(EMPLOYEE_DAY_RATE)} ליום
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">מקסימום ימי צוות קבלן (100% מהתקציב)</p>
                <p className="text-2xl font-bold">{calc.maxContractorDays.toFixed(1)} ימים</p>
                <p className="text-sm text-muted-foreground">
                  {crewSize} עובדים · {ils(calc.crewRate)} ליום ({region})
                </p>
              </div>
            </div>

            <Separator />

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 font-semibold">התמהיל שנבחר</p>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span>עובדי חברה</span>
                  <span className="font-semibold">
                    {calc.employeeHours.toFixed(0)} שעות ({calc.employeeDays.toFixed(1)} ימים) ·{" "}
                    {ils(calc.employeeBudget)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>שעות בודדות (פחות מ-5 ש')</span>
                  <span className="font-semibold">
                    {calc.partialHours.toFixed(0)} שעות · {ils(EMPLOYEE_HOUR_RATE)} לשעה
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>צוותי קבלן</span>
                  <span className="font-semibold">
                    {calc.contractorDays.toFixed(1)} ימים · {ils(calc.contractorBudget)}
                  </span>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>ניצול מסך הפרויקט</span>
                  <span>{calc.usedPercent.toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(100, calc.usedPercent)} />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2 text-right">תמהיל</th>
                    <th className="p-2 text-right">שעות עובדי חברה</th>
                    <th className="p-2 text-right">ימי עובדי חברה</th>
                    <th className="p-2 text-right">ימי צוות קבלן</th>
                  </tr>
                </thead>
                <tbody>
                  {mixRows.map((r) => (
                    <tr key={r.share} className="border-t border-border">
                      <td className="p-2">{r.share}% חברה</td>
                      <td className="p-2">{r.empHours.toFixed(0)}</td>
                      <td className="p-2">{r.empDays.toFixed(1)}</td>
                      <td className="p-2">{r.conDays.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {project?.simulation?.savedAt ? (
            <span className="text-xs text-muted-foreground">
              נשמר לאחרונה: {new Date(project.simulation.savedAt).toLocaleString("he-IL")}
            </span>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="soft" onClick={() => onOpenChange(false)}>
              סגור
            </Button>
            <Button
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleSave}
            >
              <Save className="size-4" />
              שמור סימולציה
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
