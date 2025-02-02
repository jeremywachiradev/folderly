import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { FileItem as FileItemType } from '@/types';
import { formatFileSize, formatDate, getFileIcon } from '@/lib/utils';

interface FileItemProps {
  file: FileItemType;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function FileItem({ file, selected, onPress, onLongPress }: FileItemProps) {
  const { name, type, size, modifiedTime, categoryId } = file;
  const { icon, color } = getFileIcon(type);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      className={`flex-row items-center ${
        selected ? 'bg-primary-50 dark:bg-primary-900' : ''
      }`}
    >
      <View
        className="w-10 h-10 rounded-lg items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View className="ml-3 flex-1">
        <Text
          variant="body"
          weight="medium"
          numberOfLines={1}
          className="text-neutral-900 dark:text-white"
        >
          {file.displayName || name}
        </Text>
        <View className="flex-row items-center mt-1">
          <Text variant="caption" className="text-neutral-600 dark:text-neutral-400">
            {formatFileSize(size)}
          </Text>
          <View className="w-1 h-1 rounded-full bg-neutral-400 mx-2" />
          <Text variant="caption" className="text-neutral-600 dark:text-neutral-400">
            {formatDate(modifiedTime)}
          </Text>
        </View>
      </View>
      {selected && (
        <View className="ml-2">
          <Ionicons name="checkmark-circle" size={24} color="#0077ff" />
        </View>
      )}
    </TouchableOpacity>
  );
} 