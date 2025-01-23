import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { validateDirectoryAccess, requestAndroidPermissions } from '../lib/androidDirectories';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_PATHS_KEY = '@folderly/recent_paths';
const MAX_RECENT_PATHS = 5;

interface DirectoryPickerProps {
  currentPath: string;
  onSelect: (destinationPath: string) => Promise<void>;
  onClose: () => void;
}

const DirectoryPicker: React.FC<DirectoryPickerProps> = ({
  currentPath,
  onSelect,
  onClose,
}) => {
  const [directories, setDirectories] = useState<string[]>([]);
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [customPath, setCustomPath] = useState('');
  const router = useRouter();
  const [hasPermissions, setHasPermissions] = useState(false);

  useEffect(() => {
    checkPermissions();
    loadRecentPaths();
  }, []);

  useEffect(() => {
    if (hasPermissions) {
      loadDirectories();
    }
  }, [currentPath, hasPermissions]);

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await requestAndroidPermissions();
      setHasPermissions(granted);
      
      if (!granted) {
        Alert.alert(
          'Storage Permission Required',
          'This app needs storage access permission to select directories. Please grant the permission in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Try Again',
              onPress: checkPermissions
            }
          ]
        );
      }
    } else {
      setHasPermissions(true);
    }
  };

  const loadRecentPaths = async () => {
    try {
      const paths = await AsyncStorage.getItem(RECENT_PATHS_KEY);
      if (paths) {
        setRecentPaths(JSON.parse(paths));
      }
    } catch (error) {
      console.error('Error loading recent paths:', error);
    }
  };

  const addRecentPath = async (path: string) => {
    try {
      const paths = new Set([path, ...recentPaths]);
      const updatedPaths = Array.from(paths).slice(0, MAX_RECENT_PATHS);
      await AsyncStorage.setItem(RECENT_PATHS_KEY, JSON.stringify(updatedPaths));
      setRecentPaths(updatedPaths);
    } catch (error) {
      console.error('Error saving recent path:', error);
    }
  };

  const loadDirectories = async () => {
    if (!hasPermissions) {
      return;
    }

    try {
      setLoading(true);
      const hasAccess = await validateDirectoryAccess(currentPath);
      
      if (!hasAccess) {
        Alert.alert(
          'Access Denied',
          'Cannot access this directory. This might be due to Android storage restrictions. Please try a different directory or grant additional permissions.',
          [
            { text: 'OK' },
            { 
              text: 'Check Permissions',
              onPress: checkPermissions
            }
          ]
        );
        return;
      }

      const contents = await FileSystem.readDirectoryAsync(currentPath);
      const dirs = [];

      for (const item of contents) {
        const path = `${currentPath}/${item}`;
        try {
          const info = await FileSystem.getInfoAsync(path);
          if (info.exists && info.isDirectory) {
            dirs.push(item);
          }
        } catch (error) {
          console.error(`Error checking directory ${path}:`, error);
        }
      }

      setDirectories(dirs.sort());
    } catch (error) {
      console.error('Error loading directories:', error);
      Alert.alert(
        'Error',
        'Failed to load directories. Please check app permissions and try again.',
        [
          { text: 'OK' },
          { 
            text: 'Check Permissions',
            onPress: checkPermissions
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDirectoryPress = async (dirName: string) => {
    const newPath = `${currentPath}/${dirName}`;
    onSelect(newPath);
  };

  const handleGoBack = () => {
    if (currentPath === '/storage/emulated/0') {
      router.back();
      return;
    }

    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    onSelect(parentPath);
  };

  const handleCustomPathSubmit = async () => {
    if (!customPath.trim()) {
      return;
    }

    try {
      const hasAccess = await validateDirectoryAccess(customPath);
      if (!hasAccess) {
        Alert.alert('Error', 'Cannot access this directory');
        return;
      }

      onSelect(customPath.trim());
      setCustomPath('');
    } catch (error) {
      Alert.alert('Error', 'Invalid directory path');
    }
  };

  const handleSelectCurrent = async () => {
    try {
      const hasAccess = await validateDirectoryAccess(currentPath);
      if (!hasAccess) {
        Alert.alert('Error', 'Cannot access this directory');
        return;
      }

      const dirName = currentPath.split('/').pop() || 'Unknown Directory';
      await addRecentPath(currentPath);

      // Store the selected directory in AsyncStorage for the form to retrieve
      await AsyncStorage.setItem('@folderly/selected_directory', JSON.stringify({
        name: dirName,
        path: currentPath,
        type: 'custom'
      }));

      onSelect(currentPath);
    } catch (error) {
      Alert.alert('Error', 'Failed to select directory');
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {!hasPermissions ? (
        <View className="flex-1 justify-center items-center p-4">
          <Ionicons name="folder-open" size={64} color="#007AFF" />
          <Text className="text-lg font-medium text-center mt-4">
            Storage Permission Required
          </Text>
          <Text className="text-gray-600 text-center mt-2">
            This app needs storage access permission to select directories.
          </Text>
          <TouchableOpacity
            onPress={checkPermissions}
            className="bg-blue-500 px-6 py-3 rounded-lg mt-4"
          >
            <Text className="text-white font-medium">Grant Permission</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Header */}
          <View className="bg-white border-b border-gray-200 p-4">
            <View className="flex-row items-center space-x-2">
              <TouchableOpacity onPress={handleGoBack} className="p-2">
                <Ionicons name="arrow-back" size={24} color="#007AFF" />
              </TouchableOpacity>
              <Text className="text-lg font-medium flex-1">Select Directory</Text>
            </View>

            <TextInput
              value={customPath}
              onChangeText={setCustomPath}
              onSubmitEditing={handleCustomPathSubmit}
              placeholder="Enter custom path"
              className="bg-gray-100 p-3 rounded-lg mt-4"
            />

            <Text className="text-gray-500 text-sm mt-2 break-all">
              Current: {currentPath}
            </Text>
          </View>

          {/* Directory List */}
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : (
            <ScrollView className="flex-1">
              <View className="p-4 space-y-4">
                {/* Recent Paths */}
                {recentPaths.length > 0 && (
                  <View>
                    <Text className="text-gray-600 mb-2 font-medium">Recent</Text>
                    <View className="space-y-2">
                      {recentPaths.map((path) => (
                        <TouchableOpacity
                          key={path}
                          onPress={() => onSelect(path)}
                          className="bg-white p-4 rounded-lg flex-row items-center space-x-3"
                        >
                          <Ionicons name="time-outline" size={24} color="#007AFF" />
                          <Text className="flex-1 text-sm">{path}</Text>
                          <Ionicons name="chevron-forward" size={20} color="#999999" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Current Directory Contents */}
                <View>
                  <Text className="text-gray-600 mb-2 font-medium">Contents</Text>
                  <View className="space-y-2">
                    {directories.length === 0 ? (
                      <Text className="text-gray-500 text-center">
                        No accessible directories found
                      </Text>
                    ) : (
                      directories.map((dir) => (
                        <TouchableOpacity
                          key={dir}
                          onPress={() => handleDirectoryPress(dir)}
                          className="bg-white p-4 rounded-lg flex-row items-center space-x-3"
                        >
                          <Ionicons name="folder" size={24} color="#007AFF" />
                          <Text className="flex-1">{dir}</Text>
                          <Ionicons name="chevron-forward" size={20} color="#999999" />
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Select Button */}
          <View className="p-4 bg-white border-t border-gray-200">
            <TouchableOpacity
              onPress={handleSelectCurrent}
              className="bg-blue-500 p-4 rounded-lg"
            >
              <Text className="text-white text-center font-medium">
                Select Current Directory
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

export default DirectoryPicker; 