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
import { showToast } from '@/lib/notifications';
import { useDialog } from '@/components/ui/DialogProvider';

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
  onHelpPress?: () => void;
}

interface FileListItemProps {
  item: FileItemType;
  onPress: () => void;
  onLongPress: () => void;
  isSelected: boolean;
  viewMode: 'grid' | 'list';
  isSelectionMode: boolean;
}

// Optimize FileListItem component with proper memo comparison
const FileListItem = memo(({ 
  item, 
  onPress, 
  onLongPress, 
  isSelected, 
  viewMode,
  isSelectionMode
}: FileListItemProps & { isSelectionMode: boolean }) => {
  const { isDarkMode } = useTheme();
  const dialog = useDialog();
  
  // Memoize handlers to prevent unnecessary re-renders
  const handleFileSave = useCallback(async (e: any) => {
    // Stop propagation to prevent triggering the onPress event of the parent
    e.stopPropagation();
    
    // If in selection mode, disable individual save
    if (isSelectionMode) {
      e.preventDefault();
      return;
    }
    
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
      
      await saveFile(item.uri, item.name);
      showToast('success', 'File saved successfully');
    } catch (error) {
      
      showToast('error', 'Failed to save file');
    }
  }, [item.uri, item.name, dialog, isSelectionMode]);

  const renderListView = () => (
    <View style={{ width: '100%', minHeight: ESTIMATED_ITEM_SIZE.list }}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        className={`px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center ${
          isSelected ? 'border-l-4 border-l-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''
        } ${isSelectionMode && !isSelected ? 'opacity-80 bg-neutral-50 dark:bg-neutral-800/50' : ''}`}
      >
        {/* File Icon */}
        <View className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${isSelectionMode ? 'relative' : ''}`} style={{
          backgroundColor: `${getFileIcon(item.type).color}15`
        }}>
          <Ionicons
            name={getFileIcon(item.type).icon as any}
            size={24}
            color={getFileIcon(item.type).color}
          />
          {isSelectionMode && (
            <View className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-neutral-800 ${isSelected ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
              {isSelected && (
                <Ionicons name="checkmark" size={12} color="white" style={{ alignSelf: 'center' }} />
              )}
            </View>
          )}
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
            className={`ml-2 p-2 ${isSelectionMode ? 'opacity-50' : ''}`}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isSelectionMode} // Disable save button in selection mode
          >
            <Ionicons name="download-outline" size={22} color={isSelectionMode ? "#94a3b8" : "#0077ff"} />
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
        className={`flex-1 m-1 rounded-lg overflow-hidden border ${
          isSelected ? 'border-2 border-primary-500' : 'border-neutral-200 dark:border-neutral-800'
        } ${isSelectionMode && !isSelected ? 'opacity-80 bg-neutral-50/50 dark:bg-neutral-800/50' : ''}`}
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

        {/* Selection Indicator */}
        {isSelectionMode && (
          <View className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full border-2 border-white dark:border-neutral-800 items-center justify-center" style={{ 
            backgroundColor: isSelected ? '#0077ff' : 'rgba(255, 255, 255, 0.7)'
          }}>
            {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
          </View>
        )}

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
            className={`absolute top-1 left-1 w-8 h-8 rounded-full bg-black/30 items-center justify-center ${isSelectionMode ? 'opacity-50' : ''}`}
            style={{ backdropFilter: 'blur(4px)' }}
            disabled={isSelectionMode} // Disable save button in selection mode
          >
            <Ionicons name="download-outline" size={18} color={isSelectionMode ? "rgba(255, 255, 255, 0.5)" : "white"} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );

  return viewMode === 'list' ? renderListView() : renderGridView();
}, (prevProps, nextProps) => {
  // Return true if the props are equal (to prevent re-render)
  // Simplified memo comparison to focus on essential props
  return (
    prevProps.item.uri === nextProps.item.uri &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.isSelectionMode === nextProps.isSelectionMode
  );
});

// FlashList optimizations to prevent random selection issues
const overrideItemLayout = (layout: any, _item: any, _index: number, maxColumns: number, viewMode: 'grid' | 'list') => {
  if (!layout) return;
  
  if (viewMode === 'grid') {
    layout.span = 1;
    layout.size = ESTIMATED_ITEM_SIZE.grid;
  } else {
    layout.span = maxColumns;
    layout.size = ESTIMATED_ITEM_SIZE.list;
  }
};

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
  onHelpPress,
}: FileListProps) {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isFileSelectionMode, setIsFileSelectionMode] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  
  // Use the store's setCurrentFile function directly
  const setCurrentFile = useFileStore(useCallback(state => state.setCurrentFile, []));

  // Add a layout ready state
  const handleLayout = useCallback(() => {
    setIsLayoutReady(true);
  }, []);

  // Stable access to files for callbacks
  const filesRef = React.useRef(files);
  
  // Update filesRef whenever files change
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

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
    
    return sorted;
  }, [files, sortOption]);

  // Update effect to handle empty selection
  useEffect(() => {
    if (isFileSelectionMode && selectedFiles.size === 0) {
      setIsFileSelectionMode(false);
    }
  }, [selectedFiles, isFileSelectionMode]);

  // Remove debugging log for selection mode changes
  useEffect(() => {
    // If selection mode is turned off, clear all selections
    if (!isFileSelectionMode) {
      setSelectedFiles(new Set());
    }
  }, [isFileSelectionMode]);
  
  // Improve file press handler with clearer logic
  const handleFilePress = useCallback((file: FileItemType) => {
    if (isFileSelectionMode) {
      // Toggle this specific file's selection
      setSelectedFiles(prevSelected => {
        const newSelected = new Set(prevSelected);
        
        if (newSelected.has(file.path)) {
          newSelected.delete(file.path);
        } else {
          newSelected.add(file.path);
        }
        
        return newSelected;
      });
    } else {
      // Not in selection mode, open the file
      setCurrentFile(file);
      const encodedUri = btoa(file.uri);
      router.push(`/file/${encodedUri}`);
    }
  }, [isFileSelectionMode, router, setCurrentFile]);

  const handleFileLongPress = useCallback((file: FileItemType) => {
    // Always enter selection mode on long press and add the file
    setIsFileSelectionMode(true);
    
    // Create a new Set with only the long-pressed file to ensure clean selection state
    setSelectedFiles(new Set([file.path]));
  }, []);

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

  const handleSelectAll = useCallback(() => {
    if (filesRef.current.length > 0) {
      // Create a new Set with all file paths
      const allFiles = new Set(filesRef.current.map(f => f.path));
      
      // Update the selection state
      setSelectedFiles(allFiles);
    }
  }, []);

  const handleInverseSelection = useCallback(() => {
    setSelectedFiles(prevSelected => {
      // Create a new Set for the inverse selection
      const newSelected = new Set<string>();
      
      // Add files that are not currently selected
      filesRef.current.forEach(file => {
        if (!prevSelected.has(file.path)) {
          newSelected.add(file.path);
        }
      });
      
      return newSelected;
    });
  }, []);

  // Enhanced batch save with better error handling and feedback
  const handleBatchSave = useCallback(async () => {
    // Check if there are any files selected
    if (selectedFiles.size === 0) {
      showToast('error', 'No files selected for saving');
      return;
    }
    
    try {
      setIsSavingBatch(true);
      
      // Get save directory
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
      
      // Get selected files
      const selectedFilesList = filesRef.current.filter(f => selectedFiles.has(f.path));
      
      if (selectedFilesList.length === 0) {
        showToast('error', 'No valid files found for saving');
        return;
      }
      
      // Save files with better feedback
      showToast('info', `Saving ${selectedFilesList.length} file${selectedFilesList.length > 1 ? 's' : ''}...`);
      await saveFiles(selectedFilesList.map(file => ({ uri: file.uri, name: file.name })));
      showToast('success', `Successfully saved ${selectedFilesList.length} file${selectedFilesList.length > 1 ? 's' : ''}`);
      
      // Exit selection mode after successful save
      setIsFileSelectionMode(false);
      setSelectedFiles(new Set());
    } catch (error) {
      
      showToast('error', 'Failed to save files');
    } finally {
      setIsSavingBatch(false);
    }
  }, [selectedFiles, dialog]);

  // Update renderItem to ensure stable references
  const renderItem = useCallback(({ item }: { item: FileItemType }) => {
    const isItemSelected = selectedFiles.has(item.path);
    
    return (
      <FileListItem
        key={item.uri} // Add key to help with reconciliation
        item={item}
        onPress={() => handleFilePress(item)}
        onLongPress={() => handleFileLongPress(item)}
        isSelected={isItemSelected}
        viewMode={viewMode}
        isSelectionMode={isFileSelectionMode}
      />
    );
  }, [viewMode, selectedFiles, handleFilePress, handleFileLongPress, isFileSelectionMode]);

  // Add view transition handler
  const handleViewModeChange = useCallback((newMode: 'grid' | 'list') => {
    if (newMode !== viewMode) {
      // First set the transition state to show loading
      setIsViewTransitioning(true);
      
      // Clear selection to avoid any state conflicts
      setIsFileSelectionMode(false);
      setSelectedFiles(new Set());
      
      // Use setTimeout to ensure the component has time to reset before changing mode
      setTimeout(() => {
        // Change the view mode
        onViewModeChange(newMode);
        
        // Add a small delay before removing the transition state
        setTimeout(() => {
          setIsViewTransitioning(false);
        }, 150);
      }, 50);
    }
  }, [viewMode, onViewModeChange]);

  // Render a completely different component during transition to avoid FlashList errors
  if (isViewTransitioning) {
    return (
      <View className="flex-1 bg-white dark:bg-neutral-900">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={isDarkMode ? '#fff' : '#000'} />
          <Text className="mt-4 text-neutral-600 dark:text-neutral-400">
            Changing view...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Selection Mode Header */}
      {isFileSelectionMode && (
        <View className="flex-row items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <Text variant="body" weight="medium" className="text-neutral-900 dark:text-white">
            {selectedFiles.size} {selectedFiles.size === 1 ? 'file' : 'files'} selected
          </Text>
          <View className="flex-row items-center space-x-4">
            <TouchableOpacity 
              onPress={handleSelectAll}
              className="px-3 py-1.5 rounded-md bg-primary-50 dark:bg-primary-900/20"
              disabled={isSavingBatch}
            >
              <Text className="text-primary-500">Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleInverseSelection}
              className="px-3 py-1.5 rounded-md bg-primary-50 dark:bg-primary-900/20"
              disabled={isSavingBatch}
            >
              <Text className="text-primary-500">Inverse</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleBatchSave}
              className={`px-3 py-1.5 rounded-md ${selectedFiles.size === 0 ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-primary-50 dark:bg-primary-900/20'}`}
              disabled={isSavingBatch || selectedFiles.size === 0}
            >
              <View className="flex-row items-center">
                {isSavingBatch ? (
                  <>
                    <Loading size="small" />
                    <Text className="text-primary-500 ml-2">Saving...</Text>
                  </>
                ) : (
                  <Text className={`${selectedFiles.size === 0 ? 'text-neutral-400 dark:text-neutral-600' : 'text-primary-500'}`}>
                    Save
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSelectedFiles(new Set());
                setIsFileSelectionMode(false);
              }}
              className="px-3 py-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800"
              disabled={isSavingBatch}
            >
              <Text className="text-neutral-600 dark:text-neutral-400">Cancel</Text>
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
      <View 
        className={`flex-1 bg-white dark:bg-neutral-900 ${isFileSelectionMode ? 'border-2 border-primary-100 dark:border-primary-900/20' : ''}`} 
        onLayout={handleLayout}
      >
        {isLayoutReady && (
          <FlashList
            data={sortedFiles}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            estimatedItemSize={viewMode === 'grid' ? ESTIMATED_ITEM_SIZE.grid : ESTIMATED_ITEM_SIZE.list}
            extraData={[selectedFiles, isFileSelectionMode, viewMode]}
            overrideItemLayout={(layout, item, index, maxColumns) => 
              overrideItemLayout(layout, item, index, maxColumns, viewMode)
            }
            numColumns={viewMode === 'grid' ? 2 : 1}
            onEndReached={hasMore ? onLoadMore : undefined}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={onRefresh}
                tintColor={isDarkMode ? '#fff' : '#000'}
              />
            }
            ListEmptyComponent={!isLoading ? (
              <EmptyState
                icon="document-outline"
                title="No files found"
                description={searchQuery ? 'Try a different search term' : 'Your files will appear here'}
                onHelpPress={onHelpPress}
              />
            ) : null}
            ListFooterComponent={isLoadingMore ? (
              <View className="py-4">
                <ActivityIndicator />
              </View>
            ) : null}
            contentContainerStyle={{
              paddingBottom: insets.bottom,
            }}
          />
        )}
      </View>
    </View>
  );
} 