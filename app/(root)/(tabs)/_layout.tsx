import React from 'react';
import { Tabs } from "expo-router";
import { View } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from "@/lib/theme-provider";
import { Text, Logo } from "@/components/ui";

interface TabIconProps {
  focused: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
}

function TabIcon({ focused, iconName, title }: TabIconProps) {
  const { isDarkMode } = useTheme();

  return (
    <View className="flex-1 flex flex-col items-center justify-center">
      <View className="h-7 flex items-center justify-center">
        <Ionicons
          name={focused ? iconName : `${iconName}-outline` as keyof typeof Ionicons.glyphMap}
          size={26}
          color={focused ? '#0077ff' : isDarkMode ? '#94a3b8' : '#64748b'}
        />
      </View>
      {focused && (
        <Text
          variant="body-sm"
          weight="medium"
          color="primary"
          className="mt-1 truncate max-w-[80px]"
          numberOfLines={1}
        >
          {title}
        </Text>
      )}
    </View>
  );
}

function LogoTitle() {
  const { isDarkMode } = useTheme();
  return (
    <View className="px-4">
      <Logo size="sm" variant="horizontal" />
    </View>
  );
}

export default function TabsLayout() {
  const { isDarkMode } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
          borderTopColor: isDarkMode ? '#334155' : '#e2e8f0',
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#0077ff',
        tabBarInactiveTintColor: isDarkMode ? '#94a3b8' : '#64748b',
        headerStyle: {
          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
        },
        headerTitleStyle: {
          color: isDarkMode ? '#ffffff' : '#0f172a',
          fontFamily: 'Rubik-Medium',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => <LogoTitle />,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              iconName="folder"
              title="Categories"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          headerTitle: 'Explore',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              iconName="compass"
              title="Explore"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerTitle: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              iconName="person"
              title="Profile"
            />
          ),
        }}
      />
    </Tabs>
  );
}
