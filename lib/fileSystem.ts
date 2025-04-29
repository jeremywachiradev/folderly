import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { StorageAccessFramework } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { hasStoragePermissions, requestAndroidPermissions } from './androidDirectories';

export interface FileCategory {
  id: string;
  name: string;
  color: string;
  directories: string[];
}

export interface FileItem {
  name: string;
  path: string;
  uri: string;
  size: number;
  modificationTime: number;
  type: FileType;
  isDirectory: boolean;
}

export type FileType = 'image' | 'video' | 'audio' | 'document' | 'other';

const getFileType = (fileName: string): FileType => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv'].includes(extension)) return 'video';
  if (['mp3', 'wav', 'm4a'].includes(extension)) return 'audio';
  if (['pdf', 'doc', 'docx', 'txt'].includes(extension)) return 'document';
  return 'other';
};

type FileInfoResult = FileSystem.FileInfo & {
  modificationTime?: number;
  size?: number;
};

// Get all files from a directory
export const getFilesFromDirectory = async (directory: string): Promise<FileItem[]> => {
  try {
    // Ensure we have root permissions
    const hasPermission = await hasStoragePermissions();
    if (!hasPermission) {
      const { granted } = await requestAndroidPermissions();
      if (!granted) {
        
        return [];
      }
    }

    try {
      // Read the directory contents using SAF
      const files = await StorageAccessFramework.readDirectoryAsync(directory);

      // Process each file
      const fileItems = await Promise.all(
        files.map(async (uri) => {
          try {
            // Get the file info using FileSystem
            const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
            if (!fileInfo.exists) {
              return null;
            }

            const fileName = decodeURIComponent(uri.split('/').pop() || '').replace(/^[^:]+:/, '');
            const type = getFileType(fileName);

            // Create a proper content URI that can be used by other apps
            const contentUri = Platform.select({
              android: uri,
              ios: uri,
              default: uri
            });

            // Get file stats for additional info
            const stats = await FileSystem.getInfoAsync(uri, { size: true }) as FileInfoResult;
            
            return {
              name: fileName,
              path: uri,
              uri: contentUri,
              size: stats.exists ? (stats as any).size || 0 : 0,
              modificationTime: stats.modificationTime || Date.now(), // Use actual last modified time if available
              type: fileInfo.isDirectory ? 'other' : type,
              isDirectory: fileInfo.isDirectory
            };
          } catch (error) {
            
            return null;
          }
        })
      );

      return fileItems.filter((item): item is FileItem => item !== null);
    } catch (error) {
      
      throw error;
    }
  } catch (error) {
    
    return [];
  }
};

// Request necessary permissions
export const requestPermissions = async () => {
  try {
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
    if (mediaStatus !== 'granted') {
      throw new Error('Media library permission not granted');
    }
    return true;
  } catch (error) {
    
    return false;
  }
};

// Copy file to a new location
export const copyFile = async (sourceUri: string, destinationUri: string) => {
  try {
    // Ensure we have root permissions
    const hasPermission = await hasStoragePermissions();
    if (!hasPermission) {
      const { granted } = await requestAndroidPermissions();
      if (!granted) return false;
    }

    // Handle SAF URIs
    const content = await StorageAccessFramework.readAsStringAsync(sourceUri);
    await StorageAccessFramework.createFileAsync(destinationUri, content, 'utf8');
    return true;
  } catch (error) {
    
    return false;
  }
};

// Get file stats (size, modification time, etc.)
export const getFileStats = async (uri: string) => {
  try {
    // Ensure we have root permissions
    const hasPermission = await hasStoragePermissions();
    if (!hasPermission) {
      const { granted } = await requestAndroidPermissions();
      if (!granted) return null;
    }

    // Try to determine if it's a directory and get metadata
    try {
      try {
        await StorageAccessFramework.readDirectoryAsync(uri);
        const stats = await FileSystem.getInfoAsync(uri, { size: true }) as FileInfoResult;
        return {
          exists: true,
          uri,
          size: 0,
          modificationTime: stats.modificationTime || Date.now(),
          isDirectory: true
        };
      } catch {
        const stats = await FileSystem.getInfoAsync(uri, { size: true }) as FileInfoResult;
        return {
          exists: true,
          uri,
          size: stats.size || 0,
          modificationTime: stats.modificationTime || Date.now(),
          isDirectory: false
        };
      }
    } catch (error) {
      
      return null;
    }
  } catch (error) {
    
    return null;
  }
};

const SAVE_DIRECTORY_KEY = '@save_directory';

export const getSaveDirectory = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(SAVE_DIRECTORY_KEY);
  } catch (error) {
    
    return null;
  }
};

export const setSaveDirectory = async (directory: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(SAVE_DIRECTORY_KEY, directory);
  } catch (error) {
    
    throw error;
  }
};

export const saveFile = async (sourceUri: string, fileName: string): Promise<void> => {
  try {
    const saveDir = await getSaveDirectory();
    if (!saveDir) {
      throw new Error('No save directory set');
    }

    // Read the source file content
    const content = await StorageAccessFramework.readAsStringAsync(sourceUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Create the file in the destination directory
    const destinationUri = await StorageAccessFramework.createFileAsync(
      saveDir,
      fileName,
      'application/octet-stream'
    );

    // Write the content to the new file
    await StorageAccessFramework.writeAsStringAsync(
      destinationUri,
      content,
      { encoding: FileSystem.EncodingType.Base64 }
    );
  } catch (error) {
    
    throw error;
  }
};

export const saveFiles = async (files: { uri: string; name: string }[]): Promise<void> => {
  try {
    const saveDir = await getSaveDirectory();
    if (!saveDir) {
      throw new Error('No save directory set');
    }

    // Save all files
    await Promise.all(
      files.map(async ({ uri, name }) => {
        // Read the source file content
        const content = await StorageAccessFramework.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Create the file in the destination directory
        const destinationUri = await StorageAccessFramework.createFileAsync(
          saveDir,
          name,
          'application/octet-stream'
        );

        // Write the content to the new file
        await StorageAccessFramework.writeAsStringAsync(
          destinationUri,
          content,
          { encoding: FileSystem.EncodingType.Base64 }
        );
      })
    );
  } catch (error) {
    
    throw error;
  }
};

// Add a new function to get a proper content URI for a file
export const getContentUri = async (uri: string): Promise<string> => {
  try {
    if (Platform.OS === 'android') {
      // On Android, we need to get a content:// URI that can be used by other apps
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        return uri;
      }
      throw new Error('Storage permission not granted');
    }
    return uri;
  } catch (error) {
    
    throw error;
  }
}; 