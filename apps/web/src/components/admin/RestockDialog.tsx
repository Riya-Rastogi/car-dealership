import type { Vehicle } from "@dealer/shared";
import { useState, type FormEvent } from "react";
import { api } from "../../lib/api.js";
import { stockLabel } from "../../lib/format.js";
import { Modal } from "../Modal.js";
import { TextField } from "../TextField.js";

interface RestockDialogProps {
  vehicle: Vehicle | null;
  onClose(): void;
  onSaved(vehicle: Vehicle): void;
}

export function RestockDialog({ vehicle, onClose, onSaved }: RestockDialogProps) {
  const [quantity, setQuantity] = useState("1");
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset when a different vehicle is opened.
  if (vehicle && vehicle.id !== vehicleId) {
    setVehicleId(vehicle.id);
    setQuantity("1");
    setError(null);
  }

  if (!vehicle) {
    return null;
  }

  const target = vehicle;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const amount = Number(quantity);

    if (!Number.isInteger(amount) || amount <= 0 || amount > 10_000) {
      setError("Enter a whole number between 1 and 10000.");
      return;
    }

    setSubmitting(true);

    try {
      const saved = await api.restockVehicle(target.id, amount);
      onSaved(saved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not restock this vehicle.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open labelledBy="restock-title" pending={submitting} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="p-6">
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-accent">
          Inventory
        </p>
        <h2 id="restock-title" className="mt-2 font-display text-2xl font-semibold">
          Restock {vehicle.make} {vehicle.model}
        </h2>
        <p className="mt-2 text-sm text-muted">
          Currently {stockLabel(vehicle.quantity)}. Units are added to the existing count.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-400/30 bg-red-400/10 px-3.5 py-3 text-sm text-red-300"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-5">
          <TextField
            id="restock-quantity"
            label="Units to add"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:border-accent/50 hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Restocking…" : "Add units"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
