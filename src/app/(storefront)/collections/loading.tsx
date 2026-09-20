export default function CollectionsLoading() {
  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="border-b border-[#E5E5E5] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="h-3 w-20 bg-neutral-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="bg-[#111111] text-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="h-3 w-32 bg-white/10 rounded animate-pulse mb-3" />
          <div className="h-8 w-64 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-950" />
          <span className="text-[11px] font-medium tracking-widest uppercase text-neutral-500">
            Loading collections...
          </span>
        </div>
      </div>
    </div>
  );
}
