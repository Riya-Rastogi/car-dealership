import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface AuthShellProps {
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({ children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(30rem,34rem)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-panel p-12 lg:flex">
        <div aria-hidden="true" className="grid-texture absolute inset-0 opacity-60" />
        <div
          aria-hidden="true"
          className="absolute -right-48 top-1/3 size-[36rem] rounded-full bg-accent/10 blur-3xl"
        />

        <Link to="/" className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-accent font-display text-xl font-bold text-accent-ink">
            A
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-sm font-bold tracking-[0.32em] text-ink">
              AUTOLINE
            </span>
            <span className="mt-1.5 text-[0.625rem] uppercase tracking-[0.28em] text-muted">
              Dealer inventory
            </span>
          </span>
        </Link>

        <div className="relative max-w-lg">
          <p className="mb-5 flex items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-accent">
            <span className="h-px w-8 bg-accent" aria-hidden="true" />
            Inventory, on your terms
          </p>
          <h2 className="font-display text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-balance-tight text-ink xl:text-6xl">
            The lot,
            <br />
            without the
            <br />
            <span className="text-accent">guesswork.</span>
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
            A live catalogue of every car on the floor. Filter it, price it, and reserve it knowing
            the stock number in front of you is the stock number in the system.
          </p>
        </div>

        <dl className="relative grid grid-cols-3 gap-6 border-t border-line pt-6">
          {[
            ["Live", "stock counts"],
            ["Atomic", "purchases"],
            ["Role", "aware access"],
          ].map(([term, description]) => (
            <div key={term}>
              <dt className="font-display text-lg font-semibold text-ink">{term}</dt>
              <dd className="mt-1 text-[0.6875rem] uppercase tracking-[0.16em] text-muted">
                {description}
              </dd>
            </div>
          ))}
        </dl>
      </aside>

      <section className="relative flex flex-col justify-center px-5 py-12 sm:px-10">
        <div className="mb-10 flex items-center gap-3 lg:hidden">
          <span className="grid size-9 place-items-center rounded-md bg-accent font-display text-lg font-bold text-accent-ink">
            A
          </span>
          <span className="font-display text-sm font-bold tracking-[0.32em] text-ink">AUTOLINE</span>
        </div>

        <div className="mx-auto w-full max-w-sm">
          {children}
          <div className="mt-10 border-t border-line pt-6 text-sm text-muted">{footer}</div>
        </div>
      </section>
    </div>
  );
}
