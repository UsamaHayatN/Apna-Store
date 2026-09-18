import { Badge } from "@/components/ui/Badge";
import { ProductStatus } from "@/types";

export function ProductStatusBadge({ status }: { status: ProductStatus | string }) {
  if (status === "active") {
    return (
      <Badge variant="success" className="gap-1.5 font-semibold">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 inline-block" />
        <span>Active</span>
      </Badge>
    );
  }

  if (status === "draft") {
    return (
      <Badge variant="warning" className="gap-1.5 font-semibold">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
        <span>Draft</span>
      </Badge>
    );
  }

  return (
    <Badge variant="neutral" className="gap-1.5 font-semibold bg-neutral-200 text-neutral-600 border-neutral-300">
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 inline-block" />
      <span>Archived</span>
    </Badge>
  );
}
