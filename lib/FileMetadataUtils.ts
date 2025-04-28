/**
 * Utility functions for handling file metadata in Expo
 * Supports both the standard FileSystem API and the new FileSystem/next API
 */

import * as FileSystem from 'expo-file-system';
import { File, Directory, Paths } from 'expo-file-system/next';

// Define more specific types for FileSystem.getInfoAsync result
interface EnhancedFileInfo {
  uri: string;
  exists: boolean;
  isDirectory: boolean;
  size?: number;
  modificationTime?: number;
  md5?: string;
}

// Types for file metadata
export interface FileMetadata {
  uri: string;
  name: string;
  size: number;
  exists: boolean;
  isDirectory: boolean;
  extension?: string;
  modificationTime?: number | null;
  lastModified?: Date | null;
  md5?: string;
}

export interface DirectoryListing {
  name: string;
  uri: string;
  size?: number | null;
  type: 'file' | 'directory';
  extension?: string;
  lastModified?: Date | null;
}

/**
 * Get metadata for a file using the standard FileSystem API
 */
export async function getFileMetadataStandard(
  filePath: string, 
  options: { md5?: boolean, size?: boolean } = { size: true }
): Promise<FileMetadata> {
  try {
    // Cast the result to access the optional properties
    const fileInfo = await FileSystem.getInfoAsync(filePath, options);
    const info = fileInfo as unknown as EnhancedFileInfo;
    
    // Extract filename from URI
    const uriParts = info.uri.split('/');
    const name = uriParts[uriParts.length - 1];
    
    // Extract extension if there is one
    const extension = name.includes('.') ? name.split('.').pop() : undefined;
    
    return {
      uri: info.uri,
      name,
      size: info.size || 0,
      exists: info.exists,
      isDirectory: info.isDirectory || false,
      extension,
      modificationTime: info.modificationTime || null,
      lastModified: info.modificationTime ? new Date(info.modificationTime * 1000) : null,
      md5: info.md5,
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw error;
  }
}

/**
 * Get metadata for a file using the FileSystem/next API
 */
export function getFileMetadataNext(filePath: string): FileMetadata {
  try {
    const file = new File(filePath);
    
    // Get parent directory
    const uriParts = file.uri.split('/');
    uriParts.pop(); // Remove filename
    const parentDir = uriParts.join('/');
    
    // Get file modification time - this isn't directly accessible in the API
    // so we'll use a workaround
    let lastModified: Date | null = null;
    try {
      // We can try to get modification time using standard API as fallback
      const fileInfoPromise = FileSystem.getInfoAsync(file.uri, { size: true });
      fileInfoPromise.then((fileInfo) => {
        const info = fileInfo as unknown as EnhancedFileInfo;
        if (info.modificationTime) {
          lastModified = new Date(info.modificationTime * 1000);
        }
      }).catch(() => {
        // Silent fail - we'll return null for lastModified
      });
    } catch (e) {
      // If this fails, we'll just return null for lastModified
    }
    
    return {
      uri: file.uri,
      name: file.name,
      size: file.size || 0,
      exists: file.exists,
      isDirectory: false,
      extension: file.extension,
      lastModified: lastModified,
    };
  } catch (error) {
    console.error('Error getting file metadata with next API:', error);
    throw error;
  }
}

/**
 * List files in a directory using the standard FileSystem API
 */
export async function listDirectoryStandard(directoryPath: string): Promise<DirectoryListing[]> {
  try {
    const files = await FileSystem.readDirectoryAsync(directoryPath);
    
    const result: DirectoryListing[] = [];
    
    for (const fileName of files) {
      const filePath = directoryPath + (directoryPath.endsWith('/') ? '' : '/') + fileName;
      // Cast to access the optional properties
      const fileInfo = await FileSystem.getInfoAsync(filePath, { size: true });
      const info = fileInfo as unknown as EnhancedFileInfo;
      
      const extension = fileName.includes('.') ? fileName.split('.').pop() : undefined;
      
      result.push({
        name: fileName,
        uri: info.uri,
        size: info.size || null,
        type: info.isDirectory ? 'directory' : 'file',
        extension: extension,
        lastModified: info.modificationTime ? new Date(info.modificationTime * 1000) : undefined,
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error listing directory:', error);
    throw error;
  }
}

/**
 * List files in a directory using the FileSystem/next API
 */
export function listDirectoryNext(directoryPath: string): DirectoryListing[] {
  try {
    const directory = new Directory(directoryPath);
    const contents = directory.list();
    
    const results: DirectoryListing[] = [];
    
    for (const item of contents) {
      if (item instanceof Directory) {
        results.push({
          name: item.name,
          uri: item.uri,
          type: 'directory',
          size: null,
        });
      } else {
        // For files, we need to handle lastModified differently
        // since it's not directly accessible in the API
        let lastModified: Date | undefined = undefined;
        
        // Use the file size directly from the File object
        const size = item.size || 0;
        
        // Try to get modification time using standard API as fallback
        FileSystem.getInfoAsync(item.uri, { size: true })
          .then((fileInfo) => {
            const info = fileInfo as unknown as EnhancedFileInfo;
            if (info.modificationTime) {
              lastModified = new Date(info.modificationTime * 1000);
            }
          })
          .catch(() => {
            // Silent fail
          });
        
        results.push({
          name: item.name,
          uri: item.uri,
          size: size,
          type: 'file',
          extension: item.extension,
          lastModified: lastModified,
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error listing directory with next API:', error);
    throw error;
  }
}

/**
 * Check if the new FileSystem/next API is available
 * The next API is only available in development builds, not in Expo Go
 */
export function isFileSystemNextAvailable(): boolean {
  try {
    // Try to import and use a class from the next API
    new File(Paths.cache, 'test.txt');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the best available file metadata function based on API availability
 */
export function getFileMetadata(filePath: string): Promise<FileMetadata> | FileMetadata {
  if (isFileSystemNextAvailable()) {
    return getFileMetadataNext(filePath);
  } else {
    return getFileMetadataStandard(filePath);
  }
}

/**
 * Get the best available directory listing function based on API availability
 */
export function listDirectory(directoryPath: string): Promise<DirectoryListing[]> | DirectoryListing[] {
  if (isFileSystemNextAvailable()) {
    return listDirectoryNext(directoryPath);
  } else {
    return listDirectoryStandard(directoryPath);
  }
}

/**
 * Format a file size in bytes to a human-readable string
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === 0 || bytes === null || bytes === undefined) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format a date to a human-readable string
 */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return 'Unknown';
  
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
} 