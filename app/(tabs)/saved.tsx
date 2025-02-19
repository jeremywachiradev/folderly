import React, { useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-provider';
import { Text, EmptyState, Loading } from '@/components/ui';
import { FileList } from '@/components/FileList';
import { FileItem, SortOption } from '@/types';
import { getSaveDirectory, getFilesFromDirectory } from '@/lib/fileSystem';
import { StorageAccessFramework } from 'expo-file-system';
import { showDialog } from '@/lib/notifications';

// Helper function to get MIME type
function getFileType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(extension)) {
    return 'image/jpeg';
  }
  
  // Video files
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) {
    return 'video/mp4';
  }
  
  // Audio files
  if (['mp3', 'wav', 'm4a', 'ogg', 'aac'].includes(extension)) {
    return 'audio/mpeg';
  }
  
  // Document files
  if (['pdf'].includes(extension)) {
    return 'application/pdf';
  }
  if (['doc', 'docx'].includes(extension)) {
    return 'application/msword';
  }
  if (['txt', 'md'].includes(extension)) {
    return 'text/plain';
  }
  
  // Default
  return 'application/octet-stream';
}

export default function SavedScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadSavedFiles = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setIsLoading(true);
      }
      const saveDir = await getSaveDirectory();
      
      if (!saveDir) {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          await showDialog({
            title: 'Permission Required',
            message: 'Storage access permission is required to access saved files',
            buttons: [{ text: 'OK', onPress: () => {} }]
          });
          return;
        }
        return;
      }

      const savedFiles = await getFilesFromDirectory(saveDir);
      
      // Map file system items to the FileItem type used by components
      const mappedFiles: FileItem[] = savedFiles.map(file => ({
        name: file.name,
        path: file.path,
        uri: file.uri,
        size: file.size,
        type: getFileType(file.name),
        categoryId: 'saved',
        modifiedTime: file.modificationTime,
        displayName: file.name,
        displayPath: file.path.split('/').slice(0, -1).join('/')
      }));

      // Update files state
      setFiles(prevFiles => {
        // If refreshing, check for changes
        if (isRefreshing) {
          const hasChanges = JSON.stringify(prevFiles) !== JSON.stringify(mappedFiles);
          return hasChanges ? mappedFiles : prevFiles;
        }
        return mappedFiles;
      });
    } catch (error) {
      console.error('Error loading saved files:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSavedFiles(false);
  }, [loadSavedFiles]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-neutral-50 dark:bg-neutral-900">
        <Loading fullScreen text="Loading saved files..." />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <View className={`px-4 py-3 border-b ${isDarkMode ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
        <View className="flex-row items-center justify-between">
          <Text variant="h4" weight="semibold" className="text-neutral-900 dark:text-white">
            Saved Files
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            className="p-2"
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={isDarkMode ? '#ffffff' : '#000000'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {files.length === 0 ? (
        <EmptyState
          icon="save-outline"
          title="No Saved Files"
          description="Files you save will appear here."
        />
      ) : (
        <FileList
          files={files}
          isLoading={isLoading}
          isLoadingMore={false}
          hasMore={false}
          onLoadMore={() => {}}
          onRefresh={() => loadSavedFiles(true)}
          sortOption={sortOption}
          onSortChange={setSortOption}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showSortModal={showSortModal}
          onSortModalChange={setShowSortModal}
        />
      )}
    </SafeAreaView>
  );
} 