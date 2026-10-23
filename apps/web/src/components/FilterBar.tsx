import { VEHICLE_CATEGORIES, type VehicleCategory, type VehicleSort } from "@dealer/shared";
import { useEffect, useState } from "react";
import { formatCategory } from "../lib/format.js";

export interface FilterValues {
  q: string;
  category: VehicleCategory | "";
  minPrice: string;
  maxPrice: string;
  sort: VehicleSort;
}

interface FilterBarProps {
  values: FilterValues;
  search: string;
  onSearchChange(value: string): void;
  onChange(patch: Partial<FilterValues>): void;
  onReset(): void;
  isFiltered: boolean;
}

const searchIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" strokeLinecap="round" />
  </svg>
);

export function FilterBar({
  values,
  search,
  onSearchChange,
  onChange,
  onReset,
  isFiltered,
}: FilterBarProps) {
  const [minPrice, setMinPrice] = useState(values.minPrice);
  const [maxPrice, setMaxPrice] = useState(values.maxPrice);

  // Keep the price inputs in sync when the URL changes (back button, reset).
  useEffect(() => {
    setMinPrice(values.minPrice);
    setMaxPrice(values.maxPrice);
  }, [values.minPrice, values.maxPrice]);

  function commitPrice() {
    if (minPrice !== values.minPrice || maxPrice !== values.maxPrice) {
      onChange({ minPrice, maxPrice });
    }
  }

  return (
    <section aria-label="Filter inventory" className="mt-8 border-y border-line py-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-md">
          <span className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted">
            {searchIcon}
          </span>
          <label htmlFor="vehicle-search" className="sr-only">
            Search by make or model
          </label>
          <input
            id="vehicle-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search make or model…"
            className="h-11 w-full rounded-md border border-line bg-panel pl-10 pr-3 text-sm text-ink placeholder:text-muted/60 transition focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange({ category: "" })}
            aria-pressed={values.category === ""}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              values.category === ""
                ? "border-accent bg-accent text-accent-ink"
                : "border-line text-muted hover:border-accent/50 hover:text-ink"
            }`}
          >
            All
          </button>
          {VEHICLE_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onChange({ category })}
              aria-pressed={values.category === category}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                values.category === category
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line text-muted hover:border-accent/50 hover:text-ink"
              }`}
            >
              {formatCategory(category)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted">
              Price
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">
                $
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                onBlur={commitPrice}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                aria-label="Minimum price in dollars"
                placeholder="Min"
                className="h-9 w-24 rounded-md border border-line bg-panel pl-6 pr-2 text-xs text-ink placeholder:text-muted/60 focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <span className="text-xs text-muted/60" aria-hidden="true">
              –
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">
                $
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                onBlur={commitPrice}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                aria-label="Maximum price in dollars"
                placeholder="Max"
                className="h-9 w-24 rounded-md border border-line bg-panel pl-6 pr-2 text-xs text-ink placeholder:text-muted/60 focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="vehicle-sort"
              className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted"
            >
              Sort
            </label>
            <select
              id="vehicle-sort"
              value={values.sort}
              onChange={(event) => onChange({ sort: event.target.value as VehicleSort })}
              className="h-9 rounded-md border border-line bg-panel px-2.5 pr-8 text-xs text-ink focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>

        {isFiltered ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent underline-offset-4 hover:underline"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-3.5"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
            Clear filters
          </button>
        ) : null}
      </div>
    </section>
  );
}
