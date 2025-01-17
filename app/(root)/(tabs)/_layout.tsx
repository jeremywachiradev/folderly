import { Tabs } from "expo-router";
import { Text, View, useColorScheme } from "react-native";
import { Ionicons } from '@expo/vector-icons'; 

import { useGlobalContext } from "@/lib/global-provider";

const TabIcon = ({
  focused,
  iconName,
  title,
  colorScheme
}) => (
  <View className="flex-1 mt-3 flex flex-col items-center">
    <Ionicons
      name={iconName}
      size={24}
      color={focused ? (colorScheme === 'dark' ? "primary.300" : "black.200") : "black.200"}
    />
    <Text
      className={`${focused ? "text-primary-300 font-rubik-medium" : "text-black-200 font-rubik"} text-xs w-full text-center mt-1`}
    >
      {title}
    </Text>
  </View>
);

const TabsLayout = () => {
  const { theme } = useGlobalContext();
  const colorScheme = useColorScheme(); // React Native hook to get the system theme

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          position: "absolute",
          borderTopColor: "primary.200",
          borderTopWidth: 1,
          minHeight: 70,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName="home" title="Home" colorScheme={colorScheme} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName="search" title="Explore" colorScheme={colorScheme} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName="person" title="Profile" colorScheme={colorScheme} />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
