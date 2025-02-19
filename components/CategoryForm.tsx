import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Category, createCategory, updateCategory } from '../lib/categoryManager';
import { AndroidDirectory, hasStoragePermissions, requestAndroidPermissions, openAndroidFilesSettings } from '../lib/androidDirectories';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/lib/theme-provider';
import { StorageAccessFramework } from 'expo-file-system';
import { showDialog, showToast } from '@/lib/notifications';

interface CategoryFormProps {
  category?: Category;
  isEditing?: boolean;
  loading?: boolean;
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

// Ensure the SAF URI is properly formatted
const formatSAFUri = (uri: string): string => {
  // If it's already a proper SAF URI, return as is
  if (uri.includes('tree/') && !uri.includes('document/')) {
    return uri;
  }
  
  // Convert document URI to tree URI if needed
  return uri.replace('document/', 'tree/');
};

export default function CategoryForm({ category, isEditing = false, loading = false }: CategoryFormProps) {
  const { isDarkMode } = useTheme();
  const [name, setName] = useState(category?.name || '');
  const [selectedColor, setSelectedColor] = useState(category?.color || DEFAULT_COLORS[0]);
  const [directories, setDirectories] = useState<AndroidDirectory[]>(
    category?.directories.map(dir => ({
      ...dir,
      path: dir.path.startsWith('content://') ? formatSAFUri(dir.path) : dir.path
    })) || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const router = useRouter();

  // Update form when category data is loaded
  useEffect(() => {
    if (category) {
      setName(category.name);
      setSelectedColor(category.color);
      setDirectories(
        category.directories.map(dir => ({
          ...dir,
          path: dir.path.startsWith('content://') ? formatSAFUri(dir.path) : dir.path
        }))
      );
    }
  }, [category]);

  // Check for selected directories when the form comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkForSelectedDirectory();
    }, [])
  );

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const hasPerms = await hasStoragePermissions();
    setHasPermission(hasPerms);
  };

  const requestPermissions = async () => {
    const { granted } = await requestAndroidPermissions();
    if (granted) {
      setHasPermission(true);
      return true;
    }
    return false;
  };

  const checkForSelectedDirectory = async () => {
    try {
      const selectedDirsJson = await AsyncStorage.getItem('@folderly/selected_directories');
      if (selectedDirsJson) {
        const selectedDirs = JSON.parse(selectedDirsJson) as AndroidDirectory[];
        // Format the paths if they're SAF URIs
        const formattedDirs = selectedDirs.map(dir => ({
          ...dir,
          path: dir.path.startsWith('content://') ? formatSAFUri(dir.path) : dir.path
        }));
        
        setDirectories(prev => {
          // Filter out any duplicates
          const newDirs = formattedDirs.filter(newDir => 
            !prev.some(existingDir => existingDir.path === newDir.path)
          );
          return [...prev, ...newDirs];
        });
        
        // Clear the selected directories
        await AsyncStorage.removeItem('@folderly/selected_directories');
      }

      // Restore form state if it exists
      const formStateJson = await AsyncStorage.getItem('@folderly/category_form_state');
      if (formStateJson) {
        const formState = JSON.parse(formStateJson);
        if (!isEditing) {  // Only restore state if not in editing mode
          setName(formState.name || '');
          setSelectedColor(formState.selectedColor || DEFAULT_COLORS[0]);
        }
      }
    } catch (error) {
      console.error('Error checking for selected directories:', error);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast('error', 'Please enter a category name');
      return;
    }

    if (directories.length === 0) {
      showToast('error', 'Please select at least one directory');
      return;
    }

    try {
      setIsSaving(true);
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
      showToast('error', error instanceof Error ? error.message : 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDirectory = async () => {
    if (Platform.OS === 'android' && !hasPermission) {
      const granted = await requestPermissions();
      if (!granted) {
        const result = await showDialog({
          title: 'Storage Permission Required',
          message: 'This app needs storage access permission to select directories. Would you like to grant permission in settings?',
          buttons: [
            { text: 'Cancel', style: 'cancel', onPress: () => {} },
            { 
              text: 'Open Settings',
              onPress: async () => {
                await openAndroidFilesSettings();
              }
            }
          ]
        });
        return;
      }
    }

    // Save the current form state before navigating
    try {
      const formState = {
        name,
        selectedColor,
        directories // Save current directories to restore them later
      };
      await AsyncStorage.setItem('@folderly/category_form_state', JSON.stringify(formState));
    } catch (error) {
      console.error('Error saving form state:', error);
    }

    router.push({
      pathname: '/(root)/directory-picker',
      params: {
        mode: 'multiple'
      }
    });
  };

  const handleRemoveDirectory = (path: string) => {
    setDirectories(prev => prev.filter(dir => dir.path !== path));
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={isDarkMode ? '#fff' : '#000'} />
      </View>
    );
  }

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
            <View className="flex-row justify-between items-center mb-2">
              <Text className={`${isDarkMode ? 'text-neutral-300' : 'text-gray-600'}`}>
                Directories
              </Text>
              <Text className={`${isDarkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                {directories.length} selected
              </Text>
            </View>
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
                    {dir.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveDirectory(dir.path)}
                    className="ml-2 p-2"
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={isDarkMode ? '#64748b' : '#94a3b8'}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={handleAddDirectory}
              className={`mt-2 p-4 rounded-lg border ${
                isDarkMode
                  ? 'border-neutral-700 bg-neutral-800'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <Text
                className={`text-center ${
                  isDarkMode ? 'text-neutral-300' : 'text-neutral-600'
                }`}
              >
                Add Directory
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View
        className={`p-4 border-t ${
          isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
        }`}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSaving}
          className={`p-4 rounded-lg ${
            isSaving
              ? 'bg-neutral-400'
              : 'bg-primary-600'
          }`}
        >
          <Text className="text-white text-center font-medium">
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Category'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
} 