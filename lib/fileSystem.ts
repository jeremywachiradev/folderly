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

// Get all files from a directory
export const getFilesFromDirectory = async (directory: string): Promise<FileItem[]> => {
  try {
    // Ensure we have root permissions
    const hasPermission = await hasStoragePermissions();
    if (!hasPermission) {
      const { granted } = await requestAndroidPermissions();
      if (!granted) {
        console.error('Root storage permission not granted');
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
            // Get the file name from the URI
            const fileName = decodeURIComponent(uri.split('/').pop() || '').replace(/^[^:]+:/, '');
            const type = getFileType(fileName);

            // Try to get basic file info
            let isDirectory = false;
            try {
              // Try to read as directory to check if it's a directory
              await StorageAccessFramework.readDirectoryAsync(uri);
              isDirectory = true;
            } catch {
              // If reading as directory fails, it's a file
              isDirectory = false;
            }

            return {
              name: fileName,
              path: uri,
              uri: uri,
              size: 0, // Size information not available through SAF
              modificationTime: Date.now(),
              type: isDirectory ? 'other' : type,
              isDirectory
            };
          } catch (error) {
            console.error('Error processing file:', error);
            return null;
          }
        })
      );

      return fileItems.filter((item): item is FileItem => item !== null);
    } catch (error) {
      console.error('Error reading SAF directory:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in getFilesFromDirectory:', error);
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
    console.error('Error requesting permissions:', error);
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
    console.error('Error copying file:', error);
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

    // Try to determine if it's a directory
    try {
      await StorageAccessFramework.readDirectoryAsync(uri);
      return {
        exists: true,
        uri,
        size: 0,
        modificationTime: Date.now(),
        isDirectory: true
      };
    } catch {
      return {
        exists: true,
        uri,
        size: 0,
        modificationTime: Date.now(),
        isDirectory: false
      };
    }
  } catch (error) {
    console.error('Error getting file stats:', error);
    return null;
  }
};

const SAVE_DIRECTORY_KEY = '@save_directory';

export const getSaveDirectory = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(SAVE_DIRECTORY_KEY);
  } catch (error) {
    console.error('Error getting save directory:', error);
    return null;
  }
};

export const setSaveDirectory = async (directory: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(SAVE_DIRECTORY_KEY, directory);
  } catch (error) {
    console.error('Error setting save directory:', error);
    throw error;
  }
};

export const saveFile = async (sourceUri: string, fileName: string): Promise<void> => {
  try {
    const saveDir = await getSaveDirectory();
    if (!saveDir) {
      throw new Error('No save directory set');
    }

    // Ensure we have storage permissions
    const hasPermission = await hasStoragePermissions();
    if (!hasPermission) {
      const { granted } = await requestAndroidPermissions();
      if (!granted) {
        throw new Error('Storage permission not granted');
      }
    }

    // Create destination URI
    const destinationUri = await StorageAccessFramework.createFileAsync(
      saveDir,
      fileName,
      'application/octet-stream'
    );

    // Copy the file
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri
    });
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
};

export const saveFiles = async (files: { uri: string; name: string }[]): Promise<void> => {
  try {
    const saveDir = await getSaveDirectory();
    if (!saveDir) {
      throw new Error('No save directory set');
    }

    // Ensure we have storage permissions
    const hasPermission = await hasStoragePermissions();
    if (!hasPermission) {
      const { granted } = await requestAndroidPermissions();
      if (!granted) {
        throw new Error('Storage permission not granted');
      }
    }

    // Save all files
    await Promise.all(
      files.map(async ({ uri, name }) => {
        const destinationUri = await StorageAccessFramework.createFileAsync(
          saveDir,
          name,
          'application/octet-stream'
        );

        await FileSystem.copyAsync({
          from: uri,
          to: destinationUri
        });
      })
    );
  } catch (error) {
    console.error('Error saving files:', error);
    throw error;
  }
}; 