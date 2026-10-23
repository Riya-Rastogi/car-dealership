import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider.js";
import { FullPageLoader } from "../components/FullPageLoader.js";

/** Sends anonymous visitors to /login and remembers where they were going. */
export function Protected({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <FullPageLoader label="Checking your session" />;
  }

  if (status === "anonymous") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children;
}

/** Keeps signed-in users off the login and register screens. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return <FullPageLoader label="Checking your session" />;
  }

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  return children;
}
