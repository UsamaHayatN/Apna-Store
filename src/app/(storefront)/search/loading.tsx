export default function SearchLoading() {
  return (
    <div className="bg-white min-h-screen">
      <div className="border-b border-[#E5E5E5] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="h-3 w-20 bg-neutral-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="border-b border-[#E5E5E5] bg-[#F5F5F5] py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-6 w-64 bg-neutral-200 rounded animate-pulse mb-2" />
          <div className="h-3 w-80 bg-neutral-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center gap-4 py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-950" />
          <span className="text-[11px] font-medium tracking-widest uppercase text-neutral-500">
            Searching catalog...
          </span>
        </div>
      </div>
    </div>
  );
}
