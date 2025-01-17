import { View, Text } from 'react-native';
import React from 'react';
import { useTheme } from 'react-native-paper';

const explore = () => {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
      <Text style={{ color: theme.colors.onBackground }}>explore</Text> 
    </View>
  );
};

export default explore;

