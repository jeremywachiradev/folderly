import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme-provider';
import { Text, Card, DeveloperTag } from '@/components/ui';
import { getSaveDirectory, setSaveDirectory } from '@/lib/fileSystem';
import { StorageAccessFramework } from 'expo-file-system';
import { showDialog, showToast } from '@/lib/notifications';
import { Portal, Modal as PaperModal } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCategories, createCategory, deleteCategory } from '@/lib/categoryManager';
import { useAuth } from '@/lib/auth-provider';
import { useCategories } from '@/lib/category-provider';
import { 
  AndroidDirectory, 
  hasStoragePermissions, 
  requestAndroidPermissions,
  ensureDirectoryUri,
  pathToSafUri
} from '@/lib/androidDirectories';

export default function SettingsScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [saveDir, setSaveDir] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRestoreCategoriesConfirm, setShowRestoreCategoriesConfirm] = useState(false);
  const [showDeleteAllCategoriesConfirm, setShowDeleteAllCategoriesConfirm] = useState(false);
  const { user, signOut } = useAuth();
  const { loadCategories, deleteAllCategories } = useCategories();
  const userId = user?.$id || user?.id || 'guest';
  const [isRestoringCategories, setIsRestoringCategories] = useState(false);
  const [isDeletingCategories, setIsDeletingCategories] = useState(false);

  useEffect(() => {
    loadSaveDirectory();
  }, []);

  const loadSaveDirectory = async () => {
    const dir = await getSaveDirectory();
    setSaveDir(dir);
  };

  const handleChangeSaveDirectory = async () => {
    try {
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        await setSaveDirectory(permissions.directoryUri);
        setSaveDir(permissions.directoryUri);
        showToast('success', 'Save directory updated successfully');
      }
    } catch (error) {
      showToast('error', 'Failed to update save directory');
    }
  };

  const handleResetSaveDirectory = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = async () => {
    try {
      await setSaveDirectory('');
      setSaveDir(null);
      showToast('success', 'Save directory has been reset');
    } catch (error) {
      showToast('error', 'Failed to reset save directory');
    } finally {
      setShowResetConfirm(false);
    }
  };

  const handleRestoreDefaultCategories = () => {
    setShowRestoreCategoriesConfirm(true);
  };

  const handleConfirmRestoreCategories = async () => {
    try {
      setIsRestoringCategories(true);
      
      // Delete existing categories
      const existingCategories = await getCategories();
      for (const category of existingCategories) {
        await deleteCategory(category.id, userId);
      }
      
      // Create default categories
      const defaultCategories = [
        {
          name: 'Telegram Media',
          color: '#0088cc',
          directories: [
            {
              name: 'Telegram Images',
              path: '/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Images',
              type: 'default' as const,
              uri: pathToSafUri('/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Images'),
              validated: true
            },
            {
              name: 'Telegram Video',
              path: '/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Video',
              type: 'default' as const,
              uri: pathToSafUri('/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Video'),
              validated: true
            }
          ],
          isChecked: true
        },
        {
          name: 'WhatsApp Status',
          color: '#25D366',
          directories: [
            {
              name: 'WhatsApp Statuses',
              path: '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses',
              type: 'default' as const,
              uri: pathToSafUri('/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses'),
              validated: true
            }
          ],
          isChecked: true
        }
      ];
      
      // Create each category directly without additional processing
      for (const category of defaultCategories) {
        await createCategory(
          category.name,
          category.color,
          category.directories,
          userId
        );
      }
      
      // Store default categories in AsyncStorage for potential restoration later
      await AsyncStorage.setItem('@folderly/default_categories', JSON.stringify(defaultCategories));
      
      // Reset first login flag to ensure default categories are not recreated on next login
      // since we've just created them
      if (userId) {
        await AsyncStorage.setItem(`first_login_${userId}`, 'true');
      }
      
      // Get the newly created categories to get their IDs
      const newCategories = await getCategories();
      
      // Update selected categories to include all default categories
      const selectedCategoryIds = newCategories.map(cat => cat.id);
      await AsyncStorage.setItem('@folderly/selected_categories', JSON.stringify(selectedCategoryIds));
      
      showToast('success', 'Default categories restored successfully');
      await loadCategories();
    } catch (error) {
      
      showToast('error', 'Failed to restore default categories');
    } finally {
      setIsRestoringCategories(false);
      setShowRestoreCategoriesConfirm(false);
    }
  };

  const handleDeleteAllCategories = () => {
    setShowDeleteAllCategoriesConfirm(true);
  };

  const handleConfirmDeleteAllCategories = async () => {
    try {
      setIsDeletingCategories(true);
      await deleteAllCategories();
      showToast('success', 'All categories deleted successfully');
    } catch (error) {
      
      showToast('error', 'Failed to delete all categories');
    } finally {
      setIsDeletingCategories(false);
      setShowDeleteAllCategoriesConfirm(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={isDarkMode ? '#ffffff' : '#000000'}
            />
          </TouchableOpacity>
          <Text variant="h4" weight="medium" className="text-neutral-900 dark:text-white">
            Settings
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1">
          {/* Save Directory Settings */}
          <Card variant="elevated" className="m-4">
            <View className="p-6">
              <Text variant="h4" weight="medium" className="mb-4 text-neutral-900 dark:text-white">
                Save Directory
              </Text>
              
              <View className="mb-4">
                <Text variant="body" className="text-neutral-600 dark:text-neutral-400 mb-2">
                  Current save directory:
                </Text>
                <Text variant="body" className="text-neutral-900 dark:text-white" numberOfLines={2}>
                  {saveDir ? decodeURIComponent(saveDir.replace('content://', '')) : 'Not set'}
                </Text>
              </View>

              <View className="space-y-4">
                <TouchableOpacity
                  onPress={handleChangeSaveDirectory}
                  className="flex-row items-center justify-between p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="folder-outline"
                      size={24}
                      color={isDarkMode ? '#ffffff' : '#000000'}
                    />
                    <Text variant="body" className="ml-3 text-neutral-900 dark:text-white">
                      Change Save Directory
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={isDarkMode ? '#ffffff' : '#000000'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleResetSaveDirectory}
                  className="flex-row items-center justify-between p-4 bg-red-100 dark:bg-red-900/30 rounded-lg"
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="refresh-outline"
                      size={24}
                      color="#ef4444"
                    />
                    <Text variant="body" className="ml-3 text-red-500">
                      Reset Save Directory
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color="#ef4444"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </Card>

          {/* Categories Settings */}
          <Card variant="elevated" className="m-4">
            <View className="p-6">
              <Text variant="h4" weight="medium" className="mb-4 text-neutral-900 dark:text-white">
                Categories
              </Text>
              
              <View className="space-y-4">
                <TouchableOpacity
                  onPress={handleRestoreDefaultCategories}
                  className="flex-row items-center justify-between p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="refresh-outline"
                      size={24}
                      color="#3b82f6"
                    />
                    <Text variant="body" className="ml-3 text-blue-500">
                      Restore Default Categories
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color="#3b82f6"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDeleteAllCategories}
                  className="flex-row items-center justify-between p-4 bg-red-100 dark:bg-red-900/30 rounded-lg"
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="trash-outline"
                      size={24}
                      color="#ef4444"
                    />
                    <Text variant="body" className="ml-3 text-red-500">
                      Delete All Categories
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color="#ef4444"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </Card>

          {/* Developer Info */}
          <Card variant="elevated" className="m-4 mb-20">
            <View className="p-6">
              <Text variant="h4" weight="medium" className="mb-4 text-neutral-900 dark:text-white">
                About
              </Text>
              
              <Text variant="body" className="mb-6 text-neutral-600 dark:text-neutral-400">
                Folderly helps you organize and manage your files across different folders on your device.
              </Text>
              
              <View className="items-center">
                <DeveloperTag />
              </View>
            </View>
          </Card>
        </ScrollView>

        {/* Reset Save Directory Confirmation Modal */}
        <Portal>
          <PaperModal
            visible={showResetConfirm}
            onDismiss={() => setShowResetConfirm(false)}
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
                  Reset Save Directory
                </Text>
                <TouchableOpacity onPress={() => setShowResetConfirm(false)}>
                  <Ionicons name="close" size={24} color={isDarkMode ? '#ffffff' : '#000000'} />
                </TouchableOpacity>
              </View>

              <Text className="text-base text-neutral-600 dark:text-neutral-400 mb-6">
                Are you sure you want to reset the save directory? You will be prompted to choose a new directory the next time you save a file.
              </Text>

              <View className="flex-row justify-end space-x-4">
                <TouchableOpacity 
                  onPress={() => setShowResetConfirm(false)}
                  className="px-4 py-2"
                >
                  <Text className="text-neutral-500">Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handleConfirmReset}
                  className="bg-red-500 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white font-medium">Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
          </PaperModal>
        </Portal>

        {/* Restore Default Categories Confirmation Modal */}
        <Portal>
          <PaperModal
            visible={showRestoreCategoriesConfirm}
            onDismiss={() => !isRestoringCategories && setShowRestoreCategoriesConfirm(false)}
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
                  Restore Default Categories
                </Text>
                <TouchableOpacity 
                  onPress={() => !isRestoringCategories && setShowRestoreCategoriesConfirm(false)}
                  disabled={isRestoringCategories}
                >
                  <Ionicons 
                    name="close" 
                    size={24} 
                    color={isRestoringCategories 
                      ? (isDarkMode ? '#666666' : '#cccccc') 
                      : (isDarkMode ? '#ffffff' : '#000000')} 
                  />
                </TouchableOpacity>
              </View>

              <Text className="text-base text-neutral-600 dark:text-neutral-400 mb-6">
                This will delete all your current categories and restore only the default Telegram Media and WhatsApp Status categories. Are you sure you want to continue?
              </Text>

              <View className="flex-row justify-end space-x-4">
                <TouchableOpacity 
                  onPress={() => !isRestoringCategories && setShowRestoreCategoriesConfirm(false)}
                  className="px-4 py-2"
                  disabled={isRestoringCategories}
                >
                  <Text className={`text-neutral-${isRestoringCategories ? '400' : '500'}`}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handleConfirmRestoreCategories}
                  className={`bg-blue-${isRestoringCategories ? '400' : '500'} px-4 py-2 rounded-lg flex-row items-center justify-center`}
                  disabled={isRestoringCategories}
                >
                  {isRestoringCategories ? (
                    <>
                      <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                      <Text className="text-white font-medium">Restoring...</Text>
                    </>
                  ) : (
                    <Text className="text-white font-medium">Restore</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </PaperModal>
        </Portal>

        {/* Delete All Categories Confirmation Modal */}
        <Portal>
          <PaperModal
            visible={showDeleteAllCategoriesConfirm}
            onDismiss={() => !isDeletingCategories && setShowDeleteAllCategoriesConfirm(false)}
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
                  Delete All Categories
                </Text>
                <TouchableOpacity 
                  onPress={() => !isDeletingCategories && setShowDeleteAllCategoriesConfirm(false)}
                  disabled={isDeletingCategories}
                >
                  <Ionicons 
                    name="close" 
                    size={24} 
                    color={isDeletingCategories 
                      ? (isDarkMode ? '#666666' : '#cccccc') 
                      : (isDarkMode ? '#ffffff' : '#000000')} 
                  />
                </TouchableOpacity>
              </View>

              <Text className="text-base text-neutral-600 dark:text-neutral-400 mb-6">
                This will delete all your categories. Default categories will be restored the next time you log in or when the app checks for categories. Are you sure you want to continue?
              </Text>

              <View className="flex-row justify-end space-x-4">
                <TouchableOpacity 
                  onPress={() => !isDeletingCategories && setShowDeleteAllCategoriesConfirm(false)}
                  className="px-4 py-2"
                  disabled={isDeletingCategories}
                >
                  <Text className={`text-neutral-${isDeletingCategories ? '400' : '500'}`}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handleConfirmDeleteAllCategories}
                  className={`bg-red-${isDeletingCategories ? '400' : '500'} px-4 py-2 rounded-lg flex-row items-center justify-center`}
                  disabled={isDeletingCategories}
                >
                  {isDeletingCategories ? (
                    <>
                      <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                      <Text className="text-white font-medium">Deleting...</Text>
                    </>
                  ) : (
                    <Text className="text-white font-medium">Delete All</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </PaperModal>
        </Portal>
      </View>
    </SafeAreaView>
  );
}