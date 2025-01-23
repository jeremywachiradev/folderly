import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FileItem } from '@/lib/fileSystem';
import { getFileIcon, formatFileSize, formatDate } from '@/lib/utils';

interface RecentFilesProps {
  files: FileItem[];
  onFilePress: (file: FileItem) => void;
}

export default function RecentFiles({ files, onFilePress }: RecentFilesProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <View className="mb-6">
      <Text className="px-4 text-lg font-rubik-medium text-black-300 dark:text-white mb-4">
        Recent Files
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="pl-4"
      >
        {files.map((file) => (
          <TouchableOpacity
            key={file.uri}
            onPress={() => onFilePress(file)}
            className="mr-4 w-40"
          >
            <View className="bg-white dark:bg-zinc-800 rounded-lg p-3 shadow-sm">
              {file.type.match(/^(jpg|jpeg|png|gif)$/i) ? (
                <Image
                  source={{ uri: file.uri }}
                  className="w-full h-24 rounded mb-3"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-24 bg-primary-100 dark:bg-primary-900 rounded mb-3 justify-center items-center">
                  <Ionicons
                    name={getFileIcon(file.type)}
                    size={32}
                    className="text-primary-500"
                  />
                </View>
              )}

              <Text className="font-rubik-medium text-black-300 dark:text-white" numberOfLines={1}>
                {file.name}
              </Text>

              <View className="flex-row items-center mt-1">
                <Text className="text-xs font-rubik text-black-400 dark:text-zinc-400">
                  {formatFileSize(file.size)}
                </Text>
                <Text className="text-xs font-rubik text-black-400 dark:text-zinc-400 mx-2">•</Text>
                <Text className="text-xs font-rubik text-black-400 dark:text-zinc-400">
                  {formatDate(file.modificationTime)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
} 