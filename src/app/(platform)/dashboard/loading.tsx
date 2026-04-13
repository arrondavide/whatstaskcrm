export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-7 w-40 animate-pulse rounded-lg bg-gray-800" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-800" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-800" />
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-gray-800" />
            <div className="mt-2 h-4 w-28 animate-pulse rounded bg-gray-800" />
          </div>
        ))}
      </div>

      {/* Activity skeleton */}
      <div className="rounded-xl border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-5 py-4">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-800" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-gray-800/50 px-5 py-3">
            <div className="h-8 w-8 animate-pulse rounded-md bg-gray-800" />
            <div className="flex-1">
              <div className="h-4 w-48 animate-pulse rounded bg-gray-800" />
              <div className="mt-1 h-3 w-24 animate-pulse rounded bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
