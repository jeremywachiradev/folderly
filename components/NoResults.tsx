// components/NoResults.tsx
import React, { useContext } from "react";
import { View, Text, Image, useColorScheme } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useTheme } from "react-native-paper";

import images from "@/constants/images";

const NoResults = () => {
  const theme = useTheme(); // Using theme from react-native-paper
  const colorScheme = useColorScheme(); // This will now be used to adjust non-react-native-paper components

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: theme.colors.background }}>
      <ExpoImage
        source={images.noResult}
        style={{ width: '80%', height: 192, resizeMode: 'contain' }}
      />
      <Text
        style={{
          fontSize: 24,
          fontFamily: theme.fonts.bold,
          marginTop: 20,
          color: theme.colors.onSurface, // Using text color from theme
        }}
      >
        No Media Found
      </Text>
      <Text
        style={{
          fontSize: 16,
          fontFamily: theme.fonts.regular,
          color: theme.colors.onSurface, // Consistent text color
          textAlign: 'center',
          marginTop: 8,
        }}
      >
        Try adjusting your search or selecting different apps.
      </Text>
    </View>
  );
};

export default NoResults;
