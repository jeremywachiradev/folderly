import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/lib/theme-provider';

interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
}

export function Loading({ text, fullScreen = false, size = 'large' }: LoadingProps) {
  const { isDarkMode } = useTheme();

  return (
    <View
      className={`
        items-center justify-center
        ${fullScreen ? 'flex-1 bg-neutral-50 dark:bg-neutral-900' : 'p-4'}
      `}
    >
      <ActivityIndicator
        size={size}
        color={isDarkMode ? '#94a3b8' : '#64748b'}
      />
      {text && (
        <Text
          variant="body"
          className="text-neutral-600 dark:text-neutral-400 mt-4 text-center"
        >
          {text}
        </Text>
      )}
    </View>
  );
} 