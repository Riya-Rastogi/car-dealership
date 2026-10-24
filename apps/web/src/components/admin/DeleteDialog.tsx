import type { Vehicle } from "@dealer/shared";
import { useState } from "react";
import { api } from "../../lib/api.js";
import { Modal } from "../Modal.js";

interface DeleteDialogProps {
  vehicle: Vehicle | null;
  onClose(): void;
  onDeleted(vehicle: Vehicle): void;
}

export function DeleteDialog({ vehicle, onClose, onDeleted }: DeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!vehicle) {
    return null;
  }

  async function handleDelete() {
    if (!vehicle) {
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await api.deleteVehicle(vehicle.id);
      onDeleted(vehicle);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete this vehicle.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open labelledBy="delete-title" pending={submitting} onClose={onClose}>
      <div className="p-6">
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-red-300">
          Destructive action
        </p>
        <h2 id="delete-title" className="mt-2 font-display text-2xl font-semibold">
          Remove {vehicle.make} {vehicle.model}?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The listing disappears from the lot immediately. Purchase records for this vehicle are
          removed with it. This cannot be undone.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-400/30 bg-red-400/10 px-3.5 py-3 text-sm text-red-300"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:border-accent/50 hover:text-ink disabled:opacity-50"
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={submitting}
            className="rounded-md bg-red-400 px-4 py-2.5 text-sm font-semibold text-canvas transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Removing…" : "Remove vehicle"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
