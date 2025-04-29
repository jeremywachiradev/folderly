import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { FileItem } from './fileSystem';

const RECENT_FILES_KEY = '@folderly/recent_files';
const MAX_RECENT_FILES = 10;

interface StorageError extends Error {
  code?: string;
}

export async function addRecentFile(file: FileItem): Promise<void> {
  try {
    if (!file || !file.uri) {
      throw new Error('Invalid file object');
    }

    // Get existing recent files
    const existingJson = await AsyncStorage.getItem(RECENT_FILES_KEY);
    let existing: FileItem[] = [];
    
    try {
      existing = existingJson ? JSON.parse(existingJson) : [];
      if (!Array.isArray(existing)) {
        existing = [];
      }
    } catch {
      existing = [];
    }

    // Remove the file if it already exists
    const filtered = existing.filter(f => f?.uri !== file.uri);

    // Add the file to the beginning
    const updated = [file, ...filtered].slice(0, MAX_RECENT_FILES);

    // Save back to storage
    await AsyncStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated));
  } catch (error) {
    const err = error as StorageError;
    
    throw new Error(`Failed to add recent file: ${err.message}`);
  }
}

export async function getRecentFiles(): Promise<FileItem[]> {
  try {
    const json = await AsyncStorage.getItem(RECENT_FILES_KEY);
    if (!json) return [];

    let files: FileItem[];
    try {
      files = JSON.parse(json);
      if (!Array.isArray(files)) {
        return [];
      }
    } catch {
      return [];
    }

    // Validate that files still exist and have required properties
    const validFiles = await Promise.all(
      files.map(async (file) => {
        try {
          if (!file || !file.uri) return null;
          
          const info = await FileSystem.getInfoAsync(file.uri);
          if (!info.exists) return null;

          // Validate required properties
          if (!file.name || typeof file.size !== 'number' || !file.type) {
            return null;
          }

          return file;
        } catch {
          return null;
        }
      })
    );

    // Filter out non-existent files
    const filtered = validFiles.filter((file): file is FileItem => file !== null);

    // Update storage if some files were removed
    if (filtered.length !== files.length) {
      await AsyncStorage.setItem(RECENT_FILES_KEY, JSON.stringify(filtered));
    }

    return filtered;
  } catch (error) {
    const err = error as StorageError;
    
    return [];
  }
}

export async function clearRecentFiles(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_FILES_KEY);
  } catch (error) {
    const err = error as StorageError;
    
    throw new Error(`Failed to clear recent files: ${err.message}`);
  }
}

export async function removeRecentFile(uri: string): Promise<void> {
  try {
    if (!uri) {
      throw new Error('Invalid URI');
    }

    const files = await getRecentFiles();
    const filtered = files.filter(f => f.uri !== uri);
    await AsyncStorage.setItem(RECENT_FILES_KEY, JSON.stringify(filtered));
  } catch (error) {
    const err = error as StorageError;
    
    throw new Error(`Failed to remove recent file: ${err.message}`);
  }
} 