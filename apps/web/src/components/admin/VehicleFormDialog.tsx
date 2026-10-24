import {
  VEHICLE_CATEGORIES,
  createVehicleSchema,
  type CreateVehicleInput,
  type Vehicle,
  type VehicleCategory,
} from "@dealer/shared";
import { useState, type FormEvent } from "react";
import { ApiError, api } from "../../lib/api.js";
import { formatPrice } from "../../lib/format.js";
import { fieldErrorsFrom } from "../../lib/validation.js";
import { Modal } from "../Modal.js";
import { TextField } from "../TextField.js";

interface VehicleFormDialogProps {
  open: boolean;
  vehicle: Vehicle | null;
  onClose(): void;
  onSaved(vehicle: Vehicle, created: boolean): void;
}

interface FormState {
  make: string;
  model: string;
  category: VehicleCategory;
  price: string;
  quantity: string;
  year: string;
  description: string;
  imageUrl: string;
}

function initialState(vehicle: Vehicle | null): FormState {
  return {
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    category: vehicle?.category ?? "sedan",
    price: vehicle ? String(vehicle.priceCents / 100) : "",
    quantity: vehicle ? String(vehicle.quantity) : "0",
    year: vehicle?.year ? String(vehicle.year) : "",
    description: vehicle?.description ?? "",
    imageUrl: vehicle?.imageUrl ?? "",
  };
}

const controlClass =
  "w-full rounded-md border border-line bg-panel px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/50 transition focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/25";

const labelClass =
  "block text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted";

export function VehicleFormDialog({ open, vehicle, onClose, onSaved }: VehicleFormDialogProps) {
  const [values, setValues] = useState<FormState>(() => initialState(vehicle));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Re-seed the form each time the dialog opens for a different vehicle.
  const [seed, setSeed] = useState<string | null>(null);
  const seedKey = open ? (vehicle?.id ?? "new") : null;

  if (seedKey !== seed) {
    setSeed(seedKey);
    setValues(initialState(vehicle));
    setErrors({});
    setFormError(null);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const priceCents = values.price.trim() === "" ? 0 : Math.round(Number(values.price) * 100);
    const candidate = {
      make: values.make,
      model: values.model,
      category: values.category,
      priceCents,
      quantity: vehicle ? vehicle.quantity : Number(values.quantity || "0"),
      year: values.year ? Number(values.year) : undefined,
      description: values.description.trim() || undefined,
      imageUrl: values.imageUrl.trim() || undefined,
    };

    const parsed = createVehicleSchema.safeParse(candidate);
    const nextErrors = parsed.success ? {} : fieldErrorsFrom(parsed.error.issues);

    // Schema messages are friendly, but an empty price/stock is better called out
    // directly than as "expected number, received 0".
    if (values.price.trim() === "") {
      nextErrors.priceCents = "Price is required";
    }

    if (!vehicle && values.quantity.trim() === "") {
      nextErrors.quantity = "Initial stock is required";
    }

    if (Object.keys(nextErrors).length > 0 || !parsed.success) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      if (vehicle) {
        const { make, model, category, priceCents, year, description, imageUrl } = parsed.data;
        const saved = await api.updateVehicle(vehicle.id, {
          make,
          model,
          category,
          priceCents,
          year,
          description,
          imageUrl,
        });
        onSaved(saved, false);
      } else {
        const saved = await api.createVehicle(parsed.data as CreateVehicleInput);
        onSaved(saved, true);
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        setErrors(fieldErrorsFrom(error.details));
      } else {
        setFormError(error instanceof Error ? error.message : "Could not save the vehicle.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      labelledBy="vehicle-form-title"
      pending={submitting}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="max-h-[85vh] overflow-y-auto p-6">
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-accent">
          {vehicle ? "Edit listing" : "New listing"}
        </p>
        <h2 id="vehicle-form-title" className="mt-2 font-display text-2xl font-semibold">
          {vehicle ? `${vehicle.make} ${vehicle.model}` : "Add a vehicle to the lot"}
        </h2>
        {vehicle ? (
          <p className="mt-2 text-xs text-muted">
            Stock is {vehicle.quantity} and changes through restock, not this form. Current price:{" "}
            {formatPrice(vehicle.priceCents)}.
          </p>
        ) : null}

        {formError ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-400/30 bg-red-400/10 px-3.5 py-3 text-sm text-red-300"
          >
            {formError}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <TextField
            id="vehicle-make"
            label="Make"
            value={values.make}
            error={errors.make}
            onChange={(event) => set("make", event.target.value)}
            placeholder="Toyota"
            required
          />
          <TextField
            id="vehicle-model"
            label="Model"
            value={values.model}
            error={errors.model}
            onChange={(event) => set("model", event.target.value)}
            placeholder="Camry SE"
            required
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="vehicle-category" className={labelClass}>
              Body style
            </label>
            <select
              id="vehicle-category"
              value={values.category}
              onChange={(event) => set("category", event.target.value as VehicleCategory)}
              className={controlClass}
            >
              {VEHICLE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category === "ev" ? "Electric" : category[0]!.toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
            {errors.category ? (
              <p className="text-xs font-medium text-red-400">{errors.category}</p>
            ) : null}
          </div>

          <TextField
            id="vehicle-price"
            label="Price (USD)"
            type="number"
            inputMode="decimal"
            min={0}
            step={100}
            value={values.price}
            error={errors.priceCents}
            onChange={(event) => set("price", event.target.value)}
            placeholder="26500"
            required
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {vehicle ? (
            <div className="rounded-md border border-line bg-canvas/40 px-3.5 py-2.5">
              <p className={labelClass}>Stock on hand</p>
              <p className="mt-1 text-sm text-ink">{vehicle.quantity} units</p>
              <p className="mt-1 text-[0.6875rem] text-muted">Use Restock to change this.</p>
            </div>
          ) : (
            <TextField
              id="vehicle-quantity"
              label="Initial stock"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={values.quantity}
              error={errors.quantity}
              onChange={(event) => set("quantity", event.target.value)}
              required
            />
          )}

          <TextField
            id="vehicle-year"
            label="Year (optional)"
            type="number"
            inputMode="numeric"
            min={1900}
            max={new Date().getFullYear() + 1}
            value={values.year}
            error={errors.year}
            onChange={(event) => set("year", event.target.value)}
            placeholder="2023"
          />
        </div>

        <div className="mt-4 space-y-1.5">
          <label htmlFor="vehicle-description" className={labelClass}>
            Description (optional)
          </label>
          <textarea
            id="vehicle-description"
            rows={3}
            value={values.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder="Inspected, detailed, one owner…"
            className={controlClass}
          />
          {errors.description ? (
            <p className="text-xs font-medium text-red-400">{errors.description}</p>
          ) : null}
        </div>

        <div className="mt-4">
          <TextField
            id="vehicle-image"
            label="Image URL (optional)"
            type="url"
            value={values.imageUrl}
            error={errors.imageUrl}
            onChange={(event) => set("imageUrl", event.target.value)}
            placeholder="https://images.example.com/car.jpg"
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
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving…" : vehicle ? "Save changes" : "Add vehicle"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
