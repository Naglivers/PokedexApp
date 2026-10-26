import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Heart } from "lucide-react-native";
import { useFavorites } from "../src/store/favorites";
import { colors as c, ui } from "../src/theme";
import { Button, Empty } from "../src/components/ui";
import { PokemonGrid } from "../src/components/PokemonCard";
export default function Favorites() {
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
      <Text style={ui.subtitle}>
        {ids.length} Pokémon salvos neste dispositivo
      </Text>
      {!ids.length ? (
        <Empty
          title="Sua coleção começa com um coração"
          description="Toque no coração de qualquer Pokémon para encontrá-lo aqui, mesmo depois de fechar o app."
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
    </View>
  );
}
