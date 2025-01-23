import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

type FileSystemInfo = FileSystem.FileInfo & {
  exists: boolean;
  uri: string;
  size: number;
  modificationTime: number;
  isDirectory: boolean;
}

// Get all files from a directory
export const getFilesFromDirectory = async (directory: string): Promise<FileItem[]> => {
  try {
    const files = await FileSystem.readDirectoryAsync(directory);
    const fileDetails = await Promise.all(
      files.map(async (fileName) => {
        const fileUri = `${directory}/${fileName}`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri, { size: true }) as FileSystemInfo;
        if (!fileInfo.exists) return null;

        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        let type: FileType = 'other';
        
        if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) type = 'image';
        else if (['mp4', 'mov', 'avi'].includes(extension)) type = 'video';
        else if (['mp3', 'wav', 'm4a'].includes(extension)) type = 'audio';
        else if (['pdf', 'doc', 'docx', 'txt'].includes(extension)) type = 'document';

        return {
          name: fileName,
          path: fileUri,
          uri: fileInfo.uri,
          size: fileInfo.size,
          modificationTime: fileInfo.modificationTime || Date.now(),
          type,
          isDirectory: fileInfo.isDirectory || false
        };
      })
    );
    
    return fileDetails.filter((file): file is FileItem => file !== null);
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
};

// Save category to local storage
export const saveCategory = async (category: FileCategory) => {
  try {
    const existingCategories = await getCategories();
    const updatedCategories = [...existingCategories.filter(c => c.id !== category.id), category];
    await AsyncStorage.setItem('fileCategories', JSON.stringify(updatedCategories));
  } catch (error) {
    console.error('Error saving category:', error);
    throw error;
  }
};

// Get all categories from local storage
export const getCategories = async (): Promise<FileCategory[]> => {
  try {
    const categories = await AsyncStorage.getItem('fileCategories');
    return categories ? JSON.parse(categories) : [];
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};

// Initialize default WhatsApp category if it doesn't exist
export const initializeDefaultCategory = async () => {
  try {
    const categories = await getCategories();
    if (!categories.find(c => c.id === 'whatsapp-status')) {
      const whatsappCategory: FileCategory = {
        id: 'whatsapp-status',
        name: 'WhatsApp Status',
        color: '#25D366', // WhatsApp green
        directories: ['/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses']
      };
      await saveCategory(whatsappCategory);
    }
  } catch (error) {
    console.error('Error initializing default category:', error);
  }
};

// Request necessary permissions
export const requestPermissions = async () => {
  try {
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
    if (mediaStatus !== 'granted') {
      throw new Error('Media library permission not granted');
    }
    
    // For Android 10+ (API level 29+), we need to use MediaLibrary
    // For older versions, we can use FileSystem directly
    return true;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return false;
  }
};

// Copy file to a new location
export const copyFile = async (sourceUri: string, destinationUri: string) => {
  try {
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri
    });
    return true;
  } catch (error) {
    console.error('Error copying file:', error);
    return false;
  }
};

// Get file stats (size, modification time, etc.)
export const getFileStats = async (uri: string) => {
  try {
    return await FileSystem.getInfoAsync(uri);
  } catch (error) {
    console.error('Error getting file stats:', error);
    return null;
  }
}; 