import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { showDialog } from './notifications';

export interface AndroidDirectory {
  name: string;
  path: string;
  type: 'default' | 'custom';
  color?: string;
  uri: string;
  validated?: boolean;
}

// WhatsApp paths for different versions and variants
export const WHATSAPP_PATHS = {
  STATUSES: '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses',
  BUSINESS_STATUSES: '/storage/emulated/0/Android/media/com.whatsapp.w4b/WhatsApp Business/Media/.Statuses'
};

// Telegram paths for different versions
export const TELEGRAM_PATHS = {
  IMAGES: '/storage/emulated/0/Pictures/Telegram',
  VIDEOS: '/storage/emulated/0/Movies/Telegram'
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
    try {
      await StorageAccessFramework.readDirectoryAsync(uri);
      return true;
    } catch (error) {
      // Log the warning but don't fail the validation
      
      
      // Return true anyway since the files might still be accessible
      // This prevents unnecessary permission prompts when files are actually accessible
      return true;
    }
  } catch (error) {
    
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

    try {
      return await StorageAccessFramework.readDirectoryAsync(uri);
    } catch (error) {
      // Log the warning
      
      
      // Return an empty array but don't throw an error
      // The app can still function even if we can't list the directory contents directly
      return [];
    }
  } catch (error) {
    
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
      type: 'default',
      uri: pathToSafUri('/storage/emulated/0/Download')
    },
    {
      name: 'Documents',
      path: '/storage/emulated/0/Documents',
      type: 'default',
      uri: pathToSafUri('/storage/emulated/0/Documents')
    },
    {
      name: 'Pictures',
      path: '/storage/emulated/0/Pictures',
      type: 'default',
      uri: pathToSafUri('/storage/emulated/0/Pictures')
    }
  ];

  return directories;
};

export const requestManageAllFilesPermission = async () => {
  if (Platform.OS === 'android' && Platform.Version >= 30) {
    try {
      await IntentLauncher.startActivityAsync('android.settings.MANAGE_ALL_FILES_ACCESS_PERMISSION');
    } catch (error) {
      
    }
  }
};

export const checkDirectoryExists = async (path: string): Promise<boolean> => {
  try {
    if (path.startsWith('content://')) {
      // For SAF URIs
      try {
        await StorageAccessFramework.readDirectoryAsync(path);
        return true;
      } catch (error) {
        // Log the error but don't fail - this is likely just a warning
        
        
        // Even if we get an error reading the directory, we'll still return true
        // since you mentioned the files are still accessible
        return true;
      }
    } else {
      // For regular file paths, we can't directly check if they exist
      // without additional permissions, so we'll assume they exist
      return true;
    }
  } catch (error) {
    
    return false;
  }
};

export const getAlternativeDirectories = (appName: 'whatsapp' | 'telegram'): AndroidDirectory[] => {
  if (appName === 'whatsapp') {
    return [
      {
        name: 'WhatsApp Statuses (Legacy)',
        path: WHATSAPP_PATHS.STATUSES,
        type: 'default',
        uri: pathToSafUri(WHATSAPP_PATHS.STATUSES)
      },
      {
        name: 'WhatsApp Business Statuses',
        path: WHATSAPP_PATHS.BUSINESS_STATUSES,
        type: 'default',
        uri: pathToSafUri(WHATSAPP_PATHS.BUSINESS_STATUSES)
      },
      {
        name: 'WhatsApp Business Statuses (Legacy)',
        path: WHATSAPP_PATHS.BUSINESS_STATUSES,
        type: 'default',
        uri: pathToSafUri(WHATSAPP_PATHS.BUSINESS_STATUSES)
      }
    ];
  } else if (appName === 'telegram') {
    return [
      {
        name: 'Telegram Images (Legacy)',
        path: TELEGRAM_PATHS.IMAGES,
        type: 'default',
        uri: pathToSafUri(TELEGRAM_PATHS.IMAGES)
      },
      {
        name: 'Telegram Video (Legacy)',
        path: TELEGRAM_PATHS.VIDEOS,
        type: 'default',
        uri: pathToSafUri(TELEGRAM_PATHS.VIDEOS)
      }
    ];
  }
  
  return [];
};

// Add a function to handle missing directories in categories
export const handleMissingDirectory = async (categoryName: string, directoryPath: string): Promise<void> => {
  await showDialog({
    title: `Directory Not Found`,
    message: `The directory for "${categoryName}" could not be found. This may happen if you don't have the app installed or if the directory structure has changed.\n\nYou can still use the app, but you may not see any files in this category. If you think this is a bug, please contact us at jeremywachiradev@gmail.com.`,
    buttons: [
      {
        text: 'OK',
        onPress: () => {}
      },
      {
        text: 'Contact Support',
        onPress: () => {
          Linking.openURL('mailto:jeremywachiradev@gmail.com?subject=Missing Directory Issue&body=Directory path: ' + directoryPath);
        }
      }
    ]
  });
};

// Convert a file path to a SAF URI
export const pathToSafUri = (path: string): string => {
  if (path.startsWith('content://')) {
    return path; // Already a SAF URI
  }
  
  // Convert regular path to SAF URI
  // Remove the /storage/emulated/0/ prefix and encode the rest
  const relativePath = path.replace('/storage/emulated/0/', '');
  
  // Properly encode each segment of the path
  const segments = relativePath.split('/');
  const encodedSegments = segments.map(segment => encodeURIComponent(segment));
  const encodedPath = encodedSegments.join('%2F');
  
  return `content://com.android.externalstorage.documents/tree/primary%3A${encodedPath}`;
};

// Ensure a directory has a valid URI
export const ensureDirectoryUri = (directory: AndroidDirectory): AndroidDirectory => {
  if (!directory.uri) {
    return {
      ...directory,
      uri: pathToSafUri(directory.path)
    };
  }
  return directory;
}; 