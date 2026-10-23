import type { LoginInput, PublicUser, RegisterInput } from "@dealer/shared";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, readToken, writeToken } from "../lib/api.js";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  login(input: LoginInput): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    if (!readToken()) {
      setStatus("anonymous");
      return;
    }

    api
      .me()
      .then((currentUser) => {
        if (cancelled) {
          return;
        }

        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        writeToken(null);
        setUser(null);
        setStatus("anonymous");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(() => {
    writeToken(null);
    setUser(null);
    setStatus("anonymous");
    queryClient.clear();
  }, [queryClient]);

  // The API client raises this when an authenticated request gets a 401,
  // so an expired token logs the user out instead of leaving a broken shell.
  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener("autoline:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("autoline:unauthorized", handleUnauthorized);
  }, [logout]);

  const login = useCallback(async (input: LoginInput) => {
    const result = await api.login(input);
    writeToken(result.token);
    setUser(result.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await api.register(input);
    writeToken(result.token);
    setUser(result.user);
    setStatus("authenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
