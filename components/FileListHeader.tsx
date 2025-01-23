import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type SortOption = 'name' | 'date' | 'size' | 'type';

interface SortConfig {
  by: SortOption;
  ascending: boolean;
}

interface FileListHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortConfig: SortConfig;
  onSortChange: (config: SortConfig) => void;
}

const SORT_OPTIONS: { id: SortOption; label: string; icon: string }[] = [
  { id: 'name', label: 'Name', icon: 'text' },
  { id: 'date', label: 'Date', icon: 'calendar' },
  { id: 'size', label: 'Size', icon: 'archive' },
  { id: 'type', label: 'Type', icon: 'documents' },
];

export default function FileListHeader({
  searchQuery,
  onSearchChange,
  sortConfig,
  onSortChange,
}: FileListHeaderProps) {
  const [showSortOptions, setShowSortOptions] = useState(false);

  const handleSortPress = (sortBy: SortOption) => {
    if (sortConfig.by === sortBy) {
      // Toggle direction if same sort option
      onSortChange({ by: sortBy, ascending: !sortConfig.ascending });
    } else {
      // Default to ascending for new sort option
      onSortChange({ by: sortBy, ascending: true });
    }
    setShowSortOptions(false);
  };

  return (
    <View className="bg-white dark:bg-zinc-900">
      {/* Search Bar */}
      <View className="p-4">
        <View className="flex-row items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-2">
          <Ionicons
            name="search"
            size={20}
            className="text-black-400 dark:text-zinc-400 mr-2"
          />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Search files..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 font-rubik text-black-300 dark:text-white"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')}>
              <Ionicons
                name="close-circle"
                size={20}
                className="text-black-400 dark:text-zinc-400"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sort Options */}
      <View className="px-4 pb-2 flex-row justify-between items-center">
        <View className="flex-row items-center">
          <Text className="text-sm font-rubik text-black-400 dark:text-zinc-400 mr-2">
            Sort by:
          </Text>
          <TouchableOpacity
            onPress={() => setShowSortOptions(!showSortOptions)}
            className="flex-row items-center"
          >
            <Text className="text-sm font-rubik-medium text-black-300 dark:text-white mr-1">
              {SORT_OPTIONS.find(opt => opt.id === sortConfig.by)?.label}
            </Text>
            <Ionicons
              name={sortConfig.ascending ? 'chevron-up' : 'chevron-down'}
              size={16}
              className="text-primary-500"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort Dropdown */}
      {showSortOptions && (
        <View className="absolute top-full left-0 right-0 bg-white dark:bg-zinc-900 shadow-lg z-10 rounded-b-lg">
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              onPress={() => handleSortPress(option.id)}
              className="flex-row items-center px-4 py-3 border-b border-zinc-100 dark:border-zinc-800"
            >
              <Ionicons
                name={option.icon as any}
                size={18}
                className="text-black-400 dark:text-zinc-400 mr-3"
              />
              <Text className="flex-1 font-rubik text-black-300 dark:text-white">
                {option.label}
              </Text>
              {sortConfig.by === option.id && (
                <Ionicons
                  name={sortConfig.ascending ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  className="text-primary-500"
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
} 