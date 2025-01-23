import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Category, createCategory, updateCategory } from '../lib/categoryManager';
import { AndroidDirectory } from '../lib/androidDirectories';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/lib/theme-provider';

interface CategoryFormProps {
  category?: Category;
  isEditing?: boolean;
}

const DEFAULT_COLORS = [
  '#FF3B30', // Red
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#34C759', // Green
  '#007AFF', // Blue
  '#5856D6', // Purple
  '#AF52DE', // Pink
  '#000000', // Black
];

export default function CategoryForm({ category, isEditing = false }: CategoryFormProps) {
  const { isDarkMode } = useTheme();
  const [name, setName] = useState(category?.name || '');
  const [selectedColor, setSelectedColor] = useState(category?.color || DEFAULT_COLORS[0]);
  const [directories, setDirectories] = useState<AndroidDirectory[]>(category?.directories || []);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkForSelectedDirectory();
  }, []);

  const checkForSelectedDirectory = async () => {
    try {
      const selectedDirJson = await AsyncStorage.getItem('@folderly/selected_directory');
      if (selectedDirJson) {
        const selectedDir = JSON.parse(selectedDirJson) as AndroidDirectory;
        setDirectories(prev => {
          // Check if directory already exists
          if (prev.some(dir => dir.path === selectedDir.path)) {
            return prev;
          }
          return [...prev, selectedDir];
        });
        // Clear the selected directory
        await AsyncStorage.removeItem('@folderly/selected_directory');
      }
    } catch (error) {
      console.error('Error checking for selected directory:', error);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      setLoading(true);
      if (isEditing && category) {
        await updateCategory(category.id, {
          name: name.trim(),
          color: selectedColor,
          directories
        });
      } else {
        await createCategory(name.trim(), selectedColor, directories);
      }
      router.back();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDirectory = () => {
    router.push({
      pathname: '/(root)/directory-picker'
    });
  };

  const handleRemoveDirectory = (path: string) => {
    setDirectories(prev => prev.filter(dir => dir.path !== path));
  };

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-neutral-900' : 'bg-gray-50'}`}>
      <ScrollView className="flex-1 p-4">
        <View className="space-y-4">
          {/* Name Input */}
          <View>
            <Text className={`mb-2 ${isDarkMode ? 'text-neutral-300' : 'text-gray-600'}`}>
              Category Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter category name"
              placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
              className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-neutral-800 text-white' : 'bg-white text-neutral-900'
              }`}
            />
          </View>

          {/* Color Selection */}
          <View>
            <Text className={`mb-2 ${isDarkMode ? 'text-neutral-300' : 'text-gray-600'}`}>
              Category Color
            </Text>
            <View className="flex-row flex-wrap gap-4">
              {DEFAULT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full ${
                    selectedColor === color ? 'border-4 border-neutral-300' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </View>
          </View>

          {/* Directories */}
          <View>
            <Text className={`mb-2 ${isDarkMode ? 'text-neutral-300' : 'text-gray-600'}`}>
              Directories
            </Text>
            <View className="space-y-2">
              {directories.map((dir) => (
                <View
                  key={dir.path}
                  className={`flex-row items-center justify-between p-4 rounded-lg ${
                    isDarkMode ? 'bg-neutral-800' : 'bg-white'
                  }`}
                >
                  <Text
                    className={`flex-1 ${isDarkMode ? 'text-neutral-100' : 'text-neutral-900'}`}
                    numberOfLines={1}
                  >
                    {dir.path}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveDirectory(dir.path)}
                    className="ml-2"
                  >
                    <Ionicons
                      name="close-circle"
                      size={24}
                      color={isDarkMode ? '#ef4444' : '#dc2626'}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleAddDirectory}
              className={`mt-2 p-4 rounded-lg border-2 border-dashed ${
                isDarkMode
                  ? 'border-neutral-700 active:bg-neutral-800'
                  : 'border-gray-300 active:bg-gray-100'
              }`}
            >
              <Text
                className={`text-center ${
                  isDarkMode ? 'text-neutral-300' : 'text-gray-600'
                }`}
              >
                Add Directory
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View className={`p-4 border-t ${
        isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'
      }`}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className={`p-4 rounded-lg ${
            isDarkMode
              ? 'bg-primary-600 active:bg-primary-700'
              : 'bg-primary-500 active:bg-primary-600'
          } ${loading ? 'opacity-50' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white text-center font-medium">
              {isEditing ? 'Update Category' : 'Create Category'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
} 