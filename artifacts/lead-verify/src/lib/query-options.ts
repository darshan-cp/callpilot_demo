import { keepPreviousData } from "@tanstack/react-query";

export const paginatedQueryOptions = {
  placeholderData: keepPreviousData,
};
