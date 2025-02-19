// Home.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Pressable, Alert, Modal, Dimensions, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCategories } from '@/lib/category-provider';
import { useTheme } from '@/lib/theme-provider';
import { Card, Text, EmptyState, Loading, Logo } from '@/components/ui';
import { FileItem, Category, SortOption } from '@/types';
import { SortModal } from '@/components/SortModal';
import { FileItem as FileItemComponent } from '@/components/FileItem';
import { listFiles } from '@/lib/fileManager';
import { deleteCategory } from '@/lib/categoryManager';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef } from 'react';
import { FlashList } from '@shopify/flash-list';
import { FileItem as FileItemType } from '@/types';
import { saveFile, saveFiles, getSaveDirectory, setSaveDirectory } from '@/lib/fileSystem';
import { StorageAccessFramework } from 'expo-file-system';
import { getFileIcon, formatFileSize, formatDate, getFileName } from '@/lib/utils';
import { Image } from 'expo-image';
import { Video } from 'expo-av';
import { ResizeMode } from 'expo-av';
import { useFileStore } from '@/lib/file-store';
import { FileList } from '@/components/FileList/index';
import { showDialog, showToast } from '@/lib/notifications';


const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = SCREEN_WIDTH / 2;

function LogoTitle() {
  return (
    <View className="px-4">
      <Logo size="sm" variant="horizontal" />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { categories, isLoading: isCategoriesLoading, loadCategories } = useCategories();
  const { isDarkMode } = useTheme();
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedModeCategories, setSelectedModeCategories] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoriesToDelete, setCategoriesToDelete] = useState<string[]>([]);
  const categoryListRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isFileSelectionMode, setIsFileSelectionMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize selected categories
  useEffect(() => {
    const initialSelected = new Set(categories.map(cat => cat.id));
    setSelectedCategories(initialSelected);
  }, [categories]);

  // Load files when categories or sort option changes
  useEffect(() => {
    loadFiles(1, true);
  }, [sortOption]);

  // Update selection mode when no categories are selected
  useEffect(() => {
    if (isSelectionMode && selectedCategories.size === 0) {
      setIsSelectionMode(false);
    }
  }, [selectedCategories, isSelectionMode]);

  // Update file selection mode when no files are selected
  useEffect(() => {
    if (isFileSelectionMode && selectedFiles.size === 0) {
      setIsFileSelectionMode(false);
    }
  }, [selectedFiles, isFileSelectionMode]);

  // Update effect to clear selection when view mode changes
  useEffect(() => {
    setIsFileSelectionMode(false);
    setSelectedFiles(new Set());
  }, [viewMode]);

  // Update effect to clear selection when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setIsFileSelectionMode(false);
        setSelectedFiles(new Set());
        setIsSelectionMode(false); // Only clear selection mode, not the actual selections
      };
    }, [])
  );

  const loadFiles = async (pageNum: number, reset: boolean = false) => {
    try {
      if (!hasMore && !reset) return;
      if (pageNum === 1) {
        setIsLoadingFiles(true);
        setFiles([]); // Clear only on explicit refresh
      } else {
        setIsLoadingMore(true);
      }

      const checkedCats = categories.filter(cat => selectedCategories.has(cat.id));
      // Remove duplicate directories by using a Set with the path as key
      const uniqueDirectories = Array.from(
        new Set(
          checkedCats.flatMap(cat => cat.directories.map(dir => dir.path))
        )
      ).map(path => {
        const dir = checkedCats
          .flatMap(cat => cat.directories)
          .find(dir => dir.path === path);
        return {
          path,
          name: dir?.name || '',
          type: dir?.type || 'custom',
          uri: dir?.uri
        };
      });

      const { files, hasMore: more } = await listFiles(uniqueDirectories, pageNum, sortOption);
      
      // Ensure files are unique by path
      const uniqueFiles = files.reduce((acc, file) => {
        if (!acc.some(f => f.path === file.path)) {
          acc.push(file);
        }
        return acc;
      }, [] as typeof files);

      setFiles(prev => {
        if (reset) return uniqueFiles;
        // Ensure we don't add duplicates when loading more
        const newFiles = uniqueFiles.filter(
          file => !prev.some(f => f.path === file.path)
        );
        return [...prev, ...newFiles];
      });
      setHasMore(more);
      setPage(pageNum);
    } catch (error) {
      Alert.alert('Error', 'Failed to load files');
    } finally {
      setIsLoadingFiles(false);
      setIsLoadingMore(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadCategories();
    }, [])
  );

  const handleAddCategory = () => {
    router.push('/category/new');
  };

  const handleCategoryPress = (id: string) => {
    if (isSelectionMode) {
      setSelectedModeCategories(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
          // If no categories are selected, exit selection mode
          if (newSet.size === 0) {
            setIsSelectionMode(false);
          }
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    } else {
      router.push(`/category/${id}`);
    }
  };

  const handleCheckmarkPress = (e: any, id: string) => {
    e.stopPropagation(); // Prevent category press event
    
    // Only allow checkmark toggle if not in selection mode
    if (!isSelectionMode) {
      setSelectedCategories(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
      // Force category list to update
      categoryListRef.current?.prepareForLayoutAnimationRender();
      // Update files based on checked categories
      loadFiles(1, true);
    }
  };

  const handleCategoryLongPress = (id: string) => {
    setIsSelectionMode(true);
    setSelectedModeCategories(new Set([id]));
  };

  const handleDeleteSelected = () => {
    const toDelete = Array.from(selectedCategories);
    setCategoriesToDelete(toDelete);
    setShowDeleteConfirm(true);
  };

  const handleEditCategory = (id: string) => {
    // Clear selection before navigating to edit
    setIsSelectionMode(false);
    setSelectedCategories(new Set());
    
    router.push({
      pathname: '/category/new',
      params: { 
        id,
        mode: 'edit',
        title: 'Edit Category'
      }
    });
  };

  const handleDeleteCategories = () => {
    if (selectedModeCategories.size === 0) return;
    
    const categoryNames = Array.from(selectedModeCategories)
      .map(id => categories.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    showDialog({
      title: 'Delete Categories',
      message: `Are you sure you want to delete these categories?\n\n${categoryNames}`,
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const id of selectedModeCategories) {
                await deleteCategory(id);
              }
              setIsSelectionMode(false);
              setSelectedModeCategories(new Set());
              loadCategories();
            } catch (error) {
              showToast('error', 'Failed to delete categories');
            }
          }
        }
      ]
    });
  };

  const handleSortPress = () => {
    setShowSortModal(true);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort);
  };

  // Memoize visible files to prevent unnecessary re-renders
  const visibleFiles = useMemo(() => {
    return files.map(file => {
      // Extract the actual file name from the URI
      const uriParts = file.uri.split('/');
      const fileName = uriParts[uriParts.length - 1];
      const cleanFileName = decodeURIComponent(fileName);
      
      // Get the clean directory path
      const pathParts = file.uri.split('/document/')[1]?.split('/') || [];
      const cleanPath = pathParts.slice(0, -1).join('/');
      
      return {
        ...file,
        name: cleanFileName,
        displayPath: cleanPath,
        displayName: cleanFileName
      };
    });
  }, [files]);

  // Optimized file opening handler
  const handleFilePress = useCallback((file: FileItemType) => {
    if (isFileSelectionMode) {
      if (selectedFiles.has(file.path)) {
        const newSelectedFiles = new Set(selectedFiles);
        newSelectedFiles.delete(file.path);
        setSelectedFiles(newSelectedFiles);
        // Deactivate selection mode if no files are selected
        if (newSelectedFiles.size === 0) {
          setIsFileSelectionMode(false);
        }
      } else {
        setSelectedFiles(new Set([...selectedFiles, file.path]));
      }
    } else {
      router.push(`/file/${encodeURIComponent(file.path)}`);
    }
  }, [isFileSelectionMode, selectedFiles, router]);

  const handleInverseSelection = useCallback(() => {
    const newSelectedFiles = new Set(
      visibleFiles
        .filter(file => !selectedFiles.has(file.path))
        .map(file => file.path)
    );
    setSelectedFiles(newSelectedFiles);
    // Deactivate selection mode if no files are selected after inverse
    if (newSelectedFiles.size === 0) {
      setIsFileSelectionMode(false);
    }
  }, [visibleFiles, selectedFiles]);

  const handleFileLongPress = (file: FileItem) => {
    // Just enter selection mode and select the file
    setIsFileSelectionMode(true);
    setSelectedFiles(new Set([file.path]));
  };

  const handleFileDelete = async (file: FileItem) => {
    try {
      // Implement file deletion logic
      loadFiles(1, true);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete file');
    }
  };

  const handleFileRename = async (file: FileItem, newName: string) => {
    try {
      // Implement file renaming logic
      loadFiles(1, true);
    } catch (error) {
      Alert.alert('Error', 'Failed to rename file');
    }
  };

  const handleFileSave = async (file: FileItemType) => {
    try {
      let saveDir = await getSaveDirectory();
      
      if (!saveDir) {
        // First time saving, prompt for directory
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          throw new Error('Permission to access directory was denied');
        }
        
        saveDir = permissions.directoryUri;
        await setSaveDirectory(saveDir);
      }
      
      await saveFile(file.uri, file.name);
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  };

  const handleBatchSave = async (files: FileItemType[]) => {
    try {
      let saveDir = await getSaveDirectory();
      
      if (!saveDir) {
        // First time saving, prompt for directory
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          throw new Error('Permission to access directory was denied');
        }
        
        saveDir = permissions.directoryUri;
        await setSaveDirectory(saveDir);
      }
      
      await saveFiles(files.map(file => ({ uri: file.uri, name: file.name })));
      Alert.alert(
        'Success',
        `Successfully saved ${files.length} file${files.length > 1 ? 's' : ''}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save files');
    }
    setIsFileSelectionMode(false);
    setSelectedCategories(new Set());
  };

  const handleSaveButtonPress = () => {
    const selectedFilesList = visibleFiles.filter(f => selectedFiles.has(f.path));
    handleBatchSave(selectedFilesList);
  };

  const renderCategorySelectionHeader = () => (
    <View className="px-4 flex-row justify-between items-center mb-2">
      <Text variant="h4" weight="semibold" className="text-neutral-900 dark:text-white">
        Categories
      </Text>
      {isSelectionMode && selectedModeCategories.size > 0 && (
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => {
              setSelectedModeCategories(new Set(categories.map(c => c.id)));
            }}
            className="mr-4"
          >
            <Text className="text-primary-600">Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const allIds = new Set(categories.map(c => c.id));
              const invertedSelection = new Set(
                categories
                  .filter(c => !selectedModeCategories.has(c.id))
                  .map(c => c.id)
              );
              setSelectedModeCategories(invertedSelection);
            }}
            className="mr-4"
          >
            <Text className="text-primary-600">Invert</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setIsSelectionMode(false);
              setSelectedModeCategories(new Set());
            }}
            className="mr-4"
          >
            <Text className="text-primary-600">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteCategories}
            className="mr-4"
          >
            <Text className="text-red-500">Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderCategoryItem = ({ item: category }: { item: Category }) => (
    <TouchableOpacity
      onPress={() => handleCategoryPress(category.id)}
      onLongPress={() => handleCategoryLongPress(category.id)}
      activeOpacity={0.7}
      className={`mr-4 p-3 min-w-[180px] rounded-lg ${
        isSelectionMode && selectedModeCategories.has(category.id)
          ? 'border-2 border-primary-500/50'  // Add border for selected items
          : 'border-2 border-transparent'      // Transparent border for unselected
      }`}
      style={{
        backgroundColor: isSelectionMode && selectedModeCategories.has(category.id)
          ? 'rgba(0, 119, 255, 0.15)'
          : isDarkMode
          ? `${category.color}15`
          : `${category.color}10`,
        shadowColor: isSelectionMode && selectedModeCategories.has(category.id)
          ? '#0077ff'
          : 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: isSelectionMode && selectedModeCategories.has(category.id) ? 4 : 0
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-3">
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: isDarkMode ? `${category.color}25` : `${category.color}15` }}
          >
            <Ionicons name="folder" size={20} color={category.color} />
          </View>
          <View className="ml-3 flex-1">
            <Text
              variant="body"
              weight="medium"
              numberOfLines={1}
              className="text-neutral-900 dark:text-white"
            >
              {category.name}
            </Text>
            <Text
              variant="caption"
              className="text-neutral-600 dark:text-neutral-400"
            >
              {category.directories.length} {category.directories.length === 1 ? 'folder' : 'folders'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={(e) => handleCheckmarkPress(e, category.id)}
          className="p-2 -mr-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={isSelectionMode} // Disable checkmark interaction in selection mode
        >
          <Ionicons
            name={selectedCategories.has(category.id) ? "checkmark-circle" : "checkmark-circle-outline"}
            size={26}
            color={selectedCategories.has(category.id) ? category.color : isDarkMode ? '#64748b' : '#94a3b8'}
            style={{ opacity: isSelectionMode ? 0.5 : 1 }} // Dim the checkmark in selection mode
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderFileList = () => (
    <FileList
      files={visibleFiles}
      isLoading={isLoadingFiles}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      onLoadMore={() => {
        if (!isLoadingMore && hasMore) {
          loadFiles(page + 1);
        }
      }}
      onRefresh={() => loadFiles(1, true)}
      sortOption={sortOption}
      onSortChange={handleSortChange}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showSortModal={showSortModal}
      onSortModalChange={setShowSortModal}
    />
  );

  const renderCategoryList = () => (
    <FlashList<Category>
      ref={categoryListRef}
                horizontal
                data={categories}
      extraData={[selectedCategories, isSelectionMode]} // Add state dependencies
      renderItem={({ item }: { item: Category }) => renderCategoryItem({ item })}
      keyExtractor={(item: Category) => item.id}
      estimatedItemSize={180}
                showsHorizontalScrollIndicator={false}
      ListFooterComponent={() => (
              <TouchableOpacity
          onPress={handleAddCategory}
          className="items-center justify-center my-2 w-12 h-12 rounded-full bg-white dark:bg-neutral-800"
              >
                <Ionicons
            name="add-circle-outline"
            size={24}
            color={isDarkMode ? '#fff' : '#000'}
          />
              </TouchableOpacity>
      )}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    />
  );

  const renderFileSelectionOptions = () => (
    <View className="flex-row items-center justify-between px-4 py-2">
      <View className="flex-row items-center">
        <Text className="text-neutral-900 dark:text-white font-medium">
          {selectedFiles.size} selected
        </Text>
      </View>
      <View className="flex-row items-center">
        <TouchableOpacity
          onPress={() => {
            setSelectedFiles(new Set(visibleFiles.map(file => file.path)));
          }}
          className="px-4"
        >
          <Text className="text-primary-500">Select All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleInverseSelection}
          className="px-4"
        >
          <Text className="text-primary-500">Inverse</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setSelectedFiles(new Set());
            setIsFileSelectionMode(false);
          }}
          className="pl-4"
        >
          <Text className="text-primary-500">Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isCategoriesLoading) {
    return (
      <View className="flex-1 bg-neutral-50 dark:bg-neutral-900">
        <Loading fullScreen text="Loading..." />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <View className={`px-4 py-3 border-b ${isDarkMode ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
        <View className="flex-row items-center justify-between">
          <LogoTitle />
        </View>
      </View>

      {categories.length === 0 ? (
        <EmptyState
          icon="folder-outline"
          title="No Categories Yet"
          description="Create categories to organize your files and folders."
          action={{
            label: "Create Category",
            icon: "add-circle-outline",
            onPress: handleAddCategory,
          }}
        />
      ) : (
        <>
          <View className="flex-1">
            {/* Categories List */}
            <View>
              {renderCategorySelectionHeader()}
              {renderCategoryList()}
            </View>

            {/* File Selection Options */}
            {isFileSelectionMode && (
              <View className="border-b border-neutral-200 dark:border-neutral-800">
                {renderFileSelectionOptions()}
              </View>
            )}

            {/* Files List */}
            <View style={{ flex: 1 }}>
              {renderFileList()}
            </View>
          </View>

          {/* Floating Add Button */}
          <TouchableOpacity
            onPress={handleAddCategory}
            className="absolute bottom-6 right-6 w-14 h-14 bg-primary-600 rounded-full items-center justify-center shadow-lg"
            style={{
              shadowColor: isDarkMode ? '#0077ff' : '#0077ff',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDarkMode ? 0.4 : 0.25,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </TouchableOpacity>

          <SortModal
            visible={showSortModal}
            onClose={() => setShowSortModal(false)}
            currentSort={sortOption}
            onSortChange={handleSortChange}
          />

          {/* Delete Confirmation Modal */}
          <Modal
            visible={showDeleteConfirm}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDeleteConfirm(false)}
          >
            <View className="flex-1 bg-black/50 items-center justify-center">
              <View className="bg-white dark:bg-neutral-800 rounded-lg p-4 m-4">
                <Text variant="h4" weight="semibold" className="text-neutral-900 dark:text-white mb-2">
                  Delete Categories?
                </Text>
                <Text className="text-neutral-600 dark:text-neutral-400 mb-4">
                  Are you sure you want to delete {categoriesToDelete.length} categories? This action cannot be undone.
                </Text>
                <View className="flex-row justify-end">
                  <TouchableOpacity
                    onPress={() => setShowDeleteConfirm(false)}
                    className="mr-4"
                  >
                    <Text className="text-neutral-600 dark:text-neutral-400">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDeleteSelected}>
                    <Text className="text-red-500">Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}


