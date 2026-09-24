import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";

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
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ user: AuthUser }>("/api/auth/me")
      .then(({ data }) => {
        if (!cancelled) setUser(data.user);
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
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
