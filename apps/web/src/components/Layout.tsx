import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function navClass({ isActive }: { isActive: boolean }): string {
  return `rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
    isActive ? "bg-panel-raised text-accent" : "text-muted hover:text-ink"
  }`;
}

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-3" aria-label="Autoline inventory">
            <span className="grid size-9 place-items-center rounded-md bg-accent font-display text-lg font-bold text-accent-ink transition-transform group-hover:-rotate-6">
              A
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-sm font-bold tracking-[0.32em] text-ink">
                AUTOLINE
              </span>
              <span className="mt-1 text-[0.625rem] font-medium uppercase tracking-[0.28em] text-muted">
                Dealer inventory
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Primary">
            <NavLink to="/" end className={navClass}>
              Inventory
            </NavLink>
            <NavLink to="/garage" className={navClass}>
              Garage
            </NavLink>
            {user?.role === "admin" ? (
              <NavLink to="/admin" className={navClass}>
                Admin
              </NavLink>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <span className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-muted xl:inline-flex">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              Live stock
            </span>

            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="hidden size-8 place-items-center rounded-full border border-line bg-panel-raised font-display text-xs font-semibold text-accent sm:grid">
                    {initials(user.name)}
                  </span>
                  <span className="hidden flex-col leading-tight md:flex">
                    <span className="text-xs font-medium text-ink">{user.name}</span>
                    <span className="text-[0.625rem] uppercase tracking-[0.16em] text-muted">
                      {user.role}
                    </span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent/60 hover:text-ink"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line/70">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-[0.6875rem] uppercase tracking-[0.2em] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>Autoline / Inventory system</span>
          <span>Prices in USD · Stock synced with the lot</span>
        </div>
      </footer>
    </div>
  );
}
