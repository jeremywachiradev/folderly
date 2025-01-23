import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Category } from '../lib/categoryManager';
import FileList from './FileList';
import { Text } from '@/components/ui';

interface CategoryViewProps {
  category: Category;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function CategoryView({ category, onEdit, onDelete }: CategoryViewProps) {
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setRefreshing(true);
    // Add any additional refresh logic here
    setRefreshing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete
        }
      ]
    );
  };

  const directories = category.directories.map(dir => dir.path);

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      {/* Category Header */}
      <View className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 p-4">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center space-x-3">
            <View
              style={{ backgroundColor: category.color }}
              className="w-10 h-10 rounded-full justify-center items-center"
            >
              <Ionicons name="folder" size={24} color="white" />
            </View>
            <View>
              <Text variant="h4" weight="medium">{category.name}</Text>
              <Text
                variant="caption"
                className="text-neutral-600 dark:text-neutral-400"
              >
                {category.directories.length} {category.directories.length === 1 ? 'directory' : 'directories'}
              </Text>
            </View>
          </View>
          <View className="flex-row space-x-4">
            <TouchableOpacity onPress={onEdit}>
              <Ionicons name="pencil" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Directory List */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
        >
          <View className="flex-row space-x-2">
            {category.directories.map((dir) => (
              <View
                key={dir.path}
                className="bg-neutral-100 dark:bg-neutral-700 rounded-lg px-3 py-2 flex-row items-center space-x-2"
              >
                <Ionicons
                  name="folder-outline"
                  size={16}
                  color={category.color}
                />
                <Text
                  variant="body-sm"
                  className="text-neutral-700 dark:text-neutral-300"
                >
                  {dir.name}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Files */}
      <FileList
        directories={directories}
        onRefresh={handleRefresh}
      />
    </View>
  );
} 