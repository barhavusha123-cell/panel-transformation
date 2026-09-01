import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ClientPickerProps {
  value: string;
  onChange: (v: string) => void;
  /** שמות לקוחות רשומים (מניהול לקוחות) — יוצגו ראשונים */
  clients: string[];
  /** שמות נוספים מהיסטוריית פרויקטים */
  history?: string[];
  placeholder?: string;
}

/**
 * שדה שם לקוח עם השלמה אוטומטית: בהקלדת האות הראשונה מוצגים
 * הלקוחות הרשומים במערכת לבחירה, ולאחר מכן שמות מההיסטוריה.
 */
export function ClientPicker({
  value,
  onChange,
  clients,
  history = [],
  placeholder = "שם הלקוח",
}: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    const match = (n: string) => !q || n.toLowerCase().includes(q);
    const fromClients = clients.filter(match);
    const fromHistory = history.filter((n) => match(n) && !clients.includes(n));
    return [
      ...fromClients.map((name) => ({ name, registered: true })),
      ...fromHistory.map((name) => ({ name, registered: false })),
    ].slice(0, 8);
  }, [value, clients, history]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => (h + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Enter" && suggestions[highlight]) {
            e.preventDefault();
            pick(suggestions[highlight].name);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="pe-9"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen((o) => !o)}
        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label="הצג רשימת לקוחות"
      >
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border bg-popover shadow-xl animate-fade">
          <p className="border-b bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
            לקוחות רשומים · הקלד לסינון
          </p>
          <ul className="max-h-56 overflow-y-auto p-1">
            {suggestions.map((s, i) => (
              <li key={s.name}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s.name);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    i === highlight ? "bg-primary/10 text-foreground" : "hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full",
                      s.registered
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Building2 className="size-3.5" />
                  </span>
                  <span className="truncate font-medium">{s.name}</span>
                  {s.registered && (
                    <span className="ms-auto shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      לקוח רשום
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
