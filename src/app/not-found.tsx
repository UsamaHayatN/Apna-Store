import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
        404 — Page Not Found
      </p>
      <h1 className="mt-3 text-2xl sm:text-3xl font-light tracking-tight text-neutral-900 uppercase">
        The Requested Piece Does Not Exist
      </h1>
      <p className="mt-3 max-w-md text-xs text-neutral-500 leading-relaxed">
        The item, collection, or address you are looking for has been retired, relocated, or is temporarily unavailable.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/">
          <Button variant="primary">Return to Storefront</Button>
        </Link>
        <Link href="/shop">
          <Button variant="outline">Explore Catalog</Button>
        </Link>
      </div>
    </div>
  );
}
