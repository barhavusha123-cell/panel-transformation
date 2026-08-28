import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COST_TYPES, type FixedCost } from "@/lib/allnet/types";

export function FixedCostsEditor({
  value,
  onChange,
}: {
  value: FixedCost[];
  onChange: (next: FixedCost[]) => void;
}) {
  const total = value.reduce((a, c) => a + (Number(c.amount) || 0), 0);

  const update = (id: string, patch: Partial<FixedCost>) =>
    onChange(value.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-base font-semibold">עלויות קבועות לפרויקט</Label>
        <Button
          type="button"
          variant="soft"
          size="sm"
          onClick={() =>
            onChange([
              ...value,
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                type: COST_TYPES[0]!,
                description: "",
                amount: 0,
              },
            ])
          }
        >
          <Plus className="size-4" />
          הוסף עלות
        </Button>
      </div>

      {value.length ? (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1.4fr_0.9fr_auto] gap-2 px-1 text-[11px] text-muted-foreground">
            <span>סוג</span>
            <span>תיאור</span>
            <span>עלות (₪)</span>
            <span />
          </div>
          {value.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_1.4fr_0.9fr_auto] items-center gap-2">
              <Select value={c.type} onValueChange={(v) => update(c.id, { type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COST_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={c.description}
                placeholder="טקסט חופשי"
                onChange={(e) => update(c.id, { description: e.target.value })}
              />
              <Input
                type="number"
                min={0}
                step={1}
                value={c.amount}
                onChange={(e) => update(c.id, { amount: Number(e.target.value) })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(value.filter((x) => x.id !== c.id))}
                aria-label="מחק עלות"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
            <span className="font-medium">סה״כ עלויות קבועות</span>
            <span className="font-bold text-primary">
              {Math.round(total).toLocaleString("he-IL")} ₪
            </span>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          לא הוגדרו עלויות קבועות. לחץ על "הוסף עלות" כדי להתחיל.
        </p>
      )}
    </div>
  );
}
