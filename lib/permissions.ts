import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { showDialog, showToast } from './notifications';

interface PermissionRequest {
  title: string;
  message: string;
  type: 'media' | 'storage';
}

const PERMISSION_MESSAGES: Record<string, PermissionRequest> = {
  media: {
    title: 'Access Your Media',
    message: 'To help you organize and manage your files better, we need permission to access your media library. This allows us to show and organize your photos and videos.',
    type: 'media',
  },
  storage: {
    title: 'Storage Access',
    message: 'To save and manage your files effectively, we need permission to access your device storage. This helps us organize and protect your important documents.',
    type: 'storage',
  },
};

let pendingPermissionRequest: Promise<boolean> | null = null;

export const requestPermissionWithContext = async (
  permissionType: keyof typeof PERMISSION_MESSAGES
): Promise<boolean> => {
  // If there's a pending request, wait for it to finish
  if (pendingPermissionRequest) {
    return pendingPermissionRequest;
  }

  const { title, message } = PERMISSION_MESSAGES[permissionType];
  
  pendingPermissionRequest = new Promise(async (resolve) => {
    try {
      const result = await showDialog({
        title,
        message,
        buttons: [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => {
              showToast('error', 'Permission denied. Some features may be limited.');
              pendingPermissionRequest = null;
              resolve(false);
            },
          },
          {
            text: 'Allow',
            onPress: async () => {
              try {
                let granted = false;
                
                if (permissionType === 'storage') {
                  if (Platform.OS === 'android') {
                    const response = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                    granted = response.granted;
                  } else {
                    granted = true; // iOS doesn't need explicit storage permission
                  }
                } else {
                  const { status } = await MediaLibrary.requestPermissionsAsync();
                  granted = status === 'granted';
                }
                
                if (granted) {
                  showToast('success', 'Permission granted successfully!');
                } else {
                  showToast('error', 'Permission denied. Some features may be limited.');
                }
                
                pendingPermissionRequest = null;
                resolve(granted);
              } catch (error) {
                showToast('error', 'Something went wrong while requesting permissions.');
                pendingPermissionRequest = null;
                resolve(false);
              }
            },
          },
        ],
      });
    } catch (error) {
      showToast('error', 'Something went wrong while requesting permissions.');
      pendingPermissionRequest = null;
      resolve(false);
    }
  });

  return pendingPermissionRequest;
};

export const checkAndRequestPermission = async (
  permissionType: keyof typeof PERMISSION_MESSAGES
): Promise<boolean> => {
  try {
    if (permissionType === 'storage') {
      if (Platform.OS === 'android') {
        try {
          // Try to read a directory to check if we have permissions
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) return true;
        } catch {
          // If error, we don't have permissions
          return requestPermissionWithContext(permissionType);
        }
      } else {
        return true; // iOS doesn't need explicit storage permission
      }
    } else {
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status === 'granted') return true;
    }
    
    return requestPermissionWithContext(permissionType);
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}; 