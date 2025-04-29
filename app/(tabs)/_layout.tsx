import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-provider';

export default function TabsLayout() {
  const { isDarkMode } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0077ff',
        tabBarInactiveTintColor: isDarkMode ? '#a3a3a3' : '#737373',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
          borderTopColor: isDarkMode ? '#1e293b' : '#e5e5e5',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="save-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
