import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Empty } from "../src/components/ui";
export default function NotFound() {
  const router = useRouter();
  return (
    <View>
      <Empty
        title="Esse caminho ainda não foi descoberto"
        description="A página não existe. Continue sua jornada na Pokédex."
        action={
          <Button onPress={() => router.replace("/")}>Voltar ao início</Button>
        }
      />
    </View>
  );
}
