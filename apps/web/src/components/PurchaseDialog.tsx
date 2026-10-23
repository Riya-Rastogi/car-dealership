import type { Vehicle } from "@dealer/shared";
import { useEffect, useRef } from "react";
import { formatPrice, stockLabel } from "../lib/format.js";

interface PurchaseDialogProps {
  vehicle: Vehicle;
  open: boolean;
  pending: boolean;
  onClose(): void;
  onConfirm(): void;
}

export function PurchaseDialog({
  vehicle,
  open,
  pending,
  onClose,
  onConfirm,
}: PurchaseDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Escape is handled by the native dialog, but a purchase in flight should
  // not be dismissible halfway through.
  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    const handleCancel = (event: Event) => {
      if (pending) {
        event.preventDefault();
      }
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [pending]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="purchase-dialog-title"
      onClick={(event) => {
        if (event.target === dialogRef.current && !pending) {
          onClose();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-line bg-panel p-0 text-ink shadow-2xl backdrop:bg-canvas/80 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-accent">
          Confirm purchase
        </p>
        <h2
          id="purchase-dialog-title"
          className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em]"
        >
          Take home the {vehicle.make} {vehicle.model}?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          One unit will be reserved for you at the listed price. You can review the purchase in
          your garage immediately after.
        </p>

        <dl className="mt-5 space-y-2 rounded-md border border-line bg-canvas/50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted">Vehicle</dt>
            <dd className="text-right font-medium text-ink">
              {vehicle.year ? `${vehicle.year} ` : ""}
              {vehicle.make} {vehicle.model}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted">Availability</dt>
            <dd className="text-right text-muted">{stockLabel(vehicle.quantity)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-line/80 pt-2">
            <dt className="font-medium text-ink">Total</dt>
            <dd className="font-display text-lg font-semibold text-accent">
              {formatPrice(vehicle.priceCents)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:border-accent/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <span
                  aria-hidden="true"
                  className="size-3.5 animate-spin rounded-full border-2 border-accent-ink/30 border-t-accent-ink"
                />
                Completing purchase
              </>
            ) : (
              "Confirm purchase"
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
}
