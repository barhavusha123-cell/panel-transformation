import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { defaultState, type AllNetState } from "./types";
import { StoreContext, type Session } from "./store-context";

const STORAGE_KEY = "allnet_ops_state_v1";
const SESSION_KEY = "allnet_ops_session_v1";

export type { Session };

export function AllNetProvider({ children }: { children: ReactNode }) {
  const [state, setRaw] = useState<AllNetState>(defaultState);
  const [session, setSessionRaw] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AllNetState>;
        const merged: AllNetState = { ...defaultState(), ...parsed };
        merged.projects = (merged.projects ?? []).map((p) => ({
          name: p.name,
          client: p.client ?? "",
          manager: p.manager ?? "לא הוגדר",
          budget: Number(p.budget) || 100,
          team: Array.isArray(p.team) ? p.team : [],
          archived: Boolean(p.archived),
          deliveryDate: p.deliveryDate ?? "",
          region: p.region ?? "מרכז",
          budgetDays: Number(p.budgetDays) || 0,
          extraHours: Number(p.extraHours) || 0,
          extraHoursReason: p.extraHoursReason ?? "",
          saleAmount: Number(p.saleAmount) || 0,
          fixedCosts: Array.isArray(p.fixedCosts) ? p.fixedCosts : [],
          ...(p.category ? { category: p.category } : {}),
          ...(p.closure ? { closure: p.closure } : {}),
          ...(p.categorizedAt ? { categorizedAt: p.categorizedAt } : {}),



        }));

        merged.serviceCalls = Array.isArray(merged.serviceCalls)
          ? merged.serviceCalls.map((c) => ({
              ...c,
              attachments: Array.isArray(c.attachments) ? c.attachments : [],
              updates: Array.isArray(c.updates) ? c.updates : [],
            }))
          : [];

        setRaw(merged);
      }
      const sess = sessionStorage.getItem(SESSION_KEY);
      if (sess) setSessionRaw(JSON.parse(sess));
    } catch {
      /* ignore corrupted storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }, [state, hydrated]);

  const setState = useCallback(
    (updater: (prev: AllNetState) => AllNetState) => setRaw(updater),
    [],
  );

  const setSession = useCallback((s: Session | null) => {
    setSessionRaw(s);
    try {
      if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const resetAll = useCallback(() => {
    setRaw(defaultState());
    setSession(null);
  }, [setSession]);

  const value = useMemo(
    () => ({ state, setState, session, setSession, hydrated, resetAll }),
    [state, setState, session, setSession, hydrated, resetAll],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAllNet() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useAllNet must be used inside AllNetProvider");
  return ctx;
}
