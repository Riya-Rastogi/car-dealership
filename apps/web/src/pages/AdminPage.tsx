import type { Vehicle, VehicleListResponse } from "@dealer/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { DeleteDialog } from "../components/admin/DeleteDialog.js";
import { RestockDialog } from "../components/admin/RestockDialog.js";
import { VehicleFormDialog } from "../components/admin/VehicleFormDialog.js";
import { Toast, type ToastMessage } from "../components/Toast.js";
import { api } from "../lib/api.js";
import { formatCategory, formatDate, formatPrice } from "../lib/format.js";

function AdminSkeleton() {
  return (
    <div className="mt-8 space-y-2" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-card border border-line bg-panel"
        />
      ))}
    </div>
  );
}

export function AdminPage() {
  const queryClient = useQueryClient();
  const [formVehicle, setFormVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [restockTarget, setRestockTarget] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const { data, isPending, isError, error, refetch } = useQuery<VehicleListResponse>({
    queryKey: ["vehicles", "admin"],
    queryFn: () => api.listVehicles({ limit: 100, sort: "newest" }),
  });

  const vehicles = data?.data ?? [];
  const units = vehicles.reduce((sum, vehicle) => sum + vehicle.quantity, 0);
  const soldOut = vehicles.filter((vehicle) => vehicle.quantity === 0).length;

  function invalidate(vehicle?: Vehicle) {
    if (vehicle) {
      queryClient.setQueryData(["vehicle", vehicle.id], vehicle);
    }

    void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  }

  const handleSaved = (vehicle: Vehicle, created: boolean) => {
    setFormVehicle(undefined);
    invalidate(vehicle);
    setToast({
      id: Date.now(),
      kind: "success",
      title: created ? "Vehicle added to the lot" : "Listing updated",
      message: `${vehicle.make} ${vehicle.model} is live with ${vehicle.quantity} in stock.`,
    });
  };

  const handleRestocked = (vehicle: Vehicle) => {
    setRestockTarget(null);
    invalidate(vehicle);
    setToast({
      id: Date.now(),
      kind: "success",
      title: "Stock updated",
      message: `${vehicle.make} ${vehicle.model} now has ${vehicle.quantity} units available.`,
    });
  };

  const handleDeleted = (vehicle: Vehicle) => {
    setDeleteTarget(null);
    invalidate();
    queryClient.removeQueries({ queryKey: ["vehicle", vehicle.id] });
    setToast({
      id: Date.now(),
      kind: "success",
      title: "Vehicle removed",
      message: `${vehicle.make} ${vehicle.model} is no longer listed.`,
    });
  };

  const formOpen = formVehicle !== undefined;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-accent">
            <span className="h-px w-6 bg-accent" aria-hidden="true" />
            Admin / Inventory control
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[0.98] tracking-[-0.035em] sm:text-5xl">
            Run the <span className="text-accent">lot.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            Add listings, correct prices, restock arrivals, and retire cars. Every change is
            validated by the same schema the API uses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFormVehicle(null)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-accent-ink transition hover:bg-accent-soft"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Add vehicle
        </button>
      </section>

      <dl className="grid grid-cols-3 divide-x divide-line border-b border-line py-5">
        <div className="pr-4">
          <dt className="text-[0.625rem] uppercase tracking-[0.18em] text-muted">Listings</dt>
          <dd className="mt-1 font-display text-2xl font-semibold text-ink">
            {isPending ? "—" : vehicles.length}
          </dd>
        </div>
        <div className="px-4">
          <dt className="text-[0.625rem] uppercase tracking-[0.18em] text-muted">Units on lot</dt>
          <dd className="mt-1 font-display text-2xl font-semibold text-accent">
            {isPending ? "—" : units}
          </dd>
        </div>
        <div className="pl-4">
          <dt className="text-[0.625rem] uppercase tracking-[0.18em] text-muted">Sold out</dt>
          <dd className="mt-1 font-display text-2xl font-semibold text-ink">
            {isPending ? "—" : soldOut}
          </dd>
        </div>
      </dl>

      {isError ? (
        <div
          role="alert"
          className="mt-8 rounded-card border border-red-400/30 bg-red-950/20 px-6 py-12 text-center"
        >
          <h2 className="font-display text-xl font-semibold text-ink">
            We couldn&apos;t load the inventory
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
        <AdminSkeleton />
      ) : vehicles.length === 0 ? (
        <div className="mt-8 rounded-card border border-dashed border-line bg-panel/40 px-6 py-16 text-center">
          <h2 className="font-display text-xl font-semibold text-ink">The lot is empty</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Add the first vehicle and it will appear on the storefront immediately.
          </p>
          <button
            type="button"
            onClick={() => setFormVehicle(null)}
            className="mt-6 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-soft"
          >
            Add a vehicle
          </button>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
            <caption className="sr-only">Inventory with stock and actions</caption>
            <thead>
              <tr className="border-b border-line bg-panel text-[0.625rem] uppercase tracking-[0.16em] text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Vehicle
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Body
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Price
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Stock
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Listed
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-panel/40">
              {vehicles.map((vehicle) => {
                const outOfStock = vehicle.quantity === 0;
                const title = vehicle.year
                  ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                  : `${vehicle.make} ${vehicle.model}`;

                return (
                  <tr key={vehicle.id} className="transition hover:bg-panel-raised/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-12 shrink-0 overflow-hidden rounded-md border border-line bg-panel-raised">
                          {vehicle.imageUrl ? (
                            <img
                              src={vehicle.imageUrl}
                              alt=""
                              loading="lazy"
                              className="size-full object-cover"
                            />
                          ) : (
                            <span className="grid size-full place-items-center text-[0.5rem] uppercase tracking-[0.16em] text-muted">
                              No photo
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/vehicles/${vehicle.id}`}
                            className="block truncate font-medium text-ink underline-offset-4 hover:text-accent hover:underline"
                          >
                            {title}
                          </Link>
                          <p className="mt-0.5 text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                            {vehicle.make} · {vehicle.model}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatCategory(vehicle.category)}</td>
                    <td className="px-4 py-3 font-medium text-accent">
                      {formatPrice(vehicle.priceCents)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.1em] ${
                          outOfStock
                            ? "border-red-400/30 bg-red-950/30 text-red-300"
                            : "border-accent/30 bg-accent/10 text-accent"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`size-1.5 rounded-full ${outOfStock ? "bg-red-400" : "bg-accent"}`}
                        />
                        {outOfStock ? "Out of stock" : `${vehicle.quantity} units`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {formatDate(vehicle.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFormVehicle(vehicle)}
                          className="rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-accent/50 hover:text-ink"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setRestockTarget(vehicle)}
                          className="rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-accent/50 hover:text-ink"
                        >
                          Restock
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(vehicle)}
                          className="rounded-md border border-red-400/30 px-2.5 py-1.5 text-xs font-medium text-red-300 transition hover:border-red-400/70 hover:bg-red-400/10"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <VehicleFormDialog
        open={formOpen}
        vehicle={formVehicle ?? null}
        onClose={() => setFormVehicle(undefined)}
        onSaved={handleSaved}
      />

      <RestockDialog
        vehicle={restockTarget}
        onClose={() => setRestockTarget(null)}
        onSaved={handleRestocked}
      />

      <DeleteDialog
        vehicle={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
