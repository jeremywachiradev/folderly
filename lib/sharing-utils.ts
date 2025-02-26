import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as WebBrowser from 'expo-web-browser';
import { showToast } from './notifications';

// A utility to check if sharing is available on the current platform
export const isAvailableAsync = async (): Promise<boolean> => {
  // Sharing is available on all platforms
  return true;
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

    if (Platform.OS === 'android') {
      // Use Android Intent system
      await IntentLauncher.startActivityAsync('android.intent.action.SEND', {
        type: options?.mimeType || 'application/octet-stream',
        data: shareUri,
        extra: {
          'android.intent.extra.SUBJECT': options?.dialogTitle || 'Share File',
          'android.intent.extra.STREAM': shareUri
        },
        flags: 1
      });
    } else if (Platform.OS === 'ios') {
      // For iOS, we'll use a simple URL scheme
      // This is a fallback and not as good as the native sharing
      await WebBrowser.openBrowserAsync(shareUri);
    } else {
      // Web or other platforms
      showToast('error', 'Sharing is not supported on this platform');
    }
  } catch (error) {
    console.error('Error sharing file:', error);
    throw error;
  }
}; 