import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-16">
      <div aria-hidden="true" className="grid-texture absolute inset-0 opacity-40" />
      <div className="relative max-w-lg text-center">
        <Link to="/" className="inline-flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-accent font-display text-lg font-bold text-accent-ink">
            A
          </span>
          <span className="font-display text-sm font-bold tracking-[0.32em] text-ink">AUTOLINE</span>
        </Link>

        <p className="mt-12 font-display text-[7rem] font-semibold leading-none tracking-[-0.06em] text-accent/20">
          404
        </p>
        <h1 className="-mt-6 font-display text-4xl font-semibold tracking-[-0.03em]">
          Off the lot.
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
          This page isn&apos;t part of the inventory. Head back to the showroom and pick a car
          instead.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition hover:bg-accent-soft"
        >
          Back to inventory
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </main>
  );
}
