import { useState } from "react";

export type SortOrder = "asc" | "desc";

export function useTableSort<T extends string>(
  defaultSortBy: T,
  defaultSortOrder: SortOrder = "desc",
  onChange?: () => void,
) {
  const [sortBy, setSortBy] = useState<T>(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  const toggleSort = (column: T) => {
    if (sortBy === column) {
      setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    onChange?.();
  };

  return {
    sortBy,
    sortOrder,
    toggleSort,
    sortParams: { sortBy, sortOrder },
  };
}

export function compareSortValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }

  return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
}

export function sortRows<T>(
  rows: T[],
  getValue: (row: T) => unknown,
  sortOrder: SortOrder,
): T[] {
  return [...rows].sort((left, right) => {
    const cmp = compareSortValues(getValue(left), getValue(right));
    return sortOrder === "asc" ? cmp : -cmp;
  });
}
