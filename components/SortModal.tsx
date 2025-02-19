import React from 'react';
import { View, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { SortOption } from '@/types';

interface SortModalProps {
  visible: boolean;
  onClose: () => void;
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string; icon: string }[] = [
  { value: 'date-desc', label: 'Date (Newest First)', icon: 'time-outline' },
  { value: 'date-asc', label: 'Date (Oldest First)', icon: 'time-outline' },
  { value: 'name-asc', label: 'Name (A to Z)', icon: 'text-outline' },
  { value: 'name-desc', label: 'Name (Z to A)', icon: 'text-outline' },
  { value: 'type-asc', label: 'Type (A to Z)', icon: 'documents-outline' },
  { value: 'type-desc', label: 'Type (Z to A)', icon: 'documents-outline' },
  { value: 'size-desc', label: 'Size (Largest First)', icon: 'archive-outline' },
  { value: 'size-asc', label: 'Size (Smallest First)', icon: 'archive-outline' },
];

export function SortModal({ visible, onClose, currentSort, onSortChange }: SortModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white dark:bg-neutral-900 rounded-t-3xl">
          <View className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <View className="flex-row justify-between items-center">
              <Text variant="h4" weight="semibold" className="text-neutral-900 dark:text-white">
                Sort & Filter
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#999999" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="p-4">
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  onSortChange(option.value);
                  onClose();
                }}
                className="flex-row items-center py-3"
              >
                <Ionicons
                  name={option.icon as any}
                  size={24}
                  color={currentSort === option.value ? '#0077ff' : '#999999'}
                />
                <Text
                  variant="body"
                  className={`ml-3 ${
                    currentSort === option.value
                      ? 'text-primary-600'
                      : 'text-neutral-900 dark:text-white'
                  }`}
                >
                  {option.label}
                </Text>
                {currentSort === option.value && (
                  <View className="ml-auto">
                    <Ionicons name="checkmark" size={24} color="#0077ff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
} 