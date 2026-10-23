interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange(page: number): void;
}

function pageWindow(page: number, totalPages: number): number[] {
  const size = Math.min(5, totalPages);
  const start = Math.max(1, Math.min(page - 2, totalPages - size + 1));
  return Array.from({ length: size }, (_, index) => start + index);
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = pageWindow(page, totalPages);

  return (
    <nav aria-label="Inventory pagination" className="mt-10 flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center gap-2 rounded-md border border-line px-3.5 py-2 text-xs font-medium text-muted transition hover:border-accent/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="size-3.5"
          aria-hidden="true"
        >
          <path d="M15 6 9 12l6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Previous
      </button>

      <div className="flex items-center gap-1">
        {pages.map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => onPageChange(number)}
            aria-current={number === page ? "page" : undefined}
            className={`grid size-8 place-items-center rounded-md border text-xs font-medium transition ${
              number === page
                ? "border-accent bg-accent text-accent-ink"
                : "border-transparent text-muted hover:border-line hover:text-ink"
            }`}
          >
            {number}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-2 rounded-md border border-line px-3.5 py-2 text-xs font-medium text-muted transition hover:border-accent/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted"
      >
        Next
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="size-3.5"
          aria-hidden="true"
        >
          <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </nav>
  );
}
