import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { InfoTooltip } from "@/components/InfoTooltip";
import { cn } from "@/lib/utils";
import type { SortOrder } from "@/hooks/useTableSort";

interface SortableTableHeadProps<T extends string> {
  column: T;
  sortBy: T;
  sortOrder: SortOrder;
  onSort: (column: T) => void;
  help: string;
  className?: string;
  children: React.ReactNode;
}

export function SortableTableHead<T extends string>({
  column,
  sortBy,
  sortOrder,
  onSort,
  help,
  className,
  children,
}: SortableTableHeadProps<T>) {
  const isActive = sortBy === column;
  const isRight = className?.includes("text-right");
  const isCenter = className?.includes("text-center");

  const SortIcon = !isActive ? ArrowUpDown : sortOrder === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "flex w-full items-center gap-1 text-left font-semibold transition-colors hover:text-foreground",
          isRight && "justify-end text-right",
          isCenter && "justify-center text-center",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
        aria-sort={isActive ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
      >
        <span>{children}</span>
        <SortIcon className={cn("w-3.5 h-3.5 flex-shrink-0", isActive && "text-primary")} />
        <InfoTooltip content={help} />
      </button>
    </TableHead>
  );
}
