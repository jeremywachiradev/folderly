import React from 'react';
import { View, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-provider';
import { useCategories } from '@/lib/category-provider';
import { useSettings } from '@/lib/settings-provider';
import { useTheme, ThemePreference } from '@/lib/theme-provider';
import { exportConfig, importConfig } from '@/lib/configShare';
import { Button, Card, Text } from '@/components/ui';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, isGuest } = useAuth();
  const { categories } = useCategories();
  const { settings } = useSettings();
  const { themePreference, setThemePreference, isDarkMode } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut();
      // The root layout will automatically redirect to sign-in
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleSignIn = async () => {
    try {
      await signOut(); // Sign out first to clear the auth state
      // The root layout will automatically redirect to sign-in
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleExportConfig = async () => {
    try {
      await exportConfig(categories, settings);
      Alert.alert('Success', 'Configuration exported successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to export configuration');
    }
  };

  const handleImportConfig = async () => {
    try {
      await importConfig();
      Alert.alert('Success', 'Configuration imported successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to import configuration');
    }
  };

  const handleThemeChange = async (newTheme: ThemePreference) => {
    try {
      await setThemePreference(newTheme);
    } catch (error) {
      Alert.alert('Error', 'Failed to update theme');
    }
  };

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
                <Text variant="h2" weight="medium" color="primary">
                  {isGuest ? 'G' : user?.email?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View className="ml-4">
                {isGuest ? (
                  <View>
                    <Text variant="h4" weight="medium" className="text-neutral-900 dark:text-white">
                      Guest User
                    </Text>
                    <Text variant="body" className="text-neutral-500 dark:text-neutral-400 mt-1">
                      Limited functionality available
                    </Text>
                  </View>
                ) : (
                  <Text variant="h4" weight="medium" className="text-neutral-900 dark:text-white">
                    {user?.email}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* Theme Settings */}
        <Card variant="elevated" className="mx-4 mb-4">
          <View className="p-6">
            <Text variant="h4" weight="medium" className="mb-4 text-neutral-900 dark:text-white">
              Theme
            </Text>
            <View className="space-y-4">
              <Button
                variant={themePreference === 'system' ? 'primary' : 'outline'}
                icon="phone-portrait-outline"
                onPress={() => handleThemeChange('system')}
              >
                System Theme
              </Button>

              <Button
                variant={themePreference === 'light' ? 'primary' : 'outline'}
                icon="sunny-outline"
                onPress={() => handleThemeChange('light')}
              >
                Light Theme
              </Button>

              <Button
                variant={themePreference === 'dark' ? 'primary' : 'outline'}
                icon="moon-outline"
                onPress={() => handleThemeChange('dark')}
              >
                Dark Theme
              </Button>
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

            {/* Sign In/Out Button */}
            {isGuest ? (
              <Button
                variant="primary"
                icon="log-in-outline"
                onPress={handleSignIn}
              >
                Sign In
              </Button>
            ) : (
              <Button
                variant="danger"
                icon="log-out-outline"
                onPress={handleSignOut}
              >
                Sign Out
              </Button>
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
