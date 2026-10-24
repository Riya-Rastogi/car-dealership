import type { Purchase, PurchaseListResponse } from "@dealer/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";
import { api } from "../lib/api.js";
import { formatCategory, formatDate, formatPrice } from "../lib/format.js";

function GarageSkeleton() {
  return (
    <div className="mt-8 space-y-3" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-4 rounded-card border border-line bg-panel p-4"
        >
          <div className="size-20 shrink-0 rounded-md bg-panel-raised sm:size-24" />
          <div className="flex-1 space-y-2">
            <div className="h-2.5 w-24 rounded-full bg-panel-raised" />
            <div className="h-4 w-40 rounded-full bg-panel-raised" />
            <div className="h-2.5 w-28 rounded-full bg-panel-raised" />
          </div>
          <div className="hidden h-5 w-20 rounded-full bg-panel-raised sm:block" />
        </div>
      ))}
    </div>
  );
}

function PurchaseRow({ purchase }: { purchase: Purchase }) {
  const { vehicle } = purchase;
  const title = vehicle
    ? vehicle.year
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : `${vehicle.make} ${vehicle.model}`
    : "Vehicle no longer listed";

  const body = (
    <>
      <div className="relative size-20 shrink-0 overflow-hidden rounded-md border border-line bg-panel-raised sm:size-24">
        {vehicle?.imageUrl ? (
          <img src={vehicle.imageUrl} alt={title} loading="lazy" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-[0.5625rem] uppercase tracking-[0.18em] text-muted">
            No photo
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted">
          {vehicle ? `${formatCategory(vehicle.category)} · ${vehicle.make}` : "Removed from lot"}
        </p>
        <h3 className="mt-1 truncate font-display text-lg font-semibold tracking-[-0.02em] text-ink">
          {title}
        </h3>
        <p className="mt-1 text-xs text-muted">
          Purchased {formatDate(purchase.createdAt)} · {purchase.quantity}{" "}
          {purchase.quantity === 1 ? "unit" : "units"}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-display text-base font-semibold text-accent sm:text-lg">
          {formatPrice(purchase.totalCents)}
        </p>
        <p className="mt-1 hidden text-[0.625rem] uppercase tracking-[0.14em] text-muted sm:block">
          {formatPrice(purchase.unitPriceCents)} each
        </p>
      </div>
    </>
  );

  return (
    <li>
      {vehicle ? (
        <Link
          to={`/vehicles/${vehicle.id}`}
          aria-label={`View ${title}`}
          className="group flex items-center gap-4 rounded-card border border-line bg-panel p-4 transition hover:border-accent/40 hover:bg-panel/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-4 rounded-card border border-line bg-panel/60 p-4">
          {body}
        </div>
      )}
    </li>
  );
}

export function GaragePage() {
  const { user } = useAuth();
  const { data, isPending, isError, error, refetch } = useQuery<PurchaseListResponse>({
    queryKey: ["purchases"],
    queryFn: () => api.listPurchases(),
  });

  const purchases = data?.data ?? [];
  const totalSpent = purchases.reduce((sum, purchase) => sum + purchase.totalCents, 0);
  const latest = purchases[0];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <section className="border-b border-line pb-8">
        <p className="flex items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-accent">
          <span className="h-px w-6 bg-accent" aria-hidden="true" />
          Account / Purchase history
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-[0.98] tracking-[-0.035em] sm:text-5xl">
          Your <span className="text-accent">garage.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          {user ? `${user.name.split(" ")[0]}, every` : "Every"} car you have reserved through
          Autoline lives here — prices are locked in at the moment of purchase.
        </p>

        <dl className="mt-8 grid grid-cols-3 divide-x divide-line border-y border-line py-4">
          <div className="pr-4">
            <dt className="text-[0.625rem] uppercase tracking-[0.18em] text-muted">Cars</dt>
            <dd className="mt-1 font-display text-2xl font-semibold text-ink">
              {isPending ? "—" : purchases.length}
            </dd>
          </div>
          <div className="px-4">
            <dt className="text-[0.625rem] uppercase tracking-[0.18em] text-muted">Total spent</dt>
            <dd className="mt-1 font-display text-2xl font-semibold text-accent">
              {isPending ? "—" : formatPrice(totalSpent)}
            </dd>
          </div>
          <div className="pl-4">
            <dt className="text-[0.625rem] uppercase tracking-[0.18em] text-muted">Latest</dt>
            <dd className="mt-1 font-display text-2xl font-semibold text-ink">
              {isPending ? "—" : latest ? formatDate(latest.createdAt) : "—"}
            </dd>
          </div>
        </dl>
      </section>

      {isError ? (
        <div
          role="alert"
          className="mt-8 rounded-card border border-red-400/30 bg-red-950/20 px-6 py-12 text-center"
        >
          <h2 className="font-display text-xl font-semibold text-ink">
            We couldn&apos;t load your purchases
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {error instanceof Error ? error.message : "Check the API and try again."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-6 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-soft"
          >
            Try again
          </button>
        </div>
      ) : isPending ? (
        <GarageSkeleton />
      ) : purchases.length === 0 ? (
        <div className="mt-8 rounded-card border border-dashed border-line bg-panel/40 px-6 py-16 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full border border-line text-muted">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="size-5"
              aria-hidden="true"
            >
              <path
                d="M5 16h14M4 16l1.5-4.5A2 2 0 0 1 7.4 10h9.2a2 2 0 0 1 1.9 1.5L20 16v3H4v-3Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="7.5" cy="19" r="1.5" />
              <circle cx="16.5" cy="19" r="1.5" />
            </svg>
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold text-ink">
            Your garage is empty — for now
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Reserve a car from the lot and it will show up here instantly, along with what you paid.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-soft"
          >
            Browse the inventory
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-8 space-y-3">
            {purchases.map((purchase) => (
              <PurchaseRow key={purchase.id} purchase={purchase} />
            ))}
          </ul>

          <div className="mt-8 flex flex-col items-start justify-between gap-3 rounded-card border border-line bg-panel px-5 py-4 sm:flex-row sm:items-center">
            <p className="text-xs leading-relaxed text-muted">
              Questions about a purchase? Bring your account email to the dealership desk.
            </p>
            <Link
              to="/"
              className="text-xs font-semibold text-accent underline-offset-4 hover:underline"
            >
              Back to the lot →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
