import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Heart } from "lucide-react-native";
import { useFavorites } from "../src/store/favorites";
import { useTheme } from "../src/theme";
import { Button, Empty } from "../src/components/ui";
import { PokemonGrid } from "../src/components/PokemonCard";
import { SavedResources } from "../src/features/catalog/SavedResources";
export default function Favorites() {
  const { colors: c, ui } = useTheme();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const ids = useFavorites((state) => state.ids);
  return (
    <View style={[ui.page, width < 650 && { padding: 18 }]}>
      <View style={ui.between}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[ui.label, { color: c.accent, marginBottom: 7 }]}>
            SUA PRÓPRIA COLEÇÃO
          </Text>
          <Text style={ui.title}>Os seus favoritos</Text>
          <Text style={[ui.subtitle, { marginTop: 6 }]}>
            Aqueles que conquistaram um lugar na sua jornada.
          </Text>
        </View>
        <Heart size={30} color="#E4B9B6" strokeWidth={1.2} />
      </View>
      <SavedResources
        pokemonCount={ids.length}
        pokemonContent={
          <>
            <Text style={ui.sectionTitle}>Pokémon favoritos</Text>
            <Text style={ui.subtitle}>{ids.length} Pokémon favoritos</Text>
            <Text style={ui.subtitle}>
              Favoritar também curte o Pokémon na comunidade. Ao remover dos
              favoritos, sua curtida também é removida.
            </Text>
            {!ids.length ? (
              <Empty
                title="Sua coleção começa com um coração"
                description="Entre na sua conta e toque no coração de qualquer Pokémon para favoritar e curtir."
                action={
                  <Button onPress={() => router.push("/pokedex")}>
                    Encontrar favoritos
                  </Button>
                }
              />
            ) : (
              <PokemonGrid
                records={ids.map((id) => ({
                  name: `Pokémon ${id}`,
                  url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
                }))}
              />
            )}
          </>
        }
      />
    </View>
  );
}
