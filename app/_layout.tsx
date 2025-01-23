import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { ThemeProvider, useTheme } from "@/lib/theme-provider";

import "./global.css";
import { AuthProvider } from "@/lib/auth-provider";
import { CategoryProvider } from "@/lib/category-provider";
import { SettingsProvider } from "@/lib/settings-provider";

function AppContent() {
  const { theme, isDarkMode } = useTheme();

  return (
    <PaperProvider theme={theme}>
      <StatusBar translucent style="light" backgroundColor="#0f172a" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
          },
          headerStyle: {
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
          },
          headerTitleStyle: {
            color: isDarkMode ? '#f1f5f9' : '#0f172a',
            fontFamily: 'Rubik-Medium',
          },
        }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="(root)" />
      </Stack>
    </PaperProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <CategoryProvider>
          <SettingsProvider>
            <AppContent />
          </SettingsProvider>
        </CategoryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
