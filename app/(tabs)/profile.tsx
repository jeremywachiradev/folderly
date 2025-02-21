import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-provider';
import { useCategories } from '@/lib/category-provider';
import { useSettings } from '@/lib/settings-provider';
import { useTheme, ThemePreference } from '@/lib/theme-provider';
import { exportConfig, importConfig } from '@/lib/configShare';
import { Button, Card, Text } from '@/components/ui';
import { showDialog, showToast } from '@/lib/notifications';
import { Portal, Modal as PaperModal } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageAccessFramework, cacheDirectory, writeAsStringAsync } from 'expo-file-system';
import { getSaveDirectory, setSaveDirectory, saveFile } from '@/lib/fileSystem';

const CATEGORIES_STORAGE_KEY = '@folderly/categories';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, isGuest } = useAuth();
  const { categories, setCategories } = useCategories();
  const { settings } = useSettings();
  const { themePreference, setThemePreference, isDarkMode } = useTheme();
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importedConfig, setImportedConfig] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      router.replace('/sign-in');
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (error) {
      showToast('error', 'Failed to sign out');
    }
  };

  const handleExportConfig = async () => {
    try {
      if (categories.length === 0) {
        showToast('error', 'You have no categories to export. Please create some categories first.');
        return;
      }

      await exportConfig(categories, settings);
      showToast('success', 'Configuration exported successfully. You can now share this file with others or keep it as a backup.');
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to export configuration'
      );
    }
  };

  const handleImportConfig = async () => {
    try {
      const config = await importConfig();
      
      if (!config) {
        return; // User cancelled or error was already handled
      }

      setImportedConfig(config);
      setShowImportConfirm(true);
    } catch (error) {
      showToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Failed to import configuration. Please make sure the file is a valid Folderly configuration.'
      );
    }
  };

  const handleConfirmImport = async () => {
    try {
      // Save to AsyncStorage first
      await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(importedConfig.categories));
      // Then update the state
      await setCategories(importedConfig.categories);
      showToast('success', `Successfully imported ${importedConfig.categories.length} categories.`);
    } catch (error) {
      showToast('error', 'Failed to save imported categories. Please try again.');
    } finally {
      setShowImportConfirm(false);
      setImportedConfig(null);
    }
  };

  const handleThemeChange = async (newTheme: ThemePreference) => {
    try {
      await setThemePreference(newTheme);
    } catch (error) {
      showToast('error', 'Failed to update theme');
    }
  };

  const handleSaveConfig = async () => {
    try {
      if (categories.length === 0) {
        showToast('error', 'You have no categories to save. Please create some categories first.');
        return;
      }

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

      const config = {
        version: '1.1.0',
        categories,
        settings,
        timestamp: Date.now()
      };

      const configJson = JSON.stringify(config, null, 2);
      const fileName = `folderly_config_${new Date().toISOString().split('T')[0]}.json`;
      const tempUri = `${cacheDirectory}${fileName}`;

      await writeAsStringAsync(tempUri, configJson);
      await saveFile(tempUri, fileName);
      
      showToast('success', 'Configuration saved successfully to your save directory.');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to save configuration');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <ScrollView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <Text variant="h4" weight="medium" className="text-neutral-900 dark:text-white">
            Profile
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

        {/* Profile Header */}
        <Card variant="elevated" className="m-4">
          <View className="p-6">
            <View className="flex-row items-center">
              <View className="w-16 h-16 bg-primary-50 dark:bg-primary-900/30 rounded-full items-center justify-center">
                {user.avatar ? (
                  <Image
                    source={{ uri: user.avatar }}
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <Text variant="h2" weight="medium" color="primary">
                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </Text>
                )}
              </View>
              <View className="ml-4">
                <Text variant="h4" weight="medium" className="text-neutral-900 dark:text-white">
                  {user.name || user.email}
                </Text>
                {isGuest ? (
                  <Text variant="body" className="text-neutral-500 dark:text-neutral-400 mt-1">
                    Limited functionality available
                  </Text>
                ) : (
                  <Text variant="body" className="text-neutral-500 dark:text-neutral-400 mt-1">
                    {user.email}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Card>

        

        {/* Settings */}
        <Card variant="elevated" className="mx-4 mb-4">
          <View className="p-6">
            <Text variant="h4" weight="medium" className="mb-4 text-neutral-900 dark:text-white">
              Settings
            </Text>

            {/* Configuration Management - Only show if not guest */}
            {!isGuest && (
              <View className="space-y-4 mb-8">
                <Button
                  variant="outline"
                  icon="save-outline"
                  onPress={handleSaveConfig}
                >
                  Save Configuration
                </Button>

                <Button
                  variant="outline"
                  icon="share-outline"
                  onPress={handleExportConfig}
                >
                  Export Configuration
                </Button>

                <Button
                  variant="outline"
                  icon="download-outline"
                  onPress={handleImportConfig}
                >
                  Import Configuration
                </Button>
              </View>
            )}

            {/* Sign Out Button */}
            <Button
              variant="danger"
              icon="log-out-outline"
              onPress={handleSignOut}
            >
              {isGuest ? 'Exit Guest Mode' : 'Sign Out'}
            </Button>
          </View>
        </Card>
      </ScrollView>

      {/* Import Confirmation Modal */}
      <Portal>
        <PaperModal
          visible={showImportConfirm}
          onDismiss={() => {
            setShowImportConfirm(false);
            setImportedConfig(null);
          }}
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
                Import Configuration
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowImportConfirm(false);
                  setImportedConfig(null);
                }}
              >
                <Ionicons name="close" size={24} color={isDarkMode ? '#ffffff' : '#000000'} />
              </TouchableOpacity>
            </View>

            <Text className="text-base text-neutral-600 dark:text-neutral-400 mb-6">
              This will replace your current categories with {importedConfig?.categories?.length || 0} imported categories. Do you want to continue?
            </Text>

            <View className="flex-row justify-end space-x-4">
              <TouchableOpacity 
                onPress={() => {
                  setShowImportConfirm(false);
                  setImportedConfig(null);
                }}
                className="px-4 py-2"
              >
                <Text className="text-neutral-500">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleConfirmImport}
                className="bg-primary-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">Import</Text>
              </TouchableOpacity>
            </View>
          </View>
        </PaperModal>
      </Portal>
    </SafeAreaView>
  );
}
