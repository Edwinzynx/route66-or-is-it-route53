"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, ApiError } from "@/lib/api";

type User = { username: string };
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(
    () =>
      api<User>("/auth/session")
        .then((result) => {
          setUser(result);
          setError("");
        })
        .catch((err) => {
          setError(
            err instanceof ApiError && err.status === 401
              ? ""
              : (err as Error).message,
          );
          setUser(null);
        })
        .finally(() => setLoading(false)),
    [],
  );
  useEffect(() => {
    void refresh();
    const expire = () => setUser(null);
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, [refresh]);
  async function login(username: string) {
    setUser(
      await api<User>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username }),
      }),
    );
  }
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
  }
  return (
    <AuthContext.Provider
      value={{ user, loading, error, refresh, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider is required");
  return auth;
}
