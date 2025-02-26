import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { FileItem as FileItemType } from '@/types';
import { formatFileSize, formatDate, getFileIcon, getFileName, formatDisplayName, formatDisplayPath } from '@/lib/utils';
import { saveFile, getSaveDirectory, setSaveDirectory } from '@/lib/fileSystem';
import { StorageAccessFramework } from 'expo-file-system';
import { showToast } from '@/lib/notifications';
import { useDialog } from '@/components/ui/DialogProvider';

interface FileItemProps {
  file: FileItemType;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function FileItem({ file, selected, onPress, onLongPress }: FileItemProps) {
  const { type, size, modifiedTime, path: filePath, name } = file;
  const { icon, color } = getFileIcon(type);
  const dialog = useDialog();

  const handleFileSave = async () => {
    try {
      let saveDir = await getSaveDirectory();
      
      if (!saveDir) {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          await dialog.showDialog({
            title: 'Permission Required',
            message: 'Storage access permission is required to save files',
            buttons: [
              {
                text: 'OK',
                onPress: () => {},
              }
            ]
          });
          return;
        }
        
        saveDir = permissions.directoryUri;
        await setSaveDirectory(saveDir);
        showToast('success', 'Save directory set successfully');
      }
      
      await saveFile(file.uri, file.name);
      showToast('success', 'File saved successfully');
    } catch (error) {
      console.error('Error saving file:', error);
      showToast('error', 'Failed to save file');
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      className={`flex-row items-center p-4 ${
        selected ? 'bg-primary-50 dark:bg-primary-900' : ''
      }`}
    >
      <View
        className="w-10 h-10 rounded-lg items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View className="ml-3 flex-1">
        <Text
          variant="body"
          weight="medium"
          numberOfLines={1}
          className="text-neutral-900 dark:text-white"
        >
          {formatDisplayName(name)}
        </Text>
        <Text 
          variant="caption" 
          className="text-neutral-400 text-xs mt-1" 
          numberOfLines={1}
        >
          {formatDisplayPath(filePath)}
        </Text>
        <View className="flex-row items-center mt-1">
          <Text variant="caption" className="text-neutral-600 dark:text-neutral-400">
            {formatFileSize(size)}
          </Text>
          <View className="w-1 h-1 rounded-full bg-neutral-400 mx-2" />
          <Text variant="caption" className="text-neutral-600 dark:text-neutral-400">
            {formatDate(modifiedTime)}
          </Text>
        </View>
      </View>
      {selected ? (
        <View className="ml-2">
          <Ionicons name="checkmark-circle" size={24} color="#0077ff" />
        </View>
      ) : (
        <TouchableOpacity 
          onPress={handleFileSave}
          className="ml-2 p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="download-outline" size={22} color="#0077ff" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
} 