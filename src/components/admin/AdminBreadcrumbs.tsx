import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function AdminBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-neutral-500 mb-3">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center space-x-2">
            {index > 0 && <ChevronRight className="h-3 w-3 text-neutral-400" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-neutral-900 transition-colors uppercase tracking-wider text-[10px]"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-neutral-900 uppercase tracking-wider text-[10px]">
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
