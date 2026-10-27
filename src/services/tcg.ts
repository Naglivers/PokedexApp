import { z } from "zod";
import type { Language } from "../i18n/locale";

const briefSchema = z.object({
  id: z.string(),
  name: z.string(),
  localId: z.string(),
  image: z.string().nullish(),
});
export type TcgCard = z.infer<typeof briefSchema>;
const detailSchema = briefSchema.extend({
  rarity: z.string().nullish(),
  illustrator: z.string().nullish(),
  hp: z.number().nullish(),
  set: z.object({ id: z.string(), name: z.string() }).optional(),
});
const languageCodes: Record<Language, string> = {
  pt: "pt-br",
  en: "en",
  es: "es",
  ja: "ja",
  "zh-Hans": "en",
};
export const tcgLanguage = (language: Language) => languageCodes[language];
export function tcgLanguagesForLocale<T extends { value: string }>(
  languages: T[],
  locale: Language,
): T[] {
  const western = locale === "pt" || locale === "en" || locale === "es";
  return western
    ? languages.filter(
        (language) =>
          !["ja", "zh-tw", "zh-cn", "ko", "id", "th"].includes(language.value),
      )
    : languages;
}
async function request(path: string, signal?: AbortSignal) {
  const response = await fetch("https://api.tcgdex.net/v2/" + path, {
    signal: signal ?? AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw Object.assign(
      new Error("Não foi possível carregar as cartas. Tente novamente."),
      { status: response.status },
    );
  return response.json();
}
export async function getPokemonCards(
  dexId: number,
  language: string,
  signal?: AbortSignal,
) {
  if (!Number.isInteger(dexId) || dexId < 1 || dexId > 20000)
    throw new Error("Espécie inválida.");
  const search = new URLSearchParams({ dexId: "eq:" + dexId });
  const cards = z
    .array(briefSchema)
    .parse(await request(language + "/cards?" + search, signal));
  return { cards, language };
}

export async function getTcgSets(language: string, signal?: AbortSignal) {
  return z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        logo: z.string().nullish(),
        symbol: z.string().nullish(),
      }),
    )
    .parse(await request(language + "/sets", signal));
}

// O endpoint ordena pelo lançamento mesmo quando o resumo omite a data.
export async function getTcgSetsByRelease(
  language: string,
  signal?: AbortSignal,
) {
  return z
    .array(collectionSchema)
    .parse(
      await request(
        language + "/sets?sort:field=releaseDate&sort:order=DESC",
        signal,
      ),
    );
}

// Ordem das eras do TCG; coleções de uma mesma era usam a data da API.
export function tcgSeriesOrder(id: string) {
  const order = [
    "base",
    "gym",
    "neo",
    "lc",
    "ecard",
    "np",
    "ex",
    "pcg",
    "dp",
    "pl",
    "hgss",
    "col",
    "bw",
    "xy",
    "sm",
    "swsh",
    "sv",
    "me",
    "mega",
  ];
  const rank = order.indexOf(id.toLowerCase());
  return rank < 0 ? -1 : rank;
}
export async function getTcgCard(
  id: string,
  language: string,
  signal?: AbortSignal,
) {
  return detailSchema.parse(
    await request(language + "/cards/" + encodeURIComponent(id), signal),
  );
}
export function cardImage(card: TcgCard, high = false) {
  if (!card.image || !/^https:\/\/assets\.tcgdex\.net\//.test(card.image))
    return undefined;
  return card.image.replace(/\/$/, "") + (high ? "/high.png" : "/low.png");
}

const collectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().nullish(),
  symbol: z.string().nullish(),
  cardCount: z
    .object({ total: z.number().optional(), official: z.number().optional() })
    .optional(),
});
const seriesSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().nullish(),
});
export type TcgCollection = z.infer<typeof collectionSchema>;
export type TcgSeries = z.infer<typeof seriesSchema>;
export async function getTcgSeries(language: string, signal?: AbortSignal) {
  return z
    .array(seriesSchema)
    .parse(await request(language + "/series", signal));
}
export async function getTcgSeriesDetail(
  id: string,
  language: string,
  signal?: AbortSignal,
) {
  return seriesSchema
    .extend({ sets: z.array(collectionSchema) })
    .parse(
      await request(language + "/series/" + encodeURIComponent(id), signal),
    );
}
export async function getTcgSet(
  id: string,
  language: string,
  signal?: AbortSignal,
) {
  return collectionSchema
    .extend({ cards: z.array(briefSchema) })
    .parse(await request(language + "/sets/" + encodeURIComponent(id), signal));
}
export function tcgAsset(value?: string | null) {
  if (!value || !/^https:\/\/assets\.tcgdex\.net\//.test(value))
    return undefined;
  return /\.(png|webp|jpg)$/i.test(value) ? value : value + ".png";
}
