import type { Vehicle } from "@dealer/shared";
import { Link } from "react-router-dom";
import { formatCategory, formatPrice, stockLabel } from "../lib/format.js";

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const outOfStock = vehicle.quantity === 0;
  const title = vehicle.year
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    : `${vehicle.make} ${vehicle.model}`;

  return (
    <Link
      to={`/vehicles/${vehicle.id}`}
      className="group block h-full rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-panel transition duration-300 group-hover:-translate-y-1 group-hover:border-accent/40 group-hover:shadow-[0_24px_60px_-32px_rgba(200,247,81,0.35)]">
        <div className="relative aspect-[4/3] overflow-hidden bg-panel-raised">
          <span className="sr-only">View {title}</span>
          {vehicle.imageUrl ? (
            <img
              src={vehicle.imageUrl}
              alt={title}
              loading="lazy"
              className={`size-full object-cover transition duration-700 group-hover:scale-105 ${
                outOfStock ? "opacity-50 grayscale" : ""
              }`}
            />
          ) : (
            <div className="grid size-full place-items-center bg-panel-raised text-xs uppercase tracking-[0.2em] text-muted">
              No photo
            </div>
          )}

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-canvas/80 via-canvas/5 to-transparent"
          />

          <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-canvas/70 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink backdrop-blur">
            {formatCategory(vehicle.category)}
          </span>

          <span
            className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] backdrop-blur ${
              outOfStock
                ? "border-red-400/30 bg-red-950/70 text-red-300"
                : "border-accent/30 bg-canvas/70 text-accent"
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${outOfStock ? "bg-red-400" : "bg-accent"}`}
            />
            {outOfStock ? "Out of stock" : "In stock"}
          </span>

          {outOfStock ? (
            <span className="absolute inset-x-0 bottom-3 mx-auto w-max rounded-full border border-line bg-canvas/80 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-red-300 backdrop-blur">
              Currently unavailable
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-muted">
            {vehicle.year ?? "Classic"} · {vehicle.make}
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold tracking-[-0.02em] text-ink">
            {vehicle.model}
          </h3>

          <div className="mt-4 flex items-end justify-between gap-3 border-t border-line/80 pt-3.5">
            <div>
              <p className="font-display text-lg font-semibold text-accent">
                {formatPrice(vehicle.priceCents)}
              </p>
              <p className="mt-0.5 text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                {stockLabel(vehicle.quantity)}
              </p>
            </div>

            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-full border border-line text-muted transition group-hover:border-accent/60 group-hover:text-accent"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="size-3.5"
              >
                <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function VehicleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-panel">
      <div className="aspect-[4/3] animate-pulse bg-panel-raised" />
      <div className="space-y-3 p-4">
        <div className="h-2.5 w-1/3 animate-pulse rounded-full bg-panel-raised" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-panel-raised" />
        <div className="mt-5 flex items-center justify-between border-t border-line/80 pt-4">
          <div className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded-full bg-panel-raised" />
            <div className="h-2 w-16 animate-pulse rounded-full bg-panel-raised" />
          </div>
          <div className="size-8 animate-pulse rounded-full bg-panel-raised" />
        </div>
      </div>
    </div>
  );
}
