// Home.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Pressable, Alert, Modal } from 'react-native';
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
import { FileViewer } from '@/components/FileViewer';
import { useRef } from 'react';
import { FlashList } from '@shopify/flash-list';
import { FileItem as FileItemType } from '@/types';
import { saveFile, saveFiles, getSaveDirectory, setSaveDirectory } from '@/lib/fileSystem';
import { StorageAccessFramework } from 'expo-file-system';

function LogoTitle() {
  const { isDarkMode } = useTheme();
  return (
    <View className="px-4">
      <Logo size="sm" variant="horizontal" />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { categories, isLoading, loadCategories } = useCategories();
  const { isDarkMode } = useTheme();
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoriesToDelete, setCategoriesToDelete] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isFileSelectionMode, setIsFileSelectionMode] = useState(false);
  const [currentFile, setCurrentFile] = useState<FileItem | null>(null);
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);
  const bottomSheetRef = useRef<any>(null);
  const [checkedCategories, setCheckedCategories] = useState<Set<string>>(new Set());
  const categoryListRef = useRef<any>(null);

  // Initialize selected categories
  useEffect(() => {
    const initialSelected = new Set(categories.map(cat => cat.id));
    setSelectedCategories(initialSelected);
  }, [categories]);

  // Initialize checked categories
  useEffect(() => {
    const initialChecked = new Set(categories.map(cat => cat.id));
    setCheckedCategories(initialChecked);
  }, [categories]);

  // Load files when categories or sort option changes
  useEffect(() => {
    // Only reload files when sort option changes or when categories array changes (not selection)
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

  // Clear selection when screen loses focus (user navigates away)
  useFocusEffect(
    React.useCallback(() => {
      // This runs when screen comes into focus
      
      return () => {
        // This runs when screen loses focus
        setIsSelectionMode(false);
        setSelectedCategories(new Set());
      };
    }, [])
  );

  const loadFiles = async (pageNum: number, reset: boolean = false) => {
    try {
      if (!hasMore && !reset) return;
      if (pageNum === 1) {
        setIsLoadingFiles(true);
        setAllFiles([]); // Clear only on explicit refresh
      } else {
        setIsLoadingMore(true);
      }

      const checkedCats = categories.filter(cat => checkedCategories.has(cat.id));
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

      setAllFiles(prev => {
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
      setSelectedCategories(prev => {
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
      setCheckedCategories(prev => {
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
    setSelectedCategories(new Set([id]));
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
    if (selectedCategories.size === 0) return;
    
    const categoryNames = Array.from(selectedCategories)
      .map(id => categories.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    Alert.alert(
      'Delete Categories',
      `Are you sure you want to delete these categories?\n\n${categoryNames}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const id of selectedCategories) {
        await deleteCategory(id);
      }
      setIsSelectionMode(false);
              setSelectedCategories(new Set());
      loadCategories();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete categories');
    }
          }
        }
      ]
    );
  };

  const handleSortPress = () => {
    setShowSortModal(true);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort);
  };

  // Memoize visible files to prevent unnecessary re-renders
  const visibleFiles = useMemo(() => {
    return allFiles.map(file => ({
      ...file,
      displayName: `${file.name} (${categories.find(c => c.id === file.categoryId)?.name || 'Unknown'})`
    }));
  }, [allFiles, categories]);

  const handleFilePress = (file: FileItem, index: number) => {
    if (isFileSelectionMode) {
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        if (newSet.has(file.path)) {
          newSet.delete(file.path);
        } else {
          newSet.add(file.path);
        }
        return newSet;
      });
    } else {
      setCurrentFile(file);
      setCurrentFileIndex(index);
      bottomSheetRef.current?.present();
    }
  };

  const handleFileLongPress = (file: FileItem) => {
    setIsFileSelectionMode(true);
    setSelectedFiles(new Set([file.path]));
  };

  const handleFileNavigate = (index: number) => {
    if (index >= 0 && index < visibleFiles.length) {
      setCurrentFile(visibleFiles[index]);
      setCurrentFileIndex(index);
    }
  };

  const handleFileDelete = async (file: FileItem) => {
    try {
      // Implement file deletion logic
      bottomSheetRef.current?.dismiss();
      loadFiles(1, true);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete file');
    }
  };

  const handleFileRename = async (file: FileItem, newName: string) => {
    try {
      // Implement file renaming logic
      bottomSheetRef.current?.dismiss();
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
    setSelectedFiles(new Set());
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
      {isSelectionMode && selectedCategories.size > 0 && (
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => {
              setSelectedCategories(new Set(categories.map(c => c.id)));
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
                  .filter(c => !selectedCategories.has(c.id))
                  .map(c => c.id)
              );
              setSelectedCategories(invertedSelection);
            }}
            className="mr-4"
          >
            <Text className="text-primary-600">Invert</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setSelectedCategories(new Set());
              setIsSelectionMode(false);
            }}
            className="mr-4"
          >
            <Text className="text-primary-600">Unselect All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteCategories}
            className="mr-4"
          >
            <Text className="text-red-500">Delete</Text>
          </TouchableOpacity>
          {selectedCategories.size === 1 && (
            <TouchableOpacity
              onPress={() => handleEditCategory(Array.from(selectedCategories)[0])}
              className="mr-4"
            >
              <Text className="text-primary-600">Edit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              setIsSelectionMode(false);
              setSelectedCategories(new Set());
            }}
          >
            <Text className="text-neutral-600 dark:text-neutral-400">Cancel</Text>
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
        isSelectionMode && selectedCategories.has(category.id)
          ? 'border-2 border-primary-500/50'  // Add border for selected items
          : 'border-2 border-transparent'      // Transparent border for unselected
      }`}
      style={{
        backgroundColor: isSelectionMode && selectedCategories.has(category.id)
          ? 'rgba(0, 119, 255, 0.15)'
          : isDarkMode
          ? `${category.color}15`
          : `${category.color}10`,
        shadowColor: isSelectionMode && selectedCategories.has(category.id)
          ? '#0077ff'
          : 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: isSelectionMode && selectedCategories.has(category.id) ? 4 : 0
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
          disabled={isSelectionMode}
        >
          <Ionicons
            name={checkedCategories.has(category.id) ? "checkmark-circle" : "checkmark-circle-outline"}
            size={26}
            color={checkedCategories.has(category.id) ? category.color : isDarkMode ? '#64748b' : '#94a3b8'}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderFileItem = ({ item, index }: { item: FileItemType; index: number }) => (
    <TouchableOpacity
      onPress={() => {
        if (isFileSelectionMode) {
          setSelectedFiles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(item.path)) {
              newSet.delete(item.path);
              // If no files are selected, exit selection mode
              if (newSet.size === 0) {
                setIsFileSelectionMode(false);
              }
            } else {
              newSet.add(item.path);
            }
            return newSet;
          });
        } else {
          setCurrentFile(item);
          setCurrentFileIndex(index);
          bottomSheetRef.current?.present();
        }
      }}
      onLongPress={() => {
        if (!isFileSelectionMode) {
          setIsFileSelectionMode(true);
          setSelectedFiles(new Set([item.path]));
        }
      }}
      activeOpacity={0.7}
      className={`px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 ${
        isFileSelectionMode && selectedFiles.has(item.path)
          ? 'bg-primary-50 dark:bg-primary-900'
          : ''
      }`}
    >
      <FileItemComponent
        file={item}
        selected={isFileSelectionMode && selectedFiles.has(item.path)}
      />
    </TouchableOpacity>
  );

  const renderFileList = () => (
    <FlashList<FileItemType>
      data={visibleFiles}
      renderItem={({ item, index }: { item: FileItemType; index: number }) => renderFileItem({ item, index })}
      keyExtractor={(item: FileItemType) => item.path}
      estimatedItemSize={80}
      onEndReached={() => {
        if (!isLoadingMore && hasMore) {
          loadFiles(page + 1);
        }
      }}
      onEndReachedThreshold={0.2}
      refreshControl={
        <RefreshControl
          refreshing={isLoadingFiles}
          onRefresh={() => loadFiles(1, true)}
          colors={[isDarkMode ? '#0077ff' : '#0077ff']}
          tintColor={isDarkMode ? '#0077ff' : '#0077ff'}
        />
      }
      ListEmptyComponent={
        !isLoadingFiles && visibleFiles.length === 0 ? (
          <EmptyState
            icon="document-outline"
            title="No files found"
            description="Select categories to view files"
          />
        ) : null
      }
      ListFooterComponent={() => (
        isLoadingMore && hasMore ? (
          <View className="py-4">
            <Loading text="Loading more..." />
          </View>
        ) : null
      )}
    />
  );

  const renderCategoryList = () => (
    <FlashList<Category>
      ref={categoryListRef}
                horizontal
                data={categories}
      extraData={[selectedCategories, checkedCategories, isSelectionMode]} // Add state dependencies
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
                  <View className="px-4 py-2 flex-row justify-between items-center border-b border-neutral-200 dark:border-neutral-800">
                    <View className="flex-row">
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedFiles(new Set(visibleFiles.map(f => f.path)));
                        }}
                        className="mr-4"
                      >
                        <Text className="text-primary-600">Select All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          const invertedSelection = new Set(
                            visibleFiles
                              .filter(f => !selectedFiles.has(f.path))
                              .map(f => f.path)
                          );
                          setSelectedFiles(invertedSelection);
                        }}
                        className="mr-4"
                      >
                        <Text className="text-primary-600">Invert</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            'Delete Files',
                            `Are you sure you want to delete ${selectedFiles.size} files?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                  // Implement bulk delete
                                  setIsFileSelectionMode(false);
                                  setSelectedFiles(new Set());
                                  loadFiles(1, true);
                                }
                              }
                            ]
                          );
                        }}
                        className="mr-4"
                      >
                        <Text className="text-red-500">Delete</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
          onPress={handleSaveButtonPress}
                        className="mr-4"
                      >
                        <Text className="text-primary-600">Save</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setIsFileSelectionMode(false);
                        setSelectedFiles(new Set());
                      }}
                    >
                      <Text className="text-neutral-600 dark:text-neutral-400">Cancel</Text>
                    </TouchableOpacity>
                  </View>
  );

  if (isLoading) {
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
            <View className="pt-4">
              {renderCategorySelectionHeader()}
              {renderCategoryList()}
                    </View>

            {/* Filters Button */}
            <View className="px-4 py-3 flex-row justify-end border-b border-neutral-200 dark:border-neutral-800">
              <TouchableOpacity
                onPress={handleSortPress}
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
              </View>

            {/* Files List */}
            {renderFileList()}
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

          {currentFile && (
            <FileViewer
              ref={bottomSheetRef}
              file={currentFile}
              files={visibleFiles}
              currentIndex={currentFileIndex}
              onNavigate={handleFileNavigate}
              onDelete={handleFileDelete}
              onRename={handleFileRename}
              onSave={handleFileSave}
              onClose={() => {
                setCurrentFile(null);
                setCurrentFileIndex(-1);
              }}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}


