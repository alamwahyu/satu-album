import Link from "next/link";
import { cn } from "@/lib/utils";

export function EventFilters({ filters, selected }: { filters: readonly string[]; selected: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {filters.map((filter) => (
        <Link
          key={filter}
          href={filter === "All" ? "/dashboard" : `/dashboard?status=${filter}`}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition",
            selected.toLowerCase() === filter.toLowerCase()
              ? "border-stone-950 bg-stone-950 text-white"
              : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
          )}
        >
          {filter}
        </Link>
      ))}
    </div>
  );
}
