import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme-provider';
import { Text, Card } from '@/components/ui';
import { getSaveDirectory, setSaveDirectory } from '@/lib/fileSystem';
import { StorageAccessFramework } from 'expo-file-system';
import { showDialog, showToast } from '@/lib/notifications';
import { Portal, Modal as PaperModal } from 'react-native-paper';

export default function SettingsScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [saveDir, setSaveDir] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
        </ScrollView>

        {/* Reset Confirmation Modal */}
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
      </View>
    </SafeAreaView>
  );
}