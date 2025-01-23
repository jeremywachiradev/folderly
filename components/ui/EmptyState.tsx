import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '@/lib/theme-provider';

interface EmptyStateAction {
  label: string;
  icon?: string;
  onPress: () => void;
}

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: EmptyStateAction;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const { isDarkMode } = useTheme();

  return (
    <View className="flex-1 items-center justify-center p-8">
      <View className="w-24 h-24 rounded-full bg-primary-50 dark:bg-primary-900/20 items-center justify-center mb-8">
        <Ionicons
          name={icon as any}
          size={48}
          color={isDarkMode ? '#60a5fa' : '#2563eb'}
        />
      </View>

      <Text
        variant="h3"
        weight="semibold"
        className="text-center mb-3 text-neutral-900 dark:text-white"
      >
        {title}
      </Text>

      <Text
        variant="body"
        weight="medium"
        className="text-neutral-600 dark:text-neutral-300 text-center mb-8 max-w-[280px]"
      >
        {description}
      </Text>

      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          className="flex-row items-center bg-primary-600 active:bg-primary-700 px-6 py-3 rounded-full shadow-sm"
        >
          {action.icon && (
            <Ionicons
              name={action.icon as any}
              size={20}
              color="#ffffff"
              style={{ marginRight: 8 }}
            />
          )}
          <Text
            variant="body"
            weight="semibold"
            className="text-white"
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
} 