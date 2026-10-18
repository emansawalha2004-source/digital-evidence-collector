import { useMemo, useState } from "react";
import type { PaginatedMeta } from "../types/api";
import { DEFAULT_PAGE_SIZE } from "../utils/constants";

interface UsePaginationResult {
  page: number;
  limit: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  resetPage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  totalPages: number;
  totalItems: number;
  goPrevious: () => void;
  goNext: () => void;
}

export function usePagination(
  meta?: PaginatedMeta,
  initialLimit = DEFAULT_PAGE_SIZE
): UsePaginationResult {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);

  const totalPages = useMemo(() => meta?.pages || 1, [meta?.pages]);
  const totalItems = useMemo(() => meta?.total || 0, [meta?.total]);

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return {
    page,
    limit,
    setPage,
    setLimit,
    resetPage: () => setPage(1),
    canGoPrevious,
    canGoNext,
    totalPages,
    totalItems,
    goPrevious: () => setPage((current) => Math.max(1, current - 1)),
    goNext: () => setPage((current) => Math.min(totalPages, current + 1))
  };
}