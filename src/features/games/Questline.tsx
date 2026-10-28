import React, { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Award,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Flag,
  Swords,
} from "lucide-react-native";
import { Button, Loading, Pagination, SearchInput } from "../../components/ui";
import { useTheme } from "../../theme";
import { useAuth } from "../auth/AuthProvider";
import {
  gameQuests,
  type GameQuest,
  type QuestAction,
} from "../../services/gameQuests";

const categories = [
  { key: "story", title: "História principal", Icon: Flag },
  { key: "postgame", title: "Pós-jogo", Icon: Swords },
  { key: "side", title: "Missões secundárias", Icon: Circle },
] as const;

export function Questline({ game }: { game: string }) {
  const { session } = useAuth();
  return (
    <QuestlineContent
      key={(session?.user.id ?? "guest") + ":" + game}
      game={game}
    />
  );
}
function QuestlineContent({ game }: { game: string }) {
  const { session, loading } = useAuth();
  const { ui, colors: c } = useTheme();
  const router = useRouter();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const key = ["questline", session?.user.id ?? "guest", game];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) =>
      gameQuests(session?.token ?? null, game, undefined, signal),
    enabled: !loading,
    retry: false,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
  const mutation = useMutation({
    mutationFn: (action: QuestAction) =>
      gameQuests(session!.token, game, action),
    onSuccess: (data) => {
      client.setQueryData(key, data);
      if (session) {
        void client.invalidateQueries({
          queryKey: ["quest-badges", session.user.nickname.toLowerCase()],
        });
        void client.invalidateQueries({
          queryKey: ["public-profile", session.user.nickname.toLowerCase()],
        });
      }
    },
  });
  if (loading || query.isPending)
    return <Loading text="Carregando Questline…" />;
  if (query.isError)
    return (
      <View style={{ gap: 12 }}>
        <Text style={{ color: c.warningText }}>{query.error.message}</Text>
        <Button
          variant="outline"
          onPress={() => {
            void query.refetch();
          }}
        >
          Tentar novamente
        </Button>
      </View>
    );
  const data = query.data;
  const percent = data.total
    ? Math.round((data.completed / data.total) * 100)
    : 0;
  return (
    <View style={{ gap: 20 }}>
      <View
        style={{
          backgroundColor: data.badge ? c.goldSoft : c.surfaceAlt,
          borderColor: data.badge ? c.gold : c.line,
          borderWidth: 1,
          borderRadius: 16,
          padding: 18,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Award size={34} color={data.badge ? c.gold : c.muted} />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={[ui.sectionTitle, { fontSize: 18 }]}>
              {data.badge ? "Jogo concluído!" : "Sua jornada até a insígnia"}
            </Text>
            <Text style={ui.subtitle}>
              {data.badge
                ? "Insígnia de conclusão disponível no seu perfil."
                : "Complete todas as etapas desta checklist para conquistar a insígnia."}
            </Text>
          </View>
          <Text
            style={{
              color: data.badge ? c.gold : c.accent,
              fontSize: 22,
              fontWeight: "800",
            }}
          >
            {percent}%
          </Text>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: data.total || 1,
            now: data.completed,
          }}
          style={{
            height: 9,
            borderRadius: 5,
            backgroundColor: c.line,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${percent}%`,
              backgroundColor: data.badge ? c.gold : c.accent,
            }}
          />
        </View>
        <Text style={ui.subtitle}>
          {data.completed} / {data.total} etapas concluídas
        </Text>
        {!data.reviewed && (
          <Text style={{ color: c.warningText, lineHeight: 21 }}>
            Lista em revisão: o progresso e a insígnia consideram as etapas
            disponíveis aqui. Outras missões ainda podem ser adicionadas.
          </Text>
        )}
      </View>
      {!session && (
        <View style={{ gap: 10 }}>
          <Text style={ui.subtitle}>
            Entre para marcar as etapas e guardar seu progresso na sua conta.
          </Text>
          <Button small onPress={() => router.push("/login")}>
            Login
          </Button>
        </View>
      )}
      {!!data.total && (
        <View style={{ gap: 12 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar etapa ou número da missão…"
          />
          <Button
            small
            variant={pendingOnly ? "primary" : "outline"}
            onPress={() => setPendingOnly((value) => !value)}
          >
            {pendingOnly
              ? "Mostrando apenas pendentes"
              : "Mostrar apenas pendentes"}
          </Button>
        </View>
      )}
      {categories.map((category) => {
        const quests = data.quests.filter((q) => q.category === category.key);
        return (
          <QuestCategory
            key={category.key}
            title={category.title}
            Icon={category.Icon}
            quests={quests}
            search={search}
            pendingOnly={pendingOnly}
            disabled={!session || mutation.isPending}
            onToggle={(quest) =>
              mutation.mutate({
                action: "set",
                id: quest.id,
                completed: !quest.completed,
              })
            }
          />
        );
      })}
      {!data.total && (
        <Text style={ui.subtitle}>
          A lista de missões deste jogo ainda está sendo preparada.
        </Text>
      )}
      {mutation.isPending && (
        <Text accessibilityLiveRegion="polite" style={ui.subtitle}>
          Salvando progresso…
        </Text>
      )}
      {mutation.isError && (
        <Text accessibilityRole="alert" style={{ color: c.warningText }}>
          {mutation.error.message}
        </Text>
      )}
      {(data.source || data.side_source) && (
        <View style={{ gap: 8 }}>
          <Text style={ui.subtitle}>
            A numeração acompanha a lista de missões do jogo. Algumas etapas
            exigem atualizações, presentes ou dados salvos de outros jogos.
          </Text>
          <View style={ui.wrap}>
            {data.source && (
              <Button
                small
                variant="ghost"
                onPress={() => {
                  void Linking.openURL(data.source!);
                }}
              >
                Guia da jornada ↗
              </Button>
            )}
            {data.side_source && (
              <Button
                small
                variant="ghost"
                onPress={() => {
                  void Linking.openURL(data.side_source!);
                }}
              >
                Guia das missões secundárias ↗
              </Button>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
function QuestCategory({
  title,
  Icon,
  quests,
  search,
  pendingOnly,
  disabled,
  onToggle,
}: {
  title: string;
  Icon: typeof Flag;
  quests: GameQuest[];
  search: string;
  pendingOnly: boolean;
  disabled: boolean;
  onToggle: (quest: GameQuest) => void;
}) {
  const { ui, colors: c } = useTheme();
  const [open, setOpen] = useState(true);
  const [page, setPage] = useState(0);
  const filtered = quests.filter(
    (q) =>
      (!pendingOnly || !q.completed) &&
      q.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const [previousFilter, setPreviousFilter] = useState(
    search + ":" + pendingOnly,
  );
  const filter = search + ":" + pendingOnly;
  if (filter !== previousFilter) {
    setPreviousFilter(filter);
    setPage(0);
  }
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 20) - 1),
  );
  if (!quests.length) return null;
  const done = quests.filter((q) => q.completed).length;
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 16,
          backgroundColor: c.surface,
        }}
      >
        <Icon size={20} color={done === quests.length ? c.green : c.accent} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[ui.sectionTitle, { fontSize: 16 }]}>{title}</Text>
          <Text style={ui.subtitle}>
            {done} / {quests.length}
          </Text>
        </View>
        {open ? (
          <ChevronDown size={18} color={c.muted} />
        ) : (
          <ChevronRight size={18} color={c.muted} />
        )}
      </Pressable>
      {open && (
        <View style={{ padding: 12, gap: 8, backgroundColor: c.surfaceAlt }}>
          {filtered
            .slice(currentPage * 20, (currentPage + 1) * 20)
            .map((quest) => (
              <Pressable
                key={quest.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: quest.completed, disabled }}
                accessibilityLabel={quest.title}
                disabled={disabled}
                onPress={() => onToggle(quest)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  minHeight: 60,
                  padding: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: quest.completed ? c.accent : c.line,
                  backgroundColor: quest.completed ? c.accentSoft : c.surface,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View
                  style={{
                    width: 25,
                    height: 25,
                    borderWidth: 1,
                    borderRadius: 7,
                    borderColor: quest.completed ? c.accent : c.muted,
                    backgroundColor: quest.completed ? c.accent : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {quest.completed && <Check size={18} color={c.onAccent} />}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={{
                      color: quest.completed ? c.muted : c.ink,
                      fontSize: 14,
                      lineHeight: 21,
                      textDecorationLine: quest.completed
                        ? "line-through"
                        : "none",
                    }}
                  >
                    {quest.title}
                  </Text>
                  {quest.note && (
                    <Text style={[ui.subtitle, { fontSize: 12 }]}>
                      {quest.note}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          {!filtered.length && (
            <Text style={[ui.subtitle, { padding: 12 }]}>
              {pendingOnly && done === quests.length
                ? "Todas as etapas desta categoria concluídas!"
                : "Nenhuma etapa encontrada."}
            </Text>
          )}
          {filtered.length > 20 && (
            <Pagination
              page={currentPage}
              total={filtered.length}
              pageSize={20}
              setPage={setPage}
            />
          )}
        </View>
      )}
    </View>
  );
}
