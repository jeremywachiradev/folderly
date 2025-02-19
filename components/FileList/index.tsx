import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { View, TouchableOpacity, RefreshControl, TextInput, Alert, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { FileItem as FileItemType, SortOption } from '@/types';
import { FileItem } from '@/components/FileItem';
import { Text, EmptyState, Loading } from '@/components/ui';
import { useTheme } from '@/lib/theme-provider';
import { Image } from 'expo-image';
import { getFileIcon, formatFileSize, formatDate, getFileName, formatDisplayName, formatDisplayPath } from '@/lib/utils';
import { saveFile, saveFiles, getSaveDirectory, setSaveDirectory } from '@/lib/fileSystem';
import { StorageAccessFramework } from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFileStore } from '@/lib/file-store';
import { showDialog, showToast } from '@/lib/notifications';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = SCREEN_WIDTH / 2;

// Optimized constants for FlashList
const ESTIMATED_ITEM_SIZE = {
  list: 80,
  grid: SCREEN_WIDTH / 2
};

const OVERSCAN_MULTIPLIER = 2;

// Memoized key extractor for better performance
const keyExtractor = (item: FileItemType) => item.uri;

interface LayoutType {
  span?: number;
  size?: number;
}

interface FileListProps {
  files: FileItemType[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  showSortModal: boolean;
  onSortModalChange: (show: boolean) => void;
}

interface FileListItemProps {
  item: FileItemType;
  onPress: () => void;
  onLongPress: () => void;
  isSelected: boolean;
  viewMode: 'grid' | 'list';
}

// Optimize FileListItem component with proper memo comparison
const FileListItem = memo(({ 
  item, 
  onPress, 
  onLongPress, 
  isSelected, 
  viewMode 
}: FileListItemProps) => {
  const { isDarkMode } = useTheme();
  
  // Memoize handlers to prevent unnecessary re-renders
  const handleFileSave = useCallback(async () => {
    try {
      let saveDir = await getSaveDirectory();
      
      if (!saveDir) {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          await showDialog({
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
      }
      
      await saveFile(item.uri, item.name);
      showToast('success', 'File saved successfully');
    } catch (error) {
      showToast('error', 'Failed to save file');
    }
  }, [item.uri, item.name]);

  const renderListView = () => (
    <View style={{ width: '100%', minHeight: ESTIMATED_ITEM_SIZE.list }}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        className={`px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center ${
          isSelected ? 'border-l-4 border-l-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''
        }`}
      >
        {/* File Icon */}
        <View className="w-10 h-10 rounded-lg items-center justify-center mr-3" style={{
          backgroundColor: `${getFileIcon(item.type).color}15`
        }}>
          <Ionicons
            name={getFileIcon(item.type).icon as any}
            size={24}
            color={getFileIcon(item.type).color}
          />
        </View>

        {/* File Info */}
        <View className="flex-1">
          <Text 
            numberOfLines={1} 
            className="text-base font-medium text-neutral-900 dark:text-white"
          >
            {formatDisplayName(item.name)}
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
            {formatDisplayPath(item.path)}
          </Text>
          <View className="flex-row items-center mt-1">
            <Text variant="caption" className="text-neutral-600 dark:text-neutral-400">
              {formatFileSize(item.size)}
            </Text>
            <View className="w-1 h-1 rounded-full bg-neutral-400 mx-2" />
            <Text variant="caption" className="text-neutral-600 dark:text-neutral-400">
              {formatDate(item.modifiedTime)}
            </Text>
          </View>
        </View>

        {/* Selection Indicator or Download Button */}
        {isSelected ? (
          <View className="ml-3">
            <View className="w-6 h-6 rounded-full bg-primary-500 items-center justify-center">
              <Ionicons name="checkmark" size={16} color="white" />
            </View>
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
    </View>
  );

  const renderGridView = () => (
    <View style={{ width: ESTIMATED_ITEM_SIZE.grid, height: ESTIMATED_ITEM_SIZE.grid }}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        className={`flex-1 m-1 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 ${
          isSelected ? 'border-2 border-primary-500' : ''
        }`}
      >
        {/* Main Content */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {item.type.startsWith('image/') ? (
            <Image
              source={{ uri: item.uri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : item.type.startsWith('video/') ? (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              <Image
                source={{ uri: item.uri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
              <View className="absolute inset-0 items-center justify-center">
                <View className="w-12 h-12 rounded-full bg-black/50 items-center justify-center">
                  <Ionicons name="play" size={24} color="white" />
                </View>
              </View>
            </View>
          ) : (
            <View className="absolute inset-0 items-center justify-center bg-neutral-200 dark:bg-neutral-700">
              <Ionicons
                name={getFileIcon(item.type).icon as any}
                size={48}
                color={getFileIcon(item.type).color}
              />
            </View>
          )}
        </View>

        {/* File Type Indicator */}
        <View 
          className="absolute top-1 right-1 w-6 h-6 rounded items-center justify-center"
          style={{ backgroundColor: `${getFileIcon(item.type).color}15` }}
        >
          <Ionicons
            name={getFileIcon(item.type).icon as any}
            size={14}
            color={getFileIcon(item.type).color}
          />
        </View>

        {/* File Size and Date */}
        <View className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm justify-center py-1 px-2">
          <Text variant="body-sm" className="text-white text-center" numberOfLines={1}>
            {formatFileSize(item.size)} • {formatDate(item.modifiedTime)}
          </Text>
        </View>

        {/* Selection Checkmark or Download Button */}
        {isSelected ? (
          <View className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <View className="w-12 h-12 rounded-full bg-primary-500 items-center justify-center">
              <Ionicons name="checkmark" size={32} color="white" />
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleFileSave}
            className="absolute top-1 left-1 w-8 h-8 rounded-full bg-black/30 items-center justify-center"
            style={{ backdropFilter: 'blur(4px)' }}
          >
            <Ionicons name="download-outline" size={18} color="white" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );

  return viewMode === 'list' ? renderListView() : renderGridView();
}, (prevProps, nextProps) => {
  return (
    prevProps.item.uri === nextProps.item.uri &&
    prevProps.item.modifiedTime === nextProps.item.modifiedTime &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.viewMode === nextProps.viewMode
  );
});

// Add skeleton loading component
const FileItemSkeleton = memo(({ viewMode }: { viewMode: 'grid' | 'list' }) => {
  const { isDarkMode } = useTheme();
  const backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  if (viewMode === 'list') {
    return (
      <View style={{ width: '100%', minHeight: ESTIMATED_ITEM_SIZE.list }}>
        <View className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center">
          <View 
            className="w-10 h-10 rounded-lg mr-3"
            style={{ backgroundColor }}
          />
          <View className="flex-1">
            <View 
              className="h-5 rounded mb-1 w-3/4"
              style={{ backgroundColor }}
            />
            <View 
              className="h-4 rounded mb-1 w-1/2"
              style={{ backgroundColor }}
            />
            <View 
              className="h-3 rounded w-1/3"
              style={{ backgroundColor }}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: ESTIMATED_ITEM_SIZE.grid, height: ESTIMATED_ITEM_SIZE.grid }}>
      <View className="flex-1 m-1 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
        <View 
          className="absolute inset-0"
          style={{ backgroundColor }}
        />
      </View>
    </View>
  );
});

export function FileList({
  files,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onRefresh,
  sortOption,
  onSortChange,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  showSortModal,
  onSortModalChange,
}: FileListProps) {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isFileSelectionMode, setIsFileSelectionMode] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Use the store's setCurrentFile function directly
  const setCurrentFile = useFileStore(useCallback(state => state.setCurrentFile, []));

  // Add a layout ready state
  const [isLayoutReady, setIsLayoutReady] = useState(false);

  // Add useCallback for list layout
  const handleLayout = useCallback(() => {
    setIsLayoutReady(true);
  }, []);

  // Memoize the sorted files to prevent unnecessary re-renders
  const sortedFiles = useMemo(() => {
    // Create a copy of files to avoid mutating the original array
    const sorted = [...files];
    
    // Sort files based on the current sort option
    switch (sortOption) {
      case 'date-desc':
        sorted.sort((a, b) => {
          // Primary sort by modification time
          const timeComparison = b.modifiedTime - a.modifiedTime;
          if (timeComparison !== 0) return timeComparison;
          
          // Secondary sort by name for stability
          const nameComparison = a.name.localeCompare(b.name);
          if (nameComparison !== 0) return nameComparison;
          
          // Final sort by path for absolute stability
          return a.path.localeCompare(b.path);
        });
        break;
      case 'date-asc':
        sorted.sort((a, b) => {
          const timeComparison = a.modifiedTime - b.modifiedTime;
          if (timeComparison !== 0) return timeComparison;
          const nameComparison = a.name.localeCompare(b.name);
          if (nameComparison !== 0) return nameComparison;
          return a.path.localeCompare(b.path);
        });
        break;
      // ... other sort options remain the same
    }
    
    // Apply search filter if needed
    if (searchQuery) {
      return sorted.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return sorted;
  }, [files, sortOption, searchQuery]);

  // Update file opening handler to use sorted files
  const handleFilePress = useCallback((file: FileItemType) => {
    if (isFileSelectionMode) {
      if (selectedFiles.has(file.path)) {
        const newSelectedFiles = new Set(selectedFiles);
        newSelectedFiles.delete(file.path);
        setSelectedFiles(newSelectedFiles);
        if (newSelectedFiles.size === 0) {
          setIsFileSelectionMode(false);
        }
      } else {
        setSelectedFiles(new Set([...selectedFiles, file.path]));
      }
    } else {
      // Set the current file in the store before navigation
      setCurrentFile(file);
      // Use base64 encoding to preserve the URI structure
      const encodedUri = btoa(file.uri);
      router.push(`/file/${encodedUri}`);
    }
  }, [isFileSelectionMode, selectedFiles, router, setCurrentFile]);

  // Clear selection when view mode changes
  useEffect(() => {
    setIsFileSelectionMode(false);
    setSelectedFiles(new Set());
  }, [viewMode]);

  // Clear selection when component unmounts
  useEffect(() => {
    return () => {
      setIsFileSelectionMode(false);
      setSelectedFiles(new Set());
    };
  }, []);

  const handleFileLongPress = useCallback((file: FileItemType) => {
    if (!isFileSelectionMode) {
      setIsFileSelectionMode(true);
      setSelectedFiles(new Set([file.path]));
    }
  }, [isFileSelectionMode]);

  const handleFileSave = useCallback(async (file: FileItemType) => {
    try {
      let saveDir = await getSaveDirectory();
      
      if (!saveDir) {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          await showDialog({
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
      }
      
      await saveFile(file.uri, file.name);
      showToast('success', 'File saved successfully');
    } catch (error) {
      showToast('error', 'Failed to save file');
    }
  }, []);

  const handleBatchSave = useCallback(async () => {
    try {
      setIsSavingBatch(true);
      let saveDir = await getSaveDirectory();
      
      if (!saveDir) {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          await showDialog({
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
      }
      
      const selectedFilesList = files.filter(f => selectedFiles.has(f.path));
      await saveFiles(selectedFilesList.map(file => ({ uri: file.uri, name: file.name })));
      showToast('success', `Successfully saved ${selectedFilesList.length} file${selectedFilesList.length > 1 ? 's' : ''}`);
      setIsFileSelectionMode(false);
      setSelectedFiles(new Set());
    } catch (error) {
      showToast('error', 'Failed to save files');
    } finally {
      setIsSavingBatch(false);
    }
  }, [files, selectedFiles]);

  const handleSelectAll = useCallback(() => {
    setSelectedFiles(new Set(files.map(f => f.path)));
  }, [files]);

  const handleInverseSelection = useCallback(() => {
    setSelectedFiles(prev => {
      const newSet = new Set(
        files
          .filter(f => !prev.has(f.path))
          .map(f => f.path)
      );
      return newSet;
    });
  }, [files]);

  // Memoize renderItem to prevent unnecessary re-renders
  const renderItem = useCallback(({ item }: { item: FileItemType }) => {
    return (
      <FileListItem
        item={item}
        onPress={() => handleFilePress(item)}
        onLongPress={() => handleFileLongPress(item)}
        isSelected={selectedFiles.has(item.path)}
        viewMode={viewMode}
      />
    );
  }, [viewMode, selectedFiles, handleFilePress, handleFileLongPress]);

  // Add view transition handler
  const handleViewModeChange = useCallback((newMode: 'grid' | 'list') => {
    if (newMode !== viewMode) {
      setIsViewTransitioning(true);
      onViewModeChange(newMode);
      // Add a small delay to ensure smooth transition
      setTimeout(() => {
        setIsViewTransitioning(false);
      }, 300);
    }
  }, [viewMode, onViewModeChange]);

  // Render skeleton items during transition
  const renderSkeletonItem = useCallback(() => (
    <FileItemSkeleton viewMode={viewMode} />
  ), [viewMode]);

  // Memoize FlashList props for better performance
  const flashListProps = useMemo(() => ({
    data: isViewTransitioning ? Array(files.length).fill({}) : files,
    renderItem: isViewTransitioning ? renderSkeletonItem : renderItem,
    keyExtractor: isViewTransitioning ? ((_: any, index: number) => `skeleton-${index}`) : keyExtractor,
    estimatedItemSize: viewMode === 'grid' ? ESTIMATED_ITEM_SIZE.grid : ESTIMATED_ITEM_SIZE.list,
    overrideItemLayout: (
      layout: LayoutType,
      _item: FileItemType, 
      _index: number, 
      maxColumns: number,
      _extraData?: any
    ) => {
      if (!layout) return;
      
      if (viewMode === 'grid') {
        layout.span = 1;
        layout.size = ESTIMATED_ITEM_SIZE.grid;
      } else {
        layout.span = maxColumns;
        layout.size = ESTIMATED_ITEM_SIZE.list;
      }
    },
    numColumns: viewMode === 'grid' ? 2 : 1,
    onEndReached: hasMore ? onLoadMore : undefined,
    onEndReachedThreshold: 0.5,
    refreshControl: (
      <RefreshControl
        refreshing={isLoading}
        onRefresh={onRefresh}
        tintColor={isDarkMode ? '#fff' : '#000'}
      />
    ),
    ListEmptyComponent: !isLoading ? (
      <EmptyState
        icon="document-outline"
        title="No files found"
        description={searchQuery ? 'Try a different search term' : 'Your files will appear here'}
      />
    ) : null,
    ListFooterComponent: isLoadingMore ? (
      <View className="py-4">
        <ActivityIndicator />
      </View>
    ) : null,
    contentContainerStyle: {
      paddingBottom: insets.bottom,
    },
    overscanCount: OVERSCAN_MULTIPLIER * (viewMode === 'grid' ? 10 : 5),
    removeClippedSubviews: true,
    initialNumToRender: viewMode === 'grid' ? 8 : 10,
    maxToRenderPerBatch: viewMode === 'grid' ? 6 : 8,
    windowSize: 5,
  }), [
    files,
    renderItem,
    viewMode,
    hasMore,
    onLoadMore,
    isLoading,
    onRefresh,
    isDarkMode,
    searchQuery,
    isLoadingMore,
    insets.bottom,
    isViewTransitioning,
    renderSkeletonItem
  ]);

  return (
    <View className="flex-1">
      {/* Selection Mode Header */}
      {isFileSelectionMode && (
        <View className="flex-row items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <Text variant="body" weight="medium" className="text-neutral-900 dark:text-white">
            {selectedFiles.size} items selected
          </Text>
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={handleSelectAll}
              className="px-3"
              disabled={isSavingBatch}
            >
              <Text className="text-primary-500">Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleInverseSelection}
              className="px-3"
              disabled={isSavingBatch}
            >
              <Text className="text-primary-500">Inverse</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleBatchSave}
              className="px-3"
              disabled={isSavingBatch}
            >
              <View className="flex-row items-center">
                {isSavingBatch ? (
                  <>
                    <Loading size="small" />
                    <Text className="text-primary-500 ml-2">Saving...</Text>
                  </>
                ) : (
                  <Text className="text-primary-500">Save</Text>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSelectedFiles(new Set());
                setIsFileSelectionMode(false);
              }}
              className="pl-3"
              disabled={isSavingBatch}
            >
              <Text className="text-primary-500">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* View Toggle and Search */}
      <View className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity
            onPress={() => onSortModalChange(true)}
            className="flex-row items-center"
          >
            <Ionicons
              name="filter-outline"
              size={20}
              color={isDarkMode ? '#ffffff' : '#000000'}
            />
            <Text className="ml-2 text-neutral-900 dark:text-white">
              Sort & Filter
            </Text>
          </TouchableOpacity>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => handleViewModeChange('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-100 dark:bg-primary-800' : ''}`}
              disabled={isViewTransitioning}
            >
              <Ionicons
                name="list"
                size={24}
                color={viewMode === 'list' ? '#0077ff' : isDarkMode ? '#fff' : '#000'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleViewModeChange('grid')}
              className={`p-2 rounded-lg ml-2 ${viewMode === 'grid' ? 'bg-primary-100 dark:bg-primary-800' : ''}`}
              disabled={isViewTransitioning}
            >
              <Ionicons
                name="grid"
                size={24}
                color={viewMode === 'grid' ? '#0077ff' : isDarkMode ? '#fff' : '#000'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2">
          <Ionicons name="search" size={20} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
          <TextInput
            placeholder="Search files..."
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            value={searchQuery}
            onChangeText={onSearchChange}
            className="flex-1 ml-2 text-base text-neutral-900 dark:text-white"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => onSearchChange('')}>
              <Ionicons name="close-circle" size={20} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* File List */}
      <View className="flex-1 bg-white dark:bg-neutral-900" onLayout={handleLayout}>
        {isLayoutReady && (
          <FlashList {...flashListProps} />
        )}
      </View>
    </View>
  );
} 