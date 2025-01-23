// Home.tsx
import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCategories } from '@/lib/category-provider';
import { useTheme } from '@/lib/theme-provider';
import { Card, Text, EmptyState, Loading } from '@/components/ui';

export default function CategoriesScreen() {
  const router = useRouter();
  const { categories, isLoading } = useCategories();
  const { isDarkMode } = useTheme();

  const handleAddCategory = () => {
    router.push('/category/new');
  };

  const handleCategoryPress = (id: string) => {
    router.push(`/category/${id}`);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-neutral-50 dark:bg-neutral-900">
        <Loading fullScreen text="Loading categories..." />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      {categories.length === 0 ? (
        <EmptyState
          icon="folder-outline"
          title="No Categories Yet"
          description="Create categories to organize your files and folders."
          action={{
            label: "Create Category",
            icon: "add-circle-outline",
            onPress: handleAddCategory,
          }}
        />
      ) : (
        <ScrollView
          className="flex-1 p-4"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row flex-wrap -mx-2">
            {categories.map((category) => (
              <View key={category.id} className="w-1/2 px-2 mb-4">
                <TouchableOpacity
                  onPress={() => handleCategoryPress(category.id)}
                  activeOpacity={0.7}
                >
                  <Card
                    variant="elevated"
                    className="p-4"
                    style={{
                      backgroundColor: isDarkMode 
                        ? `${category.color}15`
                        : `${category.color}10`,
                      borderColor: isDarkMode 
                        ? `${category.color}30`
                        : `${category.color}20`,
                      borderWidth: 1,
                    }}
                  >
                    <View className="flex-row items-center mb-3">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{ 
                          backgroundColor: isDarkMode 
                            ? `${category.color}25`
                            : `${category.color}15`
                        }}
                      >
                        <Ionicons
                          name="folder"
                          size={20}
                          color={category.color}
                        />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text
                          variant="body"
                          weight="medium"
                          numberOfLines={1}
                          className="text-neutral-900 dark:text-white"
                        >
                          {category.name}
                        </Text>
                        <Text
                          variant="caption"
                          className="text-neutral-600 dark:text-neutral-400"
                        >
                          {category.directories.length} folders
                        </Text>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <TouchableOpacity
        onPress={handleAddCategory}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-600 rounded-full items-center justify-center shadow-lg"
        style={{
          shadowColor: isDarkMode ? '#0077ff' : '#0077ff',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.4 : 0.25,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

