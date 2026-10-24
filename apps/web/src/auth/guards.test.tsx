import type { PublicUser } from "@dealer/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminOnly, Protected, PublicOnly } from "./guards.js";

const auth = vi.hoisted(() => ({
  status: "anonymous" as "loading" | "authenticated" | "anonymous",
  user: null as PublicUser | null,
}));

vi.mock("./AuthProvider.js", () => ({
  useAuth: () => auth,
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>Login screen</p>} />
        <Route path="/" element={<p>Dashboard screen</p>} />
        <Route
          path="/private"
          element={
            <Protected>
              <p>Private screen</p>
            </Protected>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminOnly>
              <p>Admin screen</p>
            </AdminOnly>
          }
        />
        <Route
          path="/public"
          element={
            <PublicOnly>
              <p>Public screen</p>
            </PublicOnly>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.status = "anonymous";
  auth.user = null;
});

describe("route guards", () => {
  it("sends an anonymous visitor from a protected route to login", () => {
    renderAt("/private");

    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });

  it("shows a loader while the session is being restored", () => {
    auth.status = "loading";
    renderAt("/private");

    expect(screen.getByRole("status")).toHaveTextContent("Checking your session");
  });

  it("lets an authenticated user through", () => {
    auth.status = "authenticated";
    renderAt("/private");

    expect(screen.getByText("Private screen")).toBeInTheDocument();
  });

  it("redirects a customer away from the admin console", () => {
    auth.status = "authenticated";
    auth.user = {
      id: "1",
      email: "driver@example.com",
      name: "Test Driver",
      role: "customer",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    renderAt("/admin");

    expect(screen.getByText("Dashboard screen")).toBeInTheDocument();
    expect(screen.queryByText("Admin screen")).not.toBeInTheDocument();
  });

  it("lets an admin into the admin console", () => {
    auth.status = "authenticated";
    auth.user = {
      id: "2",
      email: "admin@example.com",
      name: "Avery Admin",
      role: "admin",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    renderAt("/admin");

    expect(screen.getByText("Admin screen")).toBeInTheDocument();
  });

  it("keeps a signed-in user off the login screen", () => {
    auth.status = "authenticated";
    auth.user = {
      id: "1",
      email: "driver@example.com",
      name: "Test Driver",
      role: "customer",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    renderAt("/public");

    expect(screen.getByText("Dashboard screen")).toBeInTheDocument();
  });
});
