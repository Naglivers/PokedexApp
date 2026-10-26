import React, { forwardRef, useSyncExternalStore } from "react";
import { Pressable as NativePressable, Text as NativeText, TextInput as NativeTextInput } from "react-native";
import { subscribeTranslations, translated, translationSnapshot } from "./translation";

function collect(children: React.ReactNode): string[] {
  return React.Children.toArray(children).filter((child): child is string => typeof child === "string");
}
function useTranslations(texts: (string | undefined)[]) {
  useSyncExternalStore(subscribeTranslations, translationSnapshot, () => 0);
  return texts.map((text) => text ? translated(text) : text);
}
export const Text = forwardRef<React.ElementRef<typeof NativeText>, React.ComponentProps<typeof NativeText>>((props, ref) => {
  const children = React.Children.toArray(props.children);
  // Join neighboring text fragments, preserving nested styled Text and icons.
  const joined: React.ReactNode[] = [];
  children.forEach((child) => {
    const last = joined.length - 1;
    if ((typeof child === "string" || typeof child === "number") && typeof joined[last] === "string") joined[last] += String(child);
    else joined.push(typeof child === "number" ? String(child) : child);
  });
  useTranslations([...collect(joined), props.accessibilityLabel]);
  return <NativeText {...props} ref={ref} accessibilityLabel={props.accessibilityLabel ? translated(props.accessibilityLabel) : undefined}>
    {joined.map((child) => typeof child === "string" ? translated(child) : child)}
  </NativeText>;
});
Text.displayName = "LocalizedText";
export const TextInput = forwardRef<React.ElementRef<typeof NativeTextInput>, React.ComponentProps<typeof NativeTextInput>>((props, ref) => {
  const [placeholder, label] = useTranslations([props.placeholder, props.accessibilityLabel]);
  return <NativeTextInput {...props} ref={ref} placeholder={placeholder} accessibilityLabel={label} />;
});
TextInput.displayName = "LocalizedTextInput";
export const Pressable = forwardRef<React.ElementRef<typeof NativePressable>, React.ComponentProps<typeof NativePressable>>((props, ref) => {
  const [label, hint] = useTranslations([props.accessibilityLabel, props.accessibilityHint]);
  return <NativePressable {...props} ref={ref} accessibilityLabel={label} accessibilityHint={hint} />;
});
Pressable.displayName = "LocalizedPressable";
