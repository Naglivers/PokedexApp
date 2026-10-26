import { QueryClient, queryOptions } from "@tanstack/react-query";
import { getPokemon, getResourceList } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (count, error) => count < 1 && !String(error).includes("404"),
    },
  },
});
export const pokemonOptions = (id: string | number) =>
  queryOptions({
    queryKey: ["pokemon-detail", String(id)],
    queryFn: ({ signal }) => getPokemon(id, signal),
  });
// Names and URLs only: full records load for visible cards.
export const indexOptions = (resource: string) =>
  queryOptions({
    queryKey: ["index", resource],
    queryFn: ({ signal }) => getResourceList(resource, 10000, 0, signal),
    staleTime: 24 * 60 * 60 * 1000,
  });
