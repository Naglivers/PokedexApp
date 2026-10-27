import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { setPokemonLike } from "../../services/community";
import { useFavorites } from "../../store/favorites";
import { useAuth } from "../auth/AuthProvider";
import { useCommunity } from "./CommunityProvider";

// The heart and the like button share the same server-backed reaction.
export function usePokemonReaction(pokemonId: number) {
  const { session } = useAuth();
  const { authenticated, likedIds } = useCommunity();
  const client = useQueryClient();
  const router = useRouter();
  const localFavorite = useFavorites((state) => state.ids.includes(pokemonId));
  const liked = session ? likedIds.includes(pokemonId) : localFavorite;
  const mutationKey = ["community", "reaction", session?.user.id, pokemonId];
  const pending = useIsMutating({ mutationKey }) > 0;
  const mutation = useMutation({
    mutationKey,
    mutationFn: (desired: boolean) => {
      if (!session) throw new Error("Entre para curtir e favoritar.");
      return setPokemonLike(pokemonId, desired, session.token);
    },
    onSuccess: async (data) => {
      client.setQueryData<number[]>(
        ["community", "my-likes", session?.user.id],
        (old = []) =>
          data.liked
            ? [...new Set([...old, pokemonId])]
            : old.filter((id) => id !== pokemonId),
      );
      useFavorites.getState().setFavorite(pokemonId, data.liked);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["community", "counts"] }),
        client.invalidateQueries({ queryKey: ["community", "overview"] }),
      ]);
    },
  });
  return {
    liked,
    pending,
    disabled: pending || (!!session && !authenticated),
    error: mutation.error,
    toggle: () => {
      if (!session) {
        router.push("/login");
        return;
      }
      if (authenticated && !pending) mutation.mutate(!liked);
    },
  };
}
