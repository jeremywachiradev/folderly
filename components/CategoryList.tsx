import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category, getCategories, deleteCategory } from '../lib/categoryManager';
import { useRouter } from 'expo-router';

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const loadedCategories = await getCategories();
      setCategories(loadedCategories);
    } catch (error) {
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This won't delete the actual files.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(category.id);
              await loadCategories();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete category');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScrollView className="flex-1">
        {categories.length === 0 ? (
          <View className="flex-1 justify-center items-center p-4">
            <Text className="text-gray-500 text-center">
              No categories yet. Create one to get started!
            </Text>
          </View>
        ) : (
          <View className="p-4 space-y-4">
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                className="bg-white rounded-lg p-4 shadow-sm"
                onPress={() => router.push(`/category/${category.id}`)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center space-x-3">
                    <View
                      style={{ backgroundColor: category.color }}
                      className="w-4 h-4 rounded-full"
                    />
                    <View>
                      <Text className="font-medium text-lg">{category.name}</Text>
                      <Text className="text-gray-500">
                        {category.directories.length} directories
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteCategory(category)}
                    className="p-2"
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-blue-500 w-14 h-14 rounded-full justify-center items-center shadow-lg"
        onPress={() => router.push('/category/new')}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
} 