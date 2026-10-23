import {
  VEHICLE_CATEGORIES,
  type VehicleCategory,
  type VehicleListResponse,
  type VehicleSort,
} from "@dealer/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";
import { FilterBar, type FilterValues } from "../components/FilterBar.js";
import { Pagination } from "../components/Pagination.js";
import { VehicleCard, VehicleCardSkeleton } from "../components/VehicleCard.js";
import { api, type VehicleListParams } from "../lib/api.js";
import { useDebouncedValue } from "../lib/useDebouncedValue.js";

const PAGE_SIZE = 12;

function parseCategory(raw: string | null): VehicleCategory | "" {
  return VEHICLE_CATEGORIES.find((category) => category === raw) ?? "";
}

function parseSort(raw: string | null): VehicleSort {
  if (raw === "price_asc" || raw === "price_desc" || raw === "newest") {
    return raw;
  }

  return "newest";
}

function parsePage(raw: string | null): number {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parsePrice(raw: string | null): number | undefined {
  if (!raw) {
    return undefined;
  }

  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const category = parseCategory(searchParams.get("category"));
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const sort = parseSort(searchParams.get("sort"));
  const page = parsePage(searchParams.get("page"));

  const [search, setSearch] = useState(q);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const resultsRef = useRef<HTMLDivElement>(null);

  // The URL is the source of truth: back/forward and shared links restore the view.
  useEffect(() => {
    setSearch(q);
  }, [q]);

  const setParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          mutate(next);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setParams((next) => {
        if (value.trim()) {
          next.set("q", value);
        } else {
          next.delete("q");
        }

        next.delete("page");
      });
    },
    [setParams],
  );

  const handleFilterChange = useCallback(
    (patch: Partial<FilterValues>) => {
      setParams((next) => {
        if (patch.category !== undefined) {
          if (patch.category) {
            next.set("category", patch.category);
          } else {
            next.delete("category");
          }
        }

        if (patch.minPrice !== undefined) {
          if (patch.minPrice) {
            next.set("minPrice", patch.minPrice);
          } else {
            next.delete("minPrice");
          }
        }

        if (patch.maxPrice !== undefined) {
          if (patch.maxPrice) {
            next.set("maxPrice", patch.maxPrice);
          } else {
            next.delete("maxPrice");
          }
        }

        if (patch.sort !== undefined) {
          if (patch.sort === "newest") {
            next.delete("sort");
          } else {
            next.set("sort", patch.sort);
          }
        }

        next.delete("page");
      });
    },
    [setParams],
  );

  const handleReset = useCallback(() => {
    setSearch("");
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setParams((next) => {
        if (nextPage <= 1) {
          next.delete("page");
        } else {
          next.set("page", String(nextPage));
        }
      });

      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [setParams],
  );

  const filters = useMemo<VehicleListParams>(
    () => ({
      q: debouncedSearch || undefined,
      category: category || undefined,
      minPrice: parsePrice(minPrice),
      maxPrice: parsePrice(maxPrice),
      sort,
      page,
      limit: PAGE_SIZE,
    }),
    [debouncedSearch, category, minPrice, maxPrice, sort, page],
  );

  const { data, isPending, isError, error, refetch, isFetching } = useQuery<VehicleListResponse>({
    queryKey: ["vehicles", filters],
    queryFn: () => api.listVehicles(filters),
    placeholderData: keepPreviousData,
  });

  const isFiltered =
    q.trim() !== "" || category !== "" || minPrice !== "" || maxPrice !== "" || sort !== "newest";

  const filterValues: FilterValues = { q, category, minPrice, maxPrice, sort };
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-accent">
            <span className="h-px w-6 bg-accent" aria-hidden="true" />
            The lot / {new Date().getFullYear()} lineup
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[0.98] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
            Find your <span className="text-accent">next drive.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            {user ? `${user.name.split(" ")[0]}, every` : "Every"} car below is on the lot right
            now. Filter the catalogue, check the stock count, and reserve with confidence.
          </p>
        </div>

        <dl className="flex shrink-0 divide-x divide-line border-y border-line py-3 lg:border-y-0 lg:py-0">
          <div className="pr-6">
            <dt className="text-[0.625rem] uppercase tracking-[0.18em] text-muted">Vehicles</dt>
            <dd className="mt-1 font-display text-2xl font-semibold text-ink">
              {data ? total : "—"}
            </dd>
          </div>
          <div className="px-6">
            <dt className="text-[0.625rem] uppercase tracking-[0.18em] text-muted">Body styles</dt>
            <dd className="mt-1 font-display text-2xl font-semibold text-ink">
              {VEHICLE_CATEGORIES.length}
            </dd>
          </div>
          <div className="pl-6">
            <dt className="text-[0.625rem] uppercase tracking-[0.18em] text-muted">Status</dt>
            <dd className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold text-accent">
              <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
              Live
            </dd>
          </div>
        </dl>
      </section>

      <FilterBar
        values={filterValues}
        search={search}
        onSearchChange={handleSearchChange}
        onChange={handleFilterChange}
        onReset={handleReset}
        isFiltered={isFiltered}
      />

      <div ref={resultsRef} className="scroll-mt-24 pt-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p aria-live="polite" className="text-xs uppercase tracking-[0.18em] text-muted">
            {isPending
              ? "Loading inventory"
              : `${total} vehicle${total === 1 ? "" : "s"}${isFiltered ? " matching" : ""}`}
          </p>
          {isFetching && !isPending ? (
            <span className="flex items-center gap-2 text-[0.625rem] uppercase tracking-[0.18em] text-muted">
              <span
                aria-hidden="true"
                className="size-3 animate-spin rounded-full border border-muted/40 border-t-accent"
              />
              Updating
            </span>
          ) : null}
        </div>

        {isError ? (
          <div
            role="alert"
            className="rounded-card border border-red-400/30 bg-red-950/20 px-6 py-12 text-center"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <VehicleCardSkeleton key={index} />
            ))}
          </div>
        ) : data && data.data.length === 0 ? (
          <div className="rounded-card border border-dashed border-line bg-panel/40 px-6 py-16 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full border border-line text-muted">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="size-5"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold text-ink">
              No vehicles match these filters
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              Try a different body style, a wider price range, or a shorter search.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-6 rounded-md border border-accent px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent hover:text-accent-ink"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data?.data.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>

            {data ? (
              <Pagination
                page={data.meta.page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
