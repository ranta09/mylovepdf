/**
 * PageSkeleton
 * Shown via React Suspense while a lazy-loaded tool page chunk is fetching.
 * Matches the general structure of ToolLayout so the layout shift is minimal.
 */
const PageSkeleton = () => {
  return (
    <div className="min-h-screen bg-background animate-pulse" aria-hidden="true">
      {/* Navbar placeholder */}
      <div className="h-16 border-b border-border bg-card/80 backdrop-blur-md" />

      {/* Content area */}
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-24 flex flex-col items-center gap-8">
        {/* Hero title skeleton */}
        <div className="space-y-3 w-full flex flex-col items-center">
          <div className="h-8 w-64 rounded-xl bg-secondary/70" />
          <div className="h-4 w-96 max-w-full rounded-lg bg-secondary/50" />
        </div>

        {/* Upload zone skeleton */}
        <div className="w-full max-w-xl h-52 rounded-2xl border-2 border-dashed border-border bg-secondary/20 flex flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 rounded-full bg-secondary/60" />
          <div className="h-4 w-40 rounded-lg bg-secondary/50" />
          <div className="h-3 w-28 rounded bg-secondary/40" />
        </div>

        {/* Feature pills skeleton */}
        <div className="flex flex-wrap justify-center gap-3">
          {[100, 120, 90, 110, 95].map((w, i) => (
            <div key={i} className="h-7 rounded-full bg-secondary/50" style={{ width: w }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;
