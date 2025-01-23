import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FileItem } from '@/lib/fileSystem';
import * as FileSystem from 'expo-file-system';
import { formatFileSize } from '@/lib/utils';
import DirectoryPicker from './DirectoryPicker';

interface FileDetailsProps {
  file: FileItem;
  onClose: () => void;
  currentPath: string;
}

const FileDetails: React.FC<FileDetailsProps> = ({ file, onClose, currentPath }) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);

  const details = [
    { label: 'Name', value: file.name },
    { label: 'Type', value: file.type },
    { label: 'Size', value: formatFileSize(file.size || 0) },
    { label: 'Location', value: file.uri },
    { label: 'Modified', value: new Date(file.modificationTime || Date.now()).toLocaleString() },
  ];

  const handleRename = async () => {
    if (!newName || newName === file.name) {
      setIsRenaming(false);
      return;
    }

    try {
      const newUri = file.uri.replace(file.name, newName);
      await FileSystem.moveAsync({
        from: file.uri,
        to: newUri,
      });
      onClose();
      setIsRenaming(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to rename file');
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${file.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(file.uri);
              onClose();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete file');
            }
          },
        },
      ]
    );
  };

  const handleMove = async (destinationPath: string) => {
    try {
      const newUri = `${destinationPath}/${file.name}`;
      
      // Check if a file with the same name exists
      const fileInfo = await FileSystem.getInfoAsync(newUri);
      if (fileInfo.exists) {
        Alert.alert(
          'File Exists',
          'A file with the same name already exists in the destination folder. What would you like to do?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Replace',
              style: 'destructive',
              onPress: async () => {
                try {
                  await FileSystem.deleteAsync(newUri);
                  await FileSystem.moveAsync({
                    from: file.uri,
                    to: newUri,
                  });
                  onClose();
                } catch (error) {
                  Alert.alert('Error', 'Failed to move file');
                }
              },
            },
            {
              text: 'Keep Both',
              onPress: async () => {
                try {
                  const newFileName = `${file.name.split('.').slice(0, -1).join('.')} (copy).${file.name.split('.').pop()}`;
                  const newUriWithCopy = `${destinationPath}/${newFileName}`;
                  await FileSystem.moveAsync({
                    from: file.uri,
                    to: newUriWithCopy,
                  });
                  onClose();
                } catch (error) {
                  Alert.alert('Error', 'Failed to move file');
                }
              },
            },
          ]
        );
        return;
      }

      // Move the file if no conflicts
      await FileSystem.moveAsync({
        from: file.uri,
        to: newUri,
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to move file');
    }
  };

  if (showDirectoryPicker) {
    return (
      <DirectoryPicker
        currentPath={currentPath}
        onSelect={handleMove}
        onClose={() => setShowDirectoryPicker(false)}
      />
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-zinc-900">
      <View className="flex-row justify-between items-center p-4 border-b border-zinc-100 dark:border-zinc-800">
        <Text className="text-lg font-rubik-medium text-black-300 dark:text-white">
          File Details
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} className="text-black-400 dark:text-zinc-400" />
        </TouchableOpacity>
      </View>

      <View className="p-4">
        {isRenaming ? (
          <View className="flex-row items-center mb-4">
            <TextInput
              value={newName}
              onChangeText={setNewName}
              className="flex-1 font-rubik text-black-300 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-lg mr-2"
              autoFocus
            />
            <TouchableOpacity onPress={handleRename} className="mr-2">
              <Ionicons name="checkmark" size={24} className="text-primary-500" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsRenaming(false)}>
              <Ionicons name="close" size={24} className="text-black-400 dark:text-zinc-400" />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-rubik-medium text-black-300 dark:text-white" numberOfLines={1}>
              {file.name}
            </Text>
            <TouchableOpacity onPress={() => setIsRenaming(true)}>
              <Ionicons name="pencil" size={20} className="text-primary-500" />
            </TouchableOpacity>
          </View>
        )}

        {details.map((info, index) => (
          <View
            key={info.label}
            className={`flex-row justify-between py-3 ${
              index < details.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''
            }`}
          >
            <Text className="font-rubik text-black-400 dark:text-zinc-400">{info.label}</Text>
            <Text className="font-rubik text-black-300 dark:text-white">{info.value}</Text>
          </View>
        ))}

        <View className="mt-8">
          <TouchableOpacity
            onPress={() => setShowDirectoryPicker(true)}
            className="flex-row items-center py-3 border-b border-zinc-100 dark:border-zinc-800"
          >
            <Ionicons name="folder-open" size={20} className="text-primary-500 mr-3" />
            <Text className="font-rubik text-black-300 dark:text-white">Move to...</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            className="flex-row items-center py-3"
          >
            <Ionicons name="trash" size={20} className="text-red-500 mr-3" />
            <Text className="font-rubik text-red-500">Delete File</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default FileDetails; 