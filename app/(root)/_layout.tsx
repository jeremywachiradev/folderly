import { Stack } from 'expo-router';
import { useTheme } from '@/lib/theme-provider';

export default function RootLayout() {
  const { isDarkMode } = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: isDarkMode ? '#171717' : '#ffffff'
        }
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="settings" />
      <Stack.Screen name="directory-picker" />
      <Stack.Screen name="upload" />
      <Stack.Screen name="category/[id]" />
      <Stack.Screen name="category/new" />
      <Stack.Screen name="properties/[id]" />
      <Stack.Screen
        name="file/[id]"
        options={{
          headerShown: true,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          contentStyle: {
            backgroundColor: isDarkMode ? '#171717' : '#ffffff'
          },
          gestureEnabled: true,
          gestureDirection: 'vertical',
          fullScreenGestureEnabled: true
        }}
      />
    </Stack>
  );
}
