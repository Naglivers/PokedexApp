import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { currentLanguage } from "../../../i18n/locale";
import type { ForumPost } from "../../../services/forum";

async function translate(text: string, language: string, signal: AbortSignal) {
  if (new TextEncoder().encode(text).length > 500)
    throw new Error("translation_length");
  const url =
    "https://api.mymemory.translated.net/get?" +
    new URLSearchParams({
      q: text,
      langpair: "en|" + (language === "zh-Hans" ? "zh-CN" : language),
    }).toString();
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("translation_unavailable");
  const data = await response.json();
  const result = data?.responseData?.translatedText;
  if (
    Number(data?.responseStatus) !== 200 ||
    data?.quotaFinished ||
    typeof result !== "string" ||
    !result.trim() ||
    result.length > 1500
  )
    throw new Error("translation_unavailable");
  return result
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function useNewsText(post?: ForumPost) {
  const language = currentLanguage();
  const [original, setOriginal] = useState(false);
  const title = post?.title ?? "";
  const summary = (post?.body ?? post?.excerpt ?? "").split("\n\nFonte:")[0];
  const query = useQuery({
    queryKey: ["news-translation", language, post?.id, title, summary],
    enabled: !!post?.imported && language !== "en" && !original,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
    queryFn: async ({ signal }) => {
      const key = "news-translation-v1:" + post!.id + ":" + language;
      try {
        const cached = JSON.parse((await AsyncStorage.getItem(key)) ?? "null");
        if (
          cached?.sourceTitle === title &&
          cached?.sourceSummary === summary &&
          typeof cached.title === "string" &&
          typeof cached.summary === "string"
        )
          return cached;
      } catch {
        /* Cache is optional. */
      }
      const result = {
        sourceTitle: title,
        sourceSummary: summary,
        title: await translate(title, language, signal),
        summary: await translate(summary, language, signal),
      };
      try {
        await AsyncStorage.setItem(key, JSON.stringify(result));
      } catch {
        /* Keep in-memory translation. */
      }
      return result;
    },
  });
  return {
    title: !original && query.data ? query.data.title : title,
    body:
      !original && query.data
        ? query.data.summary
        : (post?.body ?? post?.excerpt ?? ""),
    translated: !original && !!query.data,
    pending: query.isFetching,
    failed: query.isError && !original,
    canTranslate: !!post?.imported && language !== "en",
    original,
    toggle: () => setOriginal((value) => !value),
  };
}
