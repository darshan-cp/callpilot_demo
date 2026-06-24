import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const DEFAULT_PAGE_SIZE = 20;

interface TablePaginationProps {
  page: number;
  pageSize?: number;
  total: number;
  itemLabel: string;
  filtered?: boolean;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}

export function getPaginationRange(page: number, pageSize: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * pageSize, total);
  return { totalPages, rangeStart, rangeEnd };
}

export function TablePagination({
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  total,
  itemLabel,
  filtered = false,
  isLoading = false,
  onPageChange,
}: TablePaginationProps) {
  const { totalPages, rangeStart, rangeEnd } = getPaginationRange(page, pageSize, total);
  const plural = total === 1 ? itemLabel : `${itemLabel}s`;

  if (!isLoading && total === 0) return null;

  return (
    <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
      {isLoading && total === 0 ? (
        <Skeleton className="h-4 w-72 max-w-full" />
      ) : (
        <p className="text-sm text-muted-foreground">
          Showing {rangeStart}–{rangeEnd} of {total} {plural}
          {filtered ? " (filtered)" : ""}
          {" · "}
          Page {page} of {totalPages}
          {" · "}
          {pageSize} per page
        </p>
      )}
      {totalPages > 1 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1 || isLoading}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || isLoading}
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
