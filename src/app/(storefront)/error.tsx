"use client";

import * as React from "react";
import Link from "next/link";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Storefront page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">
        Something went wrong
      </p>
      <h1 className="mt-3 text-2xl sm:text-3xl font-light tracking-tight text-neutral-900 uppercase">
        Unable to Load This Page
      </h1>
      <p className="mt-3 max-w-md text-xs text-neutral-500 leading-relaxed">
        {error.message ||
          "An unexpected error occurred while loading this page. Please try again."}
      </p>
      <div className="mt-8 flex gap-4">
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center bg-[#111111] text-white px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
        >
          Retry
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center border border-[#111111] text-[#111111] px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-[#111111] hover:text-white transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
