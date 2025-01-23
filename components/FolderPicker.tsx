import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { FileItem } from '@/lib/fileSystem';

interface FolderPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  currentPath: string;
  excludePaths?: string[];
  title?: string;
}

interface Folder {
  name: string;
  path: string;
}

export default function FolderPicker({
  visible,
  onClose,
  onSelect,
  currentPath,
  excludePaths = [],
  title = 'Select Destination'
}: FolderPickerProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    if (visible) {
      loadFolders(path);
    }
  }, [visible, path]);

  const loadFolders = async (folderPath: string) => {
    setLoading(true);
    setError('');

    try {
      const contents = await FileSystem.readDirectoryAsync(folderPath);
      const folderList: Folder[] = [];

      // Add parent folder option if not at root
      if (folderPath !== FileSystem.documentDirectory) {
        const parentPath = folderPath.split('/').slice(0, -1).join('/');
        folderList.push({
          name: '..',
          path: parentPath
        });
      }

      // Get folder info for each item
      await Promise.all(contents.map(async (name) => {
        const itemPath = `${folderPath}/${name}`;
        
        // Skip excluded paths
        if (excludePaths.includes(itemPath)) {
          return;
        }

        const info = await FileSystem.getInfoAsync(itemPath);
        if (info.exists && info.isDirectory) {
          folderList.push({
            name,
            path: itemPath
          });
        }
      }));

      setFolders(folderList.sort((a, b) => {
        if (a.name === '..') return -1;
        if (b.name === '..') return 1;
        return a.name.localeCompare(b.name);
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderPress = (folder: Folder) => {
    setPath(folder.path);
  };

  const handleSelect = () => {
    onSelect(path);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <View className="flex-1 mt-20 bg-white dark:bg-zinc-900 rounded-t-xl">
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-zinc-100 dark:border-zinc-800">
            <Text className="text-xl font-rubik-medium text-black-300 dark:text-white">
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                className="text-black-400 dark:text-zinc-400"
              />
            </TouchableOpacity>
          </View>

          {/* Current Path */}
          <View className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800">
            <Text className="font-rubik text-sm text-black-400 dark:text-zinc-400" numberOfLines={1}>
              {path.replace(FileSystem.documentDirectory || '', '')}
            </Text>
          </View>

          {/* Folder List */}
          <ScrollView className="flex-1">
            {error ? (
              <Text className="p-4 text-red-500 font-rubik text-center">
                {error}
              </Text>
            ) : loading ? (
              <Text className="p-4 font-rubik text-black-400 dark:text-zinc-400 text-center">
                Loading...
              </Text>
            ) : folders.length === 0 ? (
              <Text className="p-4 font-rubik text-black-400 dark:text-zinc-400 text-center">
                No folders found
              </Text>
            ) : (
              folders.map((folder) => (
                <TouchableOpacity
                  key={folder.path}
                  onPress={() => handleFolderPress(folder)}
                  className="flex-row items-center px-4 py-3 border-b border-zinc-100 dark:border-zinc-800"
                >
                  <Ionicons
                    name="folder"
                    size={24}
                    className="text-primary-500 mr-3"
                  />
                  <Text className="flex-1 font-rubik text-black-300 dark:text-white">
                    {folder.name}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    className="text-black-400 dark:text-zinc-400"
                  />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View className="p-4 border-t border-zinc-100 dark:border-zinc-800">
            <TouchableOpacity
              onPress={handleSelect}
              className="bg-primary-500 rounded-lg py-3"
            >
              <Text className="font-rubik-medium text-white text-center">
                Select This Folder
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
} 