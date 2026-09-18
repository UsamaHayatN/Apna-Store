"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Application runtime error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">
        System Interruption
      </p>
      <h1 className="mt-3 text-2xl sm:text-3xl font-light tracking-tight text-neutral-900 uppercase">
        Unable to Load Store Experience
      </h1>
      <p className="mt-3 max-w-md text-xs text-neutral-500 leading-relaxed">
        {error.message ||
          "An unexpected condition occurred while communicating with the catalog services. Our team has been notified."}
      </p>
      <div className="mt-8 flex gap-4">
        <Button variant="primary" onClick={() => reset()}>
          Retry Operation
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Go to Homepage
        </Button>
      </div>
    </div>
  );
}
