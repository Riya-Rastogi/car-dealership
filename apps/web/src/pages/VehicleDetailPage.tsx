import type { Vehicle } from "@dealer/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PurchaseDialog } from "../components/PurchaseDialog.js";
import { Toast, type ToastMessage } from "../components/Toast.js";
import { ApiError, api } from "../lib/api.js";
import { formatCategory, formatDate, formatPrice, stockLabel } from "../lib/format.js";

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <div className="h-3 w-32 animate-pulse rounded-full bg-panel-raised" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(22rem,1fr)]">
        <div className="aspect-[16/10] animate-pulse rounded-card border border-line bg-panel" />
        <div className="space-y-4">
          <div className="h-2.5 w-20 animate-pulse rounded-full bg-panel-raised" />
          <div className="h-10 w-3/4 animate-pulse rounded-full bg-panel-raised" />
          <div className="h-6 w-28 animate-pulse rounded-full bg-panel-raised" />
          <div className="h-40 animate-pulse rounded-card border border-line bg-panel" />
        </div>
      </div>
    </div>
  );
}

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const vehicleQuery = useQuery<Vehicle>({
    queryKey: ["vehicle", id],
    queryFn: () => api.getVehicle(id as string),
    enabled: Boolean(id),
  });

  const purchase = useMutation({
    mutationFn: (vehicleId: string) => api.purchaseVehicle(vehicleId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["vehicle", id] });
      const previous = queryClient.getQueryData<Vehicle>(["vehicle", id]);

      if (previous) {
        queryClient.setQueryData<Vehicle>(["vehicle", id], {
          ...previous,
          quantity: Math.max(0, previous.quantity - 1),
        });
      }

      return { previous };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["vehicle", id], result.vehicle);
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      void queryClient.invalidateQueries({ queryKey: ["purchases"] });
      setToast({
        id: Date.now(),
        kind: "success",
        title: "Purchase complete",
        message: `${result.vehicle.make} ${result.vehicle.model} is now in your garage.`,
        action: { label: "View garage", to: "/garage" },
      });
    },
    onError: (error, _vehicleId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["vehicle", id], context.previous);
      }

      // Reconcile with the server after a lost race: the stock count shown here
      // was stale for a moment.
      void queryClient.invalidateQueries({ queryKey: ["vehicle", id] });

      const soldOut = error instanceof ApiError && error.code === "VEHICLE_OUT_OF_STOCK";

      setToast({
        id: Date.now(),
        kind: "error",
        title: soldOut ? "Someone bought it first" : "Purchase did not go through",
        message: soldOut
          ? "The last unit sold before your purchase completed. The stock count is refreshed — have a look at the rest of the lot."
          : error instanceof Error
            ? error.message
            : "Please try again.",
      });
    },
    onSettled: () => {
      setConfirming(false);
    },
  });

  if (vehicleQuery.isPending) {
    return <DetailSkeleton />;
  }

  const vehicle = vehicleQuery.data;

  if (vehicleQuery.isError || !vehicle) {
    const notFound = vehicleQuery.error instanceof ApiError && vehicleQuery.error.status === 404;

    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-accent">
          {notFound ? "404 / Not on the lot" : "Inventory unavailable"}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">
          {notFound ? "That car isn't here." : "We couldn't load this vehicle."}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">
          {notFound
            ? "It may have sold or been removed from the catalogue. The rest of the lot is still open."
            : vehicleQuery.error instanceof Error
              ? vehicleQuery.error.message
              : "Check the API and try again."}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-soft"
          >
            Back to inventory
          </Link>
          {!notFound ? (
            <button
              type="button"
              onClick={() => void vehicleQuery.refetch()}
              className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:border-accent/50 hover:text-ink"
            >
              Try again
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const outOfStock = vehicle.quantity === 0;
  const title = vehicle.year
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    : `${vehicle.make} ${vehicle.model}`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-medium text-muted transition hover:text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="size-3.5"
          aria-hidden="true"
        >
          <path d="M19 12H5m6 6-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to inventory
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(22rem,1fr)] lg:items-start">
        <div>
          <div className="relative overflow-hidden rounded-card border border-line bg-panel-raised">
            {vehicle.imageUrl ? (
              <img
                src={vehicle.imageUrl}
                alt={title}
                className={`aspect-[16/10] size-full object-cover ${outOfStock ? "opacity-60 grayscale" : ""}`}
              />
            ) : (
              <div className="grid aspect-[16/10] place-items-center text-xs uppercase tracking-[0.2em] text-muted">
                No photo available
              </div>
            )}

            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-canvas/70 via-transparent to-transparent"
            />

            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-canvas/70 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink backdrop-blur">
                {formatCategory(vehicle.category)}
              </span>
              {vehicle.year ? (
                <span className="rounded-full border border-white/10 bg-canvas/70 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ink backdrop-blur">
                  {vehicle.year}
                </span>
              ) : null}
            </div>

            <span
              className={`absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] backdrop-blur ${
                outOfStock
                  ? "border-red-400/30 bg-red-950/70 text-red-300"
                  : "border-accent/30 bg-canvas/70 text-accent"
              }`}
            >
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${outOfStock ? "bg-red-400" : "bg-accent"}`}
              />
              {stockLabel(vehicle.quantity)}
            </span>
          </div>

          <section className="mt-6 rounded-card border border-line bg-panel p-5 sm:p-6">
            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-muted">
              About this vehicle
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              {vehicle.description ??
                `${title}. Inspected, detailed and ready for a test drive. Ask the desk about financing and trade-in options.`}
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-4">
              <div>
                <dt className="text-[0.625rem] uppercase tracking-[0.16em] text-muted">Make</dt>
                <dd className="mt-1 text-sm font-medium text-ink">{vehicle.make}</dd>
              </div>
              <div>
                <dt className="text-[0.625rem] uppercase tracking-[0.16em] text-muted">Model</dt>
                <dd className="mt-1 text-sm font-medium text-ink">{vehicle.model}</dd>
              </div>
              <div>
                <dt className="text-[0.625rem] uppercase tracking-[0.16em] text-muted">Body</dt>
                <dd className="mt-1 text-sm font-medium text-ink">
                  {formatCategory(vehicle.category)}
                </dd>
              </div>
              <div>
                <dt className="text-[0.625rem] uppercase tracking-[0.16em] text-muted">Year</dt>
                <dd className="mt-1 text-sm font-medium text-ink">{vehicle.year ?? "—"}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-accent">
            {vehicle.year ?? "Classic"} · {formatCategory(vehicle.category)} · {vehicle.make}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-5xl">
            {vehicle.make} <span className="text-accent">{vehicle.model}</span>
          </h1>

          <div className="mt-5 flex items-end justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted">Asking price</p>
              <p className="mt-1 font-display text-4xl font-semibold tracking-[-0.03em] text-ink">
                {formatPrice(vehicle.priceCents)}
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] ${
                outOfStock
                  ? "border-red-400/30 bg-red-950/30 text-red-300"
                  : "border-accent/30 bg-accent/10 text-accent"
              }`}
            >
              {outOfStock ? "Out of stock" : "Available"}
            </span>
          </div>

          <div className="mt-5 rounded-card border border-line bg-panel p-5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted">Stock on hand</span>
              <span className={outOfStock ? "text-red-300" : "text-ink"}>
                {stockLabel(vehicle.quantity)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 text-sm">
              <span className="text-muted">Listed</span>
              <span className="text-ink">{formatDate(vehicle.createdAt)}</span>
            </div>

            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={outOfStock}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-accent-ink transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:bg-panel-raised disabled:text-muted disabled:hover:bg-panel-raised"
            >
              {outOfStock ? "Out of stock" : "Purchase this car"}
            </button>

            <p className="mt-3 text-center text-[0.6875rem] leading-relaxed text-muted">
              {outOfStock
                ? "This one just left the lot. Browse the inventory for the next arrival."
                : "Reserve online and collect at the dealership. Taxes and registration are settled at delivery."}
            </p>
          </div>

          <ul className="mt-5 space-y-2.5 text-xs text-muted">
            {["Live stock count, updated after every sale", "Inspected and detailed before handover", "No overselling — the button only works while stock lasts"].map(
              (item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-1 grid size-3.5 shrink-0 place-items-center rounded-full bg-accent/15 text-accent"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="size-2">
                      <path d="m5 12 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {item}
                </li>
              ),
            )}
          </ul>
        </aside>
      </div>

      <PurchaseDialog
        vehicle={vehicle}
        open={confirming}
        pending={purchase.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() => purchase.mutate(vehicle.id)}
      />
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
