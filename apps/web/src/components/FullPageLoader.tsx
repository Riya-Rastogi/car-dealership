export function FullPageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-4">
        <span className="relative flex size-10 items-center justify-center">
          <span className="absolute inline-flex size-10 animate-ping rounded-full bg-accent/30" />
          <span className="relative inline-flex size-4 rounded-full bg-accent" />
        </span>
        <p role="status" className="text-xs font-medium uppercase tracking-[0.3em] text-muted">
          {label}
        </p>
      </div>
    </div>
  );
}
