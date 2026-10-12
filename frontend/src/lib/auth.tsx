import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, PLAN_BLOCK_EVENT, type PlanBlock } from "./api";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "STUDENT" | "FACULTY" | "COLLEGE_ADMIN";
  facultyCode: string | null; // set once this user becomes FACULTY
  facultyId: string | null; // set once a STUDENT joins a faculty
  collegeId: string | null; // set on FACULTY (once provisioned) and COLLEGE_ADMIN
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
  /** Set when the user's college plan has ended (see PlanBlock). */
  planBlock: PlanBlock | null;
  setPlanBlock: (block: PlanBlock | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [planBlock, setPlanBlock] = useState<PlanBlock | null>(null);

  useEffect(() => {
    const onBlock = (e: Event) => setPlanBlock((e as CustomEvent<PlanBlock>).detail);
    window.addEventListener(PLAN_BLOCK_EVENT, onBlock);
    return () => window.removeEventListener(PLAN_BLOCK_EVENT, onBlock);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ user: AuthUser; planBlock?: PlanBlock | null }>("/api/auth/me")
      .then(({ data }) => {
        if (!cancelled) {
          setUser(data.user);
          setPlanBlock(data.planBlock ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout").catch(() => {});
    setUser(null);
    setPlanBlock(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout, planBlock, setPlanBlock }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
