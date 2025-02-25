import { View, TouchableOpacity, Dimensions, Alert, ScrollView, Animated } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FileItem, Category, SortOption } from '@/types';
import { useCategories } from '@/lib/category-provider';
import { useTheme } from '@/lib/theme-provider';
import { Text } from '@/components/ui';
import { deleteCategory } from '@/lib/categoryManager';
import { listFiles } from '@/lib/fileManager';
import { FileList } from '@/components/FileList/index';
import { SortModal } from '@/components/SortModal';
import { showDialog, showToast } from '@/lib/notifications';
import { Modal as PaperModal, Portal } from 'react-native-paper';
import { useAuth } from '@/lib/auth-provider';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = SCREEN_WIDTH / 2;

export default function CategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { isDarkMode } = useTheme();
  const { categories, loadCategories } = useCategories();
  const { user } = useAuth();
  const [category, setCategory] = useState<Category | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [showSortModal, setShowSortModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = 200;

  // Initialize animated value
  useEffect(() => {
    scrollY.setValue(0);
  }, []);

  useEffect(() => {
    if (!id) return;
    
    const category = categories.find(c => c.id === id);
    if (!category) {
      showToast('error', 'Category not found');
      router.back();
      return;
    }
    
    setCategory(category);
    loadFiles(category, 1, true);
  }, [id, categories]);

  const loadFiles = async (cat: Category, pageNum: number = 1, reset: boolean = false) => {
    try {
      if (pageNum === 1) {
        setIsLoadingFiles(true);
      } else {
        setIsLoadingMore(true);
      }

      const { files: newFiles, hasMore: more } = await listFiles(cat.directories, pageNum, sortOption);
      
      setFiles(prev => {
        if (reset || pageNum === 1) return newFiles;
        return [...prev, ...newFiles];
      });
      setHasMore(more);
      setPage(pageNum);
    } catch (error) {
      showToast('error', 'Failed to load files');
    } finally {
      setIsLoadingFiles(false);
      setIsLoadingMore(false);
    }
  };

  const handleEdit = () => {
    if (!category) return;
    router.push({
      pathname: '/category/new',
      params: { 
        id: category.id,
        mode: 'edit',
        title: 'Edit Category'
      }
    });
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteCategory = async () => {
    try {
      setIsDeleting(true);
      const categoryId = Array.isArray(id) ? id[0] : id;
      await deleteCategory(categoryId, user?.$id || user?.id || 'guest');
      showToast('success', 'Category deleted successfully');
      router.push('/');
    } catch (error) {
      console.error('Error deleting category:', error);
      showToast('error', 'Failed to delete category');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && category) {
      loadFiles(category, page + 1);
    }
  }, [isLoadingMore, hasMore, category, page]);

  const handleRefresh = useCallback(() => {
    if (category) {
      loadFiles(category, 1, true);
    }
  }, [category]);

  const handleSortChange = useCallback((newSort: SortOption) => {
    setSortOption(newSort);
    if (category) {
      loadFiles(category, 1, true);
    }
  }, [category]);

  // Update header animations with native driver
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, headerHeight],
    outputRange: [0, -headerHeight + 64],
    extrapolate: 'clamp'
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [headerHeight - 100, headerHeight],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  const minimizedHeaderOpacity = scrollY.interpolate({
    inputRange: [headerHeight - 100, headerHeight],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const contentTranslateY = scrollY.interpolate({
    inputRange: [0, headerHeight],
    outputRange: [0, -headerHeight + 64],
    extrapolate: 'clamp'
  });

  const handleDeletePress = () => {
    setShowDeleteConfirm(true);
  };

  if (!category) return null;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
      <Stack.Screen
        options={{
          headerShown: false
        }}
      />

      {/* Minimized Header - Shows when scrolled */}
      <Animated.View 
        className="absolute top-0 left-0 right-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800"
        style={[{
          height: 64,
          zIndex: 2
        }, {
          transform: [{ translateY: headerTranslateY }],
          opacity: minimizedHeaderOpacity
        }]}
      >
        <View className="flex-row items-center justify-between px-4 h-full">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity 
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name="chevron-back" 
                size={28} 
                color={isDarkMode ? '#ffffff' : '#000000'} 
              />
            </TouchableOpacity>
            <Text
              variant="h3"
              weight="semibold"
              className="text-neutral-900 dark:text-white ml-3 flex-1"
              numberOfLines={1}
            >
              {category?.name}
            </Text>
          </View>
          <View className="flex-row gap-4">
            <TouchableOpacity onPress={handleEdit}>
              <Ionicons 
                name="pencil" 
                size={24} 
                color={isDarkMode ? '#ffffff' : '#000000'} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeletePress}>
              <Ionicons 
                name="trash-outline" 
                size={24} 
                color={isDarkMode ? '#ffffff' : '#000000'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.View 
        className="flex-1"
        style={{
          transform: [{ translateY: contentTranslateY }]
        }}
      >
        {/* Full Header - Animates out when scrolled */}
        <Animated.View 
          className="border-b border-neutral-200 dark:border-neutral-800"
          style={{
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }]
          }}
        >
          <View className="p-4">
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity 
                onPress={() => router.back()}
                className="p-2 -ml-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name="chevron-back" 
                  size={28} 
                  color={isDarkMode ? '#ffffff' : '#000000'} 
                />
              </TouchableOpacity>
              <View className="flex-row gap-4">
                <TouchableOpacity 
                  onPress={handleEdit}
                  className="p-2"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons 
                    name="pencil" 
                    size={24} 
                    color={isDarkMode ? '#ffffff' : '#000000'} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleDeletePress}
                  className="p-2"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons 
                    name="trash-outline" 
                    size={24} 
                    color={isDarkMode ? '#ffffff' : '#000000'} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-lg items-center justify-center"
                style={{ backgroundColor: `${category?.color}15` }}
              >
                <Ionicons name="folder" size={24} color={category?.color} />
              </View>
              <View className="ml-3 flex-1">
                <Text
                  variant="h4"
                  weight="semibold"
                  className="text-neutral-900 dark:text-white"
                >
                  {category?.name}
                </Text>
                <Text
                  variant="body"
                  className="text-neutral-600 dark:text-neutral-400"
                >
                  {category?.directories.length} {category?.directories.length === 1 ? 'folder' : 'folders'}
                </Text>
              </View>
            </View>

            {/* Directory List */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
              {category?.directories.map((dir) => (
                <View
                  key={dir.path}
                  className="flex-row items-center py-2 px-4 mr-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
                >
                  <Ionicons
                    name="folder-outline"
                    size={20}
                    color={category.color}
                  />
                  <Text
                    variant="body"
                    className="ml-2 text-neutral-600 dark:text-neutral-400"
                  >
                    {dir.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </Animated.View>

        {/* Files Section */}
        <View style={{ flex: 1 }}>
          <FileList
            files={files}
            isLoading={isLoadingFiles}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onRefresh={handleRefresh}
            sortOption={sortOption}
            onSortChange={handleSortChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showSortModal={showSortModal}
            onSortModalChange={setShowSortModal}
          />
        </View>

        {/* Sort Modal */}
        <SortModal
          visible={showSortModal}
          onClose={() => setShowSortModal(false)}
          currentSort={sortOption}
          onSortChange={handleSortChange}
        />

        {/* Delete Confirmation Modal */}
        <Portal>
          <PaperModal
            visible={showDeleteConfirm}
            onDismiss={() => setShowDeleteConfirm(false)}
            contentContainerStyle={{
              backgroundColor: isDarkMode ? '#171717' : 'white',
              margin: 20,
              padding: 20,
              borderRadius: 16,
            }}
          >
            <View>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-rubik-medium text-neutral-900 dark:text-white">
                  Delete Category
                </Text>
                <TouchableOpacity onPress={() => setShowDeleteConfirm(false)}>
                  <Ionicons name="close" size={24} color={isDarkMode ? '#ffffff' : '#000000'} />
                </TouchableOpacity>
              </View>

              <Text className="text-base text-neutral-600 dark:text-neutral-400 mb-6">
                Are you sure you want to delete "{category?.name}"? This action cannot be undone.
              </Text>

              <View className="flex-row justify-end space-x-4">
                <TouchableOpacity 
                  onPress={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2"
                >
                  <Text className="text-neutral-500">Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handleDeleteCategory}
                  className="bg-red-500 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white font-medium">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </PaperModal>
        </Portal>
      </Animated.View>
    </SafeAreaView>
  );
} 