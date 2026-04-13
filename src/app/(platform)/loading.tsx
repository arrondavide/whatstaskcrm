export default function PlatformLoading() {
  return (
    <div className="space-y-6">
      {/* Title skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 animate-pulse rounded-lg bg-gray-800" />
          <div className="mt-2 h-4 w-24 animate-pulse rounded bg-gray-800" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-lg bg-gray-800" />
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-xl border border-gray-800">
        {/* Header */}
        <div className="flex gap-4 border-b border-gray-800 bg-gray-900 px-4 py-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 flex-1 animate-pulse rounded bg-gray-800" />
          ))}
        </div>
        {/* Rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-gray-800/50 px-4 py-4">
            {[...Array(5)].map((_, j) => (
              <div
                key={j}
                className="h-4 flex-1 animate-pulse rounded bg-gray-800/60"
                style={{ animationDelay: `${(i * 5 + j) * 50}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
