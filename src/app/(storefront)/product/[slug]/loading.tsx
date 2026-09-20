export default function ProductLoading() {
  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center gap-4 py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-950" />
          <span className="text-[11px] font-medium tracking-widest uppercase text-neutral-500">
            Loading product...
          </span>
        </div>
      </div>
    </div>
  );
}
