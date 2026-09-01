import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ClientPickerProps {
  value: string;
  onChange: (v: string) => void;
  /** שמות לקוחות רשומים (מניהול לקוחות) — הבחירה האפשרית היחידה */
  clients: string[];
  /** לא בשימוש — נשמר לתאימות */
  history?: string[];
  placeholder?: string;
}

/**
 * בורר לקוח — ניתן לבחור אך ורק לקוח שהוקם ב"ניהול לקוחות".
 * אין אפשרות להקליד שם חופשי; שדה החיפוש משמש לסינון בלבד.
 */
export function ClientPicker({
  value,
  onChange,
  clients,
  placeholder = "בחר לקוח מהרשימה",
}: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .map((c) => c.trim())
      .filter(Boolean)
      .filter((c) => !q || c.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b, "he"));
  }, [clients, query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-start text-sm transition-colors hover:bg-muted/40",
          !value && "text-muted-foreground",
        )}
      >
        <Building2 className="size-4 shrink-0 text-primary" />
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown
          className={cn("ms-auto size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border bg-popover shadow-xl animate-fade">
          <div className="border-b p-2">
            <Input
              ref={inputRef}
              value={query}
              placeholder="חיפוש לקוח רשום…"
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) => (h + 1) % Math.max(options.length, 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => (h - 1 + options.length) % Math.max(options.length, 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (options[highlight]) pick(options[highlight]);
                } else if (e.key === "Escape") {
                  setOpen(false);
                  setQuery("");
                }
              }}
              className="h-9"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto p-1">
            {options.length === 0 && (
              <li className="px-3 py-3 text-center text-xs text-muted-foreground">
                לא נמצאו לקוחות רשומים — יש להקים לקוח בלשונית "ניהול לקוחות".
              </li>
            )}
            {options.map((name, i) => (
              <li key={name}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(name);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    i === highlight ? "bg-primary/10 text-foreground" : "hover:bg-muted",
                  )}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Building2 className="size-3.5" />
                  </span>
                  <span className="truncate font-medium">{name}</span>
                  {value === name && <Check className="ms-auto size-4 shrink-0 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
