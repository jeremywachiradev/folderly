import { useEffect } from 'react';
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { Provider as PaperProvider } from 'react-native-paper';
import { ThemeProvider, useTheme } from "@/lib/theme-provider";
import { AuthProvider } from "@/lib/auth-provider";
import { CategoryProvider } from "@/lib/category-provider";
import { SettingsProvider } from "@/lib/settings-provider";
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { DialogProvider } from '@/components/ui/DialogProvider';
import "./global.css";
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function AppLayout() {
  const { theme } = useTheme();

  return (
    <PaperProvider theme={theme}>
      <DialogProvider>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: {
              backgroundColor: 'transparent',
            },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(root)" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack>
        <Toast />
      </DialogProvider>
    </PaperProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Rubik-Light': require('../assets/fonts/Rubik-Light.ttf'),
    'Rubik-Regular': require('../assets/fonts/Rubik-Regular.ttf'),
    'Rubik-Medium': require('../assets/fonts/Rubik-Medium.ttf'),
    'Rubik-SemiBold': require('../assets/fonts/Rubik-SemiBold.ttf'),
    'Rubik-Bold': require('../assets/fonts/Rubik-Bold.ttf'),
    'Rubik-ExtraBold': require('../assets/fonts/Rubik-ExtraBold.ttf'),
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <CategoryProvider>
              <BottomSheetModalProvider>
                <AppLayout />
              </BottomSheetModalProvider>
            </CategoryProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
