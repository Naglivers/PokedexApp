import React, { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Braces, Database } from "lucide-react-native";
import { colors as c, ui } from "../src/theme";
import {
  Button,
  Empty,
  ErrorState,
  Loading,
  Pagination,
  SearchInput,
  Select,
} from "../src/components/ui";
import {
  getResource,
  getResourceCatalog,
  getResourceList,
  idFromUrl,
} from "../src/services/api";
import { resourceLabels } from "../src/constants/pokemon";
import { pretty } from "../src/utils/pokemon";
import { ResourceData } from "../src/components/ResourceData";

export default function Explorer() {
  const { width } = useWindowDimensions();
  const [resource, setResource] = useState("pokemon");
  const [input, setInput] = useState("");
  const [record, setRecord] = useState("");
  const [page, setPage] = useState(0);
  const [raw, setRaw] = useState(false);
  const catalog = useQuery({
    queryKey: ["resource-catalog"],
    queryFn: ({ signal }) => getResourceCatalog(signal),
  });
  const list = useQuery({
    queryKey: ["explorer-list", resource, page],
    queryFn: ({ signal }) => getResourceList(resource, 20, page * 20, signal),
    enabled: !record,
  });
  const detail = useQuery({
    queryKey: ["resource", resource, record],
    queryFn: ({ signal }) => getResource(resource, record, signal),
    enabled: !!record,
  });
  const submit = () => {
    if (input.trim()) {
      setRecord(input.trim().toLowerCase().replace(/^#/, ""));
      setRaw(false);
    }
  };
  return (
    <View style={[ui.page, width < 650 && { padding: 18 }]}>
      <View>
        <View style={[ui.row, { marginBottom: 8 }]}>
          <Database size={15} color={c.accent} />
          <Text style={[ui.label, { color: c.accent }]}>
            TODOS OS CAMINHOS LEVAM A UMA DESCOBERTA
          </Text>
        </View>
        <Text style={ui.title}>API Explorer</Text>
        <Text style={[ui.subtitle, { marginTop: 5 }]}>
          Explore cada recurso, campo e conexão da PokéAPI, no seu ritmo.
        </Text>
      </View>
      <View style={ui.panel}>
        <View style={[ui.row, { flexWrap: "wrap" }]}>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Select
              label="Escolher recurso"
              value={resource}
              options={Object.keys(catalog.data ?? resourceLabels)
                .sort()
                .map((key) => ({
                  value: key,
                  label: `${resourceLabels[key] ?? pretty(key)} · ${key}`,
                }))}
              onChange={(value) => {
                setResource(value);
                setInput("");
                setRecord("");
                setPage(0);
              }}
            />
          </View>
          <View style={{ flex: 1, minWidth: 170 }}>
            <SearchInput
              value={input}
              onChange={setInput}
              placeholder="Nome ou ID do registro"
              onSubmit={submit}
            />
          </View>
          <Button onPress={submit} disabled={!input.trim()}>
            Consultar
          </Button>
        </View>
        <View
          style={[
            ui.row,
            {
              backgroundColor: "#F5F6F9",
              padding: 12,
              borderRadius: 7,
              flexWrap: "wrap",
            },
          ]}
        >
          <Text style={{ color: c.green, fontSize: 10, fontWeight: "800" }}>
            GET
          </Text>
          <Text
            selectable
            style={{ color: "#8490A3", fontSize: 10, flexShrink: 1 }}
          >
            https://pokeapi.co/api/v2/{resource}/
            {record ? `${record}/` : `?limit=20&offset=${page * 20}`}
          </Text>
        </View>
      </View>
      {!!record && (
        <View style={ui.between}>
          <Button
            small
            variant="ghost"
            icon={<ArrowLeft size={13} color={c.muted} />}
            onPress={() => {
              setRecord("");
              setInput("");
            }}
          >
            Voltar à lista
          </Button>
          <Button
            small
            variant="outline"
            icon={<Braces size={14} color={c.muted} />}
            onPress={() => setRaw(!raw)}
          >
            {raw ? "Visualização estruturada" : "Ver JSON"}
          </Button>
        </View>
      )}
      {record ? (
        detail.isPending ? (
          <Loading />
        ) : detail.isError ? (
          <ErrorState retry={() => detail.refetch()} />
        ) : (
          <>
            <Text style={ui.sectionTitle}>
              {pretty(detail.data.name ?? `${resource} #${record}`)}
            </Text>
            {raw ? (
              <View style={[ui.panel, { backgroundColor: c.navy }]}>
                <Text
                  selectable
                  style={{
                    fontSize: 11,
                    lineHeight: 19,
                    color: "#CBD7E7",
                    fontFamily: "monospace",
                  }}
                >
                  {JSON.stringify(detail.data, null, 2)}
                </Text>
              </View>
            ) : (
              <ResourceData data={detail.data} />
            )}
          </>
        )
      ) : list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <ErrorState retry={() => list.refetch()} />
      ) : (
        <>
          <View style={ui.between}>
            <Text style={ui.sectionTitle}>
              {resourceLabels[resource] ?? pretty(resource)}
            </Text>
            <Text style={ui.subtitle}>
              {list.data.count.toLocaleString("pt-BR")} registros
            </Text>
          </View>
          <View style={[ui.panel, { padding: 0, gap: 0, overflow: "hidden" }]}>
            {list.data.results.map((item, index) => (
              <Pressable
                key={item.url}
                accessibilityRole="button"
                onPress={() => {
                  const id = idFromUrl(item.url);
                  setRecord(id);
                  setInput(id);
                  setRaw(false);
                }}
                style={({
                  hovered,
                }: {
                  hovered?: boolean;
                  pressed?: boolean;
                }) => ({
                  padding: 17,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 18,
                  borderTopColor: c.line,
                  borderTopWidth: index ? 1 : 0,
                  backgroundColor: hovered ? "#FAFBFD" : "#FFF",
                })}
              >
                <Text style={{ fontSize: 10, color: "#A4ADBA", width: 40 }}>
                  #{idFromUrl(item.url).padStart(4, "0")}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: c.ink,
                    flex: 1,
                  }}
                >
                  {pretty(item.name)}
                </Text>
                <ArrowUpRight size={14} color={c.muted} />
              </Pressable>
            ))}
          </View>
          <Pagination
            page={page}
            total={list.data.count}
            pageSize={20}
            setPage={setPage}
          />
        </>
      )}
    </View>
  );
}
