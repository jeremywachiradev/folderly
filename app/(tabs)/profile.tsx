import React, { useEffect } from 'react';
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

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, isGuest } = useAuth();
  const { categories, setCategories } = useCategories();
  const { settings } = useSettings();
  const { themePreference, setThemePreference, isDarkMode } = useTheme();

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
        await showDialog({
          title: 'No Categories',
          message: 'You have no categories to export. Please create some categories first.',
          buttons: [
            {
              text: 'OK',
              onPress: () => {},
            }
          ]
        });
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
      const importedConfig = await importConfig();
      
      if (!importedConfig) {
        return; // User cancelled or error was already handled
      }

      // Confirm with user before overwriting
      const result = await showDialog({
        title: 'Import Configuration',
        message: `This will replace your current categories with ${importedConfig.categories.length} imported categories. Do you want to continue?`,
        buttons: [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {},
          },
          {
            text: 'Import',
            onPress: async () => {
              try {
                await setCategories(importedConfig.categories);
                showToast('success', `Successfully imported ${importedConfig.categories.length} categories.`);
              } catch (error) {
                showToast('error', 'Failed to save imported categories. Please try again.');
              }
            }
          }
        ]
      });
    } catch (error) {
      showToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Failed to import configuration. Please make sure the file is a valid Folderly configuration.'
      );
    }
  };

  const handleThemeChange = async (newTheme: ThemePreference) => {
    try {
      await setThemePreference(newTheme);
    } catch (error) {
      showToast('error', 'Failed to update theme');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <ScrollView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
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
    </SafeAreaView>
  );
}
