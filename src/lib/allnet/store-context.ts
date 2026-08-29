import { createContext } from "react";
import type { AllNetState, User } from "./types";

export interface Session {
  kind: "admin" | "employee";
  user: User | null;
}

export interface StoreValue {
  state: AllNetState;
  setState: (updater: (prev: AllNetState) => AllNetState) => void;
  session: Session | null;
  setSession: (s: Session | null) => void;
  hydrated: boolean;
  resetAll: () => void;
}

export const StoreContext = createContext<StoreValue | null>(null);
