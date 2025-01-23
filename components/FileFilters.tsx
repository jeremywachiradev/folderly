import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface FileFilter {
  id: string;
  name: string;
  icon: string;
  types: string[];
}

export const FILE_FILTERS: FileFilter[] = [
  {
    id: 'all',
    name: 'All',
    icon: 'documents-outline',
    types: [],
  },
  {
    id: 'images',
    name: 'Images',
    icon: 'image-outline',
    types: ['jpg', 'jpeg', 'png', 'gif'],
  },
  {
    id: 'videos',
    name: 'Videos',
    icon: 'videocam-outline',
    types: ['mp4', 'mov', 'avi'],
  },
  {
    id: 'audio',
    name: 'Audio',
    icon: 'musical-notes-outline',
    types: ['mp3', 'wav', 'm4a'],
  },
  {
    id: 'documents',
    name: 'Documents',
    icon: 'document-text-outline',
    types: ['pdf', 'doc', 'docx', 'txt'],
  },
];

interface FileFiltersProps {
  selectedFilter: string;
  onFilterChange: (filterId: string) => void;
}

export default function FileFilters({ selectedFilter, onFilterChange }: FileFiltersProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-b border-zinc-100 dark:border-zinc-800"
    >
      <View className="flex-row p-2">
        {FILE_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            onPress={() => onFilterChange(filter.id)}
            className={`flex-row items-center px-4 py-2 rounded-full mr-2 ${
              selectedFilter === filter.id
                ? 'bg-primary-500'
                : 'bg-zinc-100 dark:bg-zinc-800'
            }`}
          >
            <Ionicons
              name={filter.icon as any}
              size={18}
              className={selectedFilter === filter.id ? 'text-white' : 'text-black-400 dark:text-zinc-400'}
            />
            <Text
              className={`ml-2 font-rubik ${
                selectedFilter === filter.id
                  ? 'text-white'
                  : 'text-black-400 dark:text-zinc-400'
              }`}
            >
              {filter.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
} 