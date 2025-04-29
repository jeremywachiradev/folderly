import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '@/lib/theme-provider';

interface HeaderAction {
  icon: string;
  label: string;
  onPress: () => void;
}

interface HeaderProps {
  title: string;
  showBack?: boolean;
  action?: HeaderAction;
  onBackPress?: () => void;
}

export function Header({ title, showBack, action, onBackPress }: HeaderProps) {
  const router = useRouter();
  const { isDarkMode } = useTheme();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
      <View className="flex-row items-center justify-between px-4 h-16 safe-top">
        <View className="flex-row items-center flex-1">
          {showBack && (
            <TouchableOpacity
              onPress={handleBackPress}
              className="mr-3 p-2 -ml-2 rounded-full active:bg-neutral-100 dark:active:bg-neutral-700"
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={isDarkMode ? '#f1f5f9' : '#0f172a'}
              />
            </TouchableOpacity>
          )}
          <Text
            variant="h4"
            weight="medium"
            className="flex-1"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {action && (
          <TouchableOpacity
            onPress={action.onPress}
            className="ml-4 p-2 -mr-2 rounded-full active:bg-neutral-100 dark:active:bg-neutral-700"
          >
            <Ionicons
              name={action.icon as any}
              size={24}
              color={isDarkMode ? '#f1f5f9' : '#0f172a'}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
} 