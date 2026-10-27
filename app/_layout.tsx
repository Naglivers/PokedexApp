import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "../src/services/queries";
import { Shell } from "../src/components/Shell";
import { CommunityProvider } from "../src/features/community/CommunityProvider";
import { LocaleProvider } from "../src/i18n/Provider";
import { ThemeProvider, useTheme } from "../src/theme";
import { AuthProvider } from "../src/features/auth/AuthProvider";
export { ErrorBoundary } from "expo-router";
export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedLayout />
    </ThemeProvider>
  );
}
function ThemedLayout() {
  const { isDark, colors } = useTheme();
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocaleProvider>
          <QueryClientProvider client={queryClient}>
            <CommunityProvider>
              <Head>
                <meta name="theme-color" content={colors.bg} />
                <meta name="color-scheme" content={isDark ? "dark" : "light"} />
                <link
                  rel="icon"
                  type="image/png"
                  sizes="32x32"
                  href="/favicon-32.png"
                />
                <link
                  rel="icon"
                  type="image/png"
                  sizes="16x16"
                  href="/favicon-16.png"
                />
                <link
                  rel="apple-touch-icon"
                  sizes="180x180"
                  href="/apple-touch-icon.png"
                />
              </Head>
              <StatusBar style={isDark ? "light" : "dark"} />
              <Shell>
                <Slot />
              </Shell>
            </CommunityProvider>
          </QueryClientProvider>
        </LocaleProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
