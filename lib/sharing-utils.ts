import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { showToast } from './notifications';

// A utility to check if sharing is available on the current platform
export const isAvailableAsync = async (): Promise<boolean> => {
  return Sharing.isAvailableAsync();
};

// A utility to share files
export const shareFile = async (
  uri: string, 
  options?: { 
    mimeType?: string; 
    dialogTitle?: string;
    UTI?: string;
  }
): Promise<void> => {
  try {
    // Create a temporary file if needed (for content:// URIs)
    let shareUri = uri;
    if (uri.startsWith('content://')) {
      const fileName = uri.split('/').pop() || 'file';
      const tempFile = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.copyAsync({
        from: uri,
        to: tempFile
      });
      shareUri = tempFile;
    }

    // Use expo-sharing which handles file URI permissions properly
    await Sharing.shareAsync(shareUri, {
      mimeType: options?.mimeType,
      dialogTitle: options?.dialogTitle,
      UTI: options?.UTI
    });
  } catch (error) {
    console.error('Error sharing file:', error);
    throw error;
  }
}; 