// components/NoResults.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NoResultsProps {
  title: string;
  subtitle: string;
}

const NoResults: React.FC<NoResultsProps> = ({ title, subtitle }) => {
  return (
    <View className="flex-1 justify-center items-center p-4">
      <View className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full justify-center items-center mb-4">
        <Ionicons
          name="folder-open-outline"
          size={32}
          className="text-primary-500"
        />
      </View>
      <Text className="text-xl font-rubik-bold text-black-300 dark:text-white text-center">
        {title}
      </Text>
      <Text className="text-base font-rubik text-black-400 dark:text-zinc-400 text-center mt-2">
        {subtitle}
      </Text>
    </View>
  );
};

export default NoResults;
