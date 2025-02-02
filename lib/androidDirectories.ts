import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

export interface AndroidDirectory {
  name: string;
  path: string;
  type: 'default' | 'custom';
  color?: string;
  uri?: string;
}

// WhatsApp paths for different versions and variants
const WHATSAPP_PATHS = {
  regular: {
    legacy: '/storage/emulated/0/WhatsApp/Media/.Statuses',
    modern: '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses'
  },
  business: {
    legacy: '/storage/emulated/0/WhatsApp Business/Media/.Statuses',
    modern: '/storage/emulated/0/Android/media/com.whatsapp.w4b/WhatsApp Business/Media/.Statuses'
  }
};

const PERMISSIONS_KEY = '@folderly/storage_permissions';
const ROOT_DIRECTORY_KEY = '@folderly/root_directory_uri';

// Get root level storage access
export const requestRootStorageAccess = async (): Promise<boolean> => {
  try {
    // Request access to the root storage directory
    const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync('content://com.android.externalstorage.documents/tree/primary%3A');
    
    if (permission.granted) {
      await AsyncStorage.setItem(PERMISSIONS_KEY, 'true');
      await AsyncStorage.setItem(ROOT_DIRECTORY_KEY, permission.directoryUri);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error requesting root storage access:', error);
    return false;
  }
};

export const hasStoragePermissions = async (): Promise<boolean> => {
  try {
    const permissionsGranted = await AsyncStorage.getItem(PERMISSIONS_KEY);
    if (permissionsGranted !== 'true') return false;

    // Verify if the permission is still valid
    const rootUri = await AsyncStorage.getItem(ROOT_DIRECTORY_KEY);
    if (!rootUri) return false;

    try {
      await StorageAccessFramework.readDirectoryAsync(rootUri);
      return true;
    } catch {
      // Permission is no longer valid, clear it
      await AsyncStorage.removeItem(PERMISSIONS_KEY);
      await AsyncStorage.removeItem(ROOT_DIRECTORY_KEY);
      return false;
    }
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
};

export const requestAndroidPermissions = async (): Promise<{ granted: boolean; directoryUri?: string }> => {
  try {
    // Check if we already have permissions
    const hasPermissions = await hasStoragePermissions();
    if (hasPermissions) {
      const rootUri = await AsyncStorage.getItem(ROOT_DIRECTORY_KEY);
      return { granted: true, directoryUri: rootUri || undefined };
    }

    // Request root storage access
    const granted = await requestRootStorageAccess();
    if (granted) {
      const rootUri = await AsyncStorage.getItem(ROOT_DIRECTORY_KEY);
      return { granted: true, directoryUri: rootUri || undefined };
    }

    return { granted: false };
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return { granted: false };
  }
};

export const validateDirectoryAccess = async (uri: string): Promise<boolean> => {
  try {
    // First check if we have root permissions
    const hasPermissions = await hasStoragePermissions();
    if (!hasPermissions) {
      const { granted } = await requestAndroidPermissions();
      if (!granted) return false;
    }

    // Now try to read the directory
    await StorageAccessFramework.readDirectoryAsync(uri);
    return true;
  } catch (error) {
    console.error('Error validating directory access:', error);
    return false;
  }
};

export const listDirectoryContents = async (uri: string): Promise<string[]> => {
  try {
    // Ensure we have permissions
    const hasPermissions = await hasStoragePermissions();
    if (!hasPermissions) {
      const { granted } = await requestAndroidPermissions();
      if (!granted) return [];
    }

    return await StorageAccessFramework.readDirectoryAsync(uri);
  } catch (error) {
    console.error('Error listing directory contents:', error);
    return [];
  }
};

// Function to open Android settings if needed
export const openAndroidFilesSettings = async () => {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 30) {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.APPLICATION_SETTINGS
        );
      } else {
        await Linking.openSettings();
      }
    }
  } catch (error) {
    console.error('Error opening settings:', error);
    await Linking.openSettings();
  }
};

export const getDefaultDirectories = async (): Promise<AndroidDirectory[]> => {
  if (Platform.OS !== 'android') {
    return [];
  }

  const directories: AndroidDirectory[] = [
    {
      name: 'Downloads',
      path: '/storage/emulated/0/Download',
      type: 'default'
    },
    {
      name: 'Documents',
      path: '/storage/emulated/0/Documents',
      type: 'default'
    },
    {
      name: 'Pictures',
      path: '/storage/emulated/0/Pictures',
      type: 'default'
    }
  ];

  return directories;
};

export const requestManageAllFilesPermission = async () => {
  if (Platform.OS === 'android' && Platform.Version >= 30) {
    try {
      await IntentLauncher.startActivityAsync('android.settings.MANAGE_ALL_FILES_ACCESS_PERMISSION');
    } catch (error) {
      console.error('Error requesting file access permission:', error);
    }
  }
}; 