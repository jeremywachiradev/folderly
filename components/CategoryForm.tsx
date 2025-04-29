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
import { AndroidDirectory, hasStoragePermissions, requestAndroidPermissions, openAndroidFilesSettings, handleMissingDirectory } from '../lib/androidDirectories';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/lib/theme-provider';
import { StorageAccessFramework } from 'expo-file-system';
import { showDialog, showToast } from '@/lib/notifications';
import { useAuth } from '@/lib/auth-provider';

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
  const { user } = useAuth();

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
      // Check if there's a selected directory in AsyncStorage
      const selectedDirJson = await AsyncStorage.getItem('@folderly/selected_directories');
      if (selectedDirJson) {
        const selectedDirs = JSON.parse(selectedDirJson);
        
        // Add each directory that's not already in the list
        const updatedDirectories = [...directories];
        let hasNewDirectories = false;
        
        for (const dirObj of selectedDirs) {
          if (!directories.some(dir => dir.path === dirObj.path)) {
            updatedDirectories.push(dirObj);
            hasNewDirectories = true;
          }
        }
        
        if (hasNewDirectories) {
          setDirectories(updatedDirectories);
        }
        
        // Clear the selected directory from AsyncStorage
        await AsyncStorage.removeItem('@folderly/selected_directories');
      }
    } catch (error) {
      
    }
  };

  const validateDirectories = async () => {
    if (directories.length === 0) return;
    
    const validatedDirs = [...directories];
    let hasInvalidDir = false;
    
    for (let i = 0; i < validatedDirs.length; i++) {
      const dir = validatedDirs[i];
      
      // Skip validation for directories that have already been validated
      if (dir.validated) continue;
      
      try {
        // For SAF URIs
        if (dir.path.startsWith('content://')) {
          try {
            await StorageAccessFramework.readDirectoryAsync(dir.path);
            validatedDirs[i] = { ...dir, validated: true };
          } catch (error) {
            
            hasInvalidDir = true;
            
            // Show a user-friendly message for default directories
            if (dir.name.includes('WhatsApp') || dir.name.includes('Telegram')) {
              showDialog({
                title: `${dir.name} Not Found`,
                message: `The default directory for ${dir.name} was not found on your device. This could be because the app is not installed or the directory structure is different on your device.`,
                buttons: [
                  {
                    text: 'Remove Directory',
                    onPress: () => {
                      setDirectories(directories.filter(d => d.path !== dir.path));
                    },
                    style: 'destructive'
                  },
                  {
                    text: 'Keep Anyway',
                    onPress: () => {
                      // Keep the directory but mark it as validated to avoid repeated checks
                      const updatedDirs = [...directories];
                      const index = updatedDirs.findIndex(d => d.path === dir.path);
                      if (index !== -1) {
                        updatedDirs[index] = { ...updatedDirs[index], validated: true };
                        setDirectories(updatedDirs);
                      }
                    }
                  }
                ]
              });
            }
          }
        }
        // For regular file paths
        else {
          // We can't directly check if a path exists without SAF
          // Just mark it as validated for now
          validatedDirs[i] = { ...dir, validated: true };
        }
      } catch (error) {
        
      }
    }
    
    if (!hasInvalidDir) {
      setDirectories(validatedDirs);
    }
  };

  useEffect(() => {
    if (directories.length > 0) {
      // Only validate directories that haven't been validated yet
      const hasUnvalidatedDirectories = directories.some(dir => !dir.validated);
      if (hasUnvalidatedDirectories) {
        validateDirectories();
      }
    }
  }, [directories]);

  const handleSubmit = async () => {
    try {
      if (!name.trim()) {
        showToast('error', 'Please enter a category name');
        return;
      }

      if (directories.length === 0) {
        showToast('error', 'Please add at least one directory');
        return;
      }

      setIsSaving(true);

      // Check if any directories are default WhatsApp or Telegram directories
      const hasDefaultDirs = directories.some(dir => 
        dir.name.includes('WhatsApp') || 
        dir.name.includes('Telegram')
      );

      // If we have default directories, validate them before saving
      if (hasDefaultDirs) {
        await validateDirectories();
      }

      if (isEditing && category) {
        await updateCategory(category.id, {
          name,
          color: selectedColor,
          directories
        });
        showToast('success', 'Category updated successfully');
      } else {
        await createCategory(name, selectedColor, directories, user?.$id || user?.id || 'guest');
        showToast('success', 'Category created successfully');
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