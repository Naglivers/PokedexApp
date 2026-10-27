import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Pause, Play, RotateCcw, Volume2 } from "lucide-react-native";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioPlayer,
} from "expo-audio";
import { useTheme } from "../theme";
import { Button } from "./ui";

let activePlayer: AudioPlayer | null = null;
export const isAudioUrl = (value: unknown): value is string =>
  typeof value === "string" &&
  /^https?:\/\/.+\.(?:ogg|mp3|wav|m4a|aac|flac|opus)(?:[?#].*)?$/i.test(value);

export function AudioUrlPlayer({
  uri,
  label = "Áudio",
}: {
  uri: string;
  label?: string;
}) {
  const { colors: c, ui } = useTheme();
  const player = useAudioPlayer({ uri }, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      if (activePlayer === player) activePlayer = null;
    },
    [player],
  );
  const failed = error || !!status.error;
  const loading = !failed && (!status.isLoaded || status.isBuffering);
  const toggle = async () => {
    if (busy) return;
    setError(false);
    setBusy(true);
    try {
      if (status.playing) {
        player.pause();
        return;
      }
      if (activePlayer && activePlayer !== player) activePlayer.pause();
      activePlayer = player;
      if (
        status.didJustFinish ||
        (status.duration > 0 && status.currentTime >= status.duration)
      )
        await player.seekTo(0);
      if (activePlayer === player) player.play();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const progress =
    status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;
  return (
    <View style={{ gap: 10, width: "100%" }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
        }}
      >
        {failed ? (
          <Button
            small
            variant="outline"
            icon={<RotateCcw size={14} color={c.accent} />}
            onPress={() => {
              setError(false);
              player.replace({ uri });
            }}
          >
            Tentar novamente
          </Button>
        ) : (
          <Button
            small
            disabled={loading || busy}
            icon={
              loading ? (
                <ActivityIndicator size="small" color={c.onAccent} />
              ) : status.playing ? (
                <Pause size={14} color={c.onAccent} />
              ) : (
                <Play size={14} color={c.onAccent} />
              )
            }
            onPress={() => {
              void toggle();
            }}
          >
            {loading
              ? "Carregando…"
              : status.playing
                ? "Pausar"
                : "Ouvir áudio"}
          </Button>
        )}
        <Volume2 size={17} color={status.playing ? c.accent : c.muted} />
        <Text accessibilityLiveRegion="polite" style={ui.subtitle}>
          {failed
            ? "Não foi possível reproduzir este áudio."
            : status.playing
              ? `Reproduzindo ${label.toLowerCase()}`
              : status.duration > 0
                ? `${status.duration.toFixed(1).replace(".", ",")} s`
                : "Áudio do Pokémon"}
        </Text>
      </View>
      {!failed && (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={`Reprodução: ${label}`}
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(progress * 100),
          }}
          style={{
            height: 4,
            borderRadius: 3,
            backgroundColor: c.line,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              backgroundColor: c.accent,
            }}
          />
        </View>
      )}
      <Text selectable style={[ui.subtitle, { fontSize: 10, lineHeight: 16 }]}>
        {uri}
      </Text>
    </View>
  );
}
