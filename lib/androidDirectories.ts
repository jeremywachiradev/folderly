import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

export interface AndroidDirectory {
  name: string;
  path: string;
  type: 'default' | 'custom';
  color?: string;
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

// Define the missing constant
const MANAGE_ALL_FILES_ACCESS_PERMISSION = 'android.settings.MANAGE_ALL_FILES_ACCESS_PERMISSION';

export const getDefaultDirectories = async (): Promise<AndroidDirectory[]> => {
  if (Platform.OS !== 'android') {
    return [];
  }

  try {
    const directories: AndroidDirectory[] = [];
    
    // Check all possible WhatsApp paths
    const checkPaths = [
      {
        paths: [WHATSAPP_PATHS.regular.modern, WHATSAPP_PATHS.regular.legacy],
        name: 'WhatsApp Status',
        color: '#25D366' // WhatsApp green
      },
      {
        paths: [WHATSAPP_PATHS.business.modern, WHATSAPP_PATHS.business.legacy],
        name: 'WhatsApp Business Status',
        color: '#23D366' // WhatsApp Business green
      }
    ];

    for (const { paths, name, color } of checkPaths) {
      for (const path of paths) {
        try {
          const info = await FileSystem.getInfoAsync(path);
          if (info.exists) {
            directories.push({
              name,
              path,
              type: 'default',
              color
            });
            // Break inner loop once we find a valid path for this WhatsApp variant
            break;
          }
        } catch (error) {
          console.debug(`Path ${path} not accessible:`, error);
        }
      }
    }

    return directories;
  } catch (error) {
    console.error('Error getting default directories:', error);
    return [];
  }
};

export const validateDirectoryAccess = async (path: string): Promise<boolean> => {
  try {
    // First check if we have necessary permissions
    const hasPermissions = await requestAndroidPermissions();
    if (!hasPermissions) {
      return false;
    }

    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      return false;
    }

    // Try to read directory contents to verify access
    await FileSystem.readDirectoryAsync(path);
    return true;
  } catch (error) {
    console.error('Error validating directory access:', error);
    return false;
  }
};

export const requestAndroidPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    // Request media library permissions first
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
    if (mediaStatus !== 'granted') {
      throw new Error('Media library permission not granted');
    }

    // For Android 11+ (API 30+), we need MANAGE_EXTERNAL_STORAGE permission
    if (Platform.Version >= 30) {
      const canAccess = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      
      if (!canAccess.granted) {
        // Open system settings for all files access permission
        await IntentLauncher.startActivityAsync('android.settings.MANAGE_ALL_FILES_ACCESS_PERMISSION');
        
        // Re-check permission after settings
        const recheckedAccess = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!recheckedAccess.granted) {
          throw new Error('All files access permission not granted');
        }
      }
    }
    // For Android 10 (API 29), we need scoped storage access
    else if (Platform.Version === 29) {
      const { status: storageStatus } = await MediaLibrary.requestPermissionsAsync();
      if (storageStatus !== 'granted') {
        throw new Error('Storage permission not granted');
      }
    }

    return true;
  } catch (error) {
    console.error('Error requesting Android permissions:', error);
    return false;
  }
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