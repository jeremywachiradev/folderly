import * as FileSystem from 'expo-file-system';
import { File, Directory, Paths } from 'expo-file-system/next';
import { StorageAccessFramework } from 'expo-file-system';
import { FileItem } from '@/types';
import { AndroidDirectory } from './androidDirectories';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAGE_SIZE = 20;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const METADATA_STORAGE_KEY = '@folderly_file_metadata';

// Add file info cache
const fileInfoCache = new Map<string, {
  info: FileInfoResult;
  timestamp: number;
}>();

// Add file list cache
const fileListCache = new Map<string, {
  files: FileItem[];
  timestamp: number;
}>();

// Add metadata types
interface FileMetadata {
  uri: string;
  modificationTime: number;
  hash?: string;
}

// Add metadata storage
let metadataCache: Record<string, FileMetadata> = {};
let isMetadataLoaded = false;

// Load metadata from storage
const loadMetadata = async () => {
  if (isMetadataLoaded) return;
  
  try {
    const stored = await AsyncStorage.getItem(METADATA_STORAGE_KEY);
    if (stored) {
      metadataCache = JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Error loading file metadata:', error);
  }
  
  isMetadataLoaded = true;
};

// Save metadata to storage
const saveMetadata = async () => {
  try {
    await AsyncStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(metadataCache));
  } catch (error) {
    console.warn('Error saving file metadata:', error);
  }
};

// Update file metadata
const updateFileMetadata = async (uri: string, hash?: string) => {
  await loadMetadata();
  
  metadataCache[uri] = {
    uri,
    modificationTime: Date.now(),
    hash
  };
  
  await saveMetadata();
};

type FileInfoResult = FileSystem.FileInfo & {
  exists: boolean;
  isDirectory: boolean;
  size?: number;
  modificationTime?: number;
  createdTime?: number;
};

// Add cache cleanup utility
const cleanupCache = () => {
  const now = Date.now();
  
  // Cleanup file info cache
  for (const [key, value] of fileInfoCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      fileInfoCache.delete(key);
    }
  }
  
  // Cleanup file list cache
  for (const [key, value] of fileListCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      fileListCache.delete(key);
    }
  }
};

// Add batch processing utility
const processBatch = async <T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R | null>
): Promise<R[]> => {
  const results: (R | null)[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => processor(item).catch(() => null))
    );
    results.push(...batchResults);
  }
  
  return results.filter((result): result is R => result !== null);
};

// Optimize file info retrieval
const getFileInfo = async (uri: string): Promise<FileInfoResult | null> => {
  // Check cache first
  const cached = fileInfoCache.get(uri);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.info;
  }
  
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri, { size: true }) as FileInfoResult;
    if (!fileInfo.exists) return null;

    // Get or create metadata for creation time
    await loadMetadata();
    let metadata = metadataCache[uri];
    
    if (!metadata) {
      // For new files we haven't seen before, store the current time
      // This will serve as our "first seen" timestamp
      metadata = {
        uri,
        modificationTime: Date.now()
      };
      metadataCache[uri] = metadata;
      await saveMetadata();
    }

    const result = {
      ...fileInfo,
      size: fileInfo.size || 0,
      modificationTime: metadata.modificationTime
    };

    // Cache the result
    fileInfoCache.set(uri, {
      info: result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.warn('Error getting file info:', error);
    return null;
  }
};

export async function listFiles(
  directories: AndroidDirectory[],
  page: number = 1,
  sortOption: string = 'date-desc'
): Promise<{ files: FileItem[]; hasMore: boolean }> {
  try {
    // Load metadata before processing files
    await loadMetadata();
    
    // Generate cache key
    const cacheKey = `${directories.map(d => d.uri).join('_')}_${sortOption}`;
    
    // Check cache first
    const cached = fileListCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      const start = (page - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      return {
        files: cached.files.slice(start, end),
        hasMore: end < cached.files.length
      };
    }

    const allFiles: FileItem[] = [];

    // Process directories in parallel
    await Promise.all(directories.map(async directory => {
      if (!directory.uri) return;

      try {
        const files = await StorageAccessFramework.readDirectoryAsync(directory.uri);
        
        // Process files in batches
        const processedFiles = await processBatch(
          files,
          10, // Process 10 files at a time
          async (uri) => {
            try {
              const name = decodeURIComponent(uri.split('/').pop() || '');
              const extension = name.split('.').pop()?.toLowerCase() || '';
              
              const fileInfo = await getFileInfo(uri);
              if (!fileInfo) return null;

              return {
                path: uri,
                uri,
                name,
                type: getFileType(extension),
                size: fileInfo.size || 0,
                modifiedTime: fileInfo.modificationTime || Date.now(),
                categoryId: directory.path
              };
            } catch {
              return null;
            }
          }
        );

        allFiles.push(...processedFiles);
      } catch (error) {
        console.warn('Error reading directory:', directory.uri, error);
      }
    }));

    // Sort files
    sortFiles(allFiles, sortOption);

    // Cache the results
    fileListCache.set(cacheKey, {
      files: allFiles,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    cleanupCache();

    // Calculate pagination
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const paginatedFiles = allFiles.slice(start, end);

    return {
      files: paginatedFiles,
      hasMore: end < allFiles.length
    };
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

function getFileType(extension: string): string {
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(extension)) {
    return 'image/jpeg';
  }
  
  // Video files
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) {
    return 'video/mp4';
  }
  
  // Audio files
  if (['mp3', 'wav', 'm4a', 'ogg', 'aac'].includes(extension)) {
    return 'audio/mpeg';
  }
  
  // Document files
  if (['pdf'].includes(extension)) {
    return 'application/pdf';
  }
  if (['doc', 'docx'].includes(extension)) {
    return 'application/msword';
  }
  if (['txt', 'md'].includes(extension)) {
    return 'text/plain';
  }
  
  // Default
  return 'application/octet-stream';
}

function sortFiles(files: FileItem[], sortOption: string) {
  switch (sortOption) {
    case 'date-desc':
      files.sort((a, b) => {
        // Primary sort by modification time
        const timeComparison = b.modifiedTime - a.modifiedTime;
        if (timeComparison !== 0) return timeComparison;
        
        // Secondary sort by name for stability
        const nameComparison = a.name.localeCompare(b.name);
        if (nameComparison !== 0) return nameComparison;
        
        // Final sort by path for absolute stability
        return a.path.localeCompare(b.path);
      });
      break;
    case 'date-asc':
      files.sort((a, b) => {
        // Primary sort by modification time
        const timeComparison = a.modifiedTime - b.modifiedTime;
        if (timeComparison !== 0) return timeComparison;
        
        // Secondary sort by name for stability
        const nameComparison = a.name.localeCompare(b.name);
        if (nameComparison !== 0) return nameComparison;
        
        // Final sort by path for absolute stability
        return a.path.localeCompare(b.path);
      });
      break;
    case 'name-asc':
      files.sort((a, b) => {
        const nameComparison = a.name.localeCompare(b.name);
        if (nameComparison !== 0) return nameComparison;
        return a.path.localeCompare(b.path);
      });
      break;
    case 'name-desc':
      files.sort((a, b) => {
        const nameComparison = b.name.localeCompare(a.name);
        if (nameComparison !== 0) return nameComparison;
        return b.path.localeCompare(a.path);
      });
      break;
    case 'type-asc':
      files.sort((a, b) => {
        const typeComparison = a.type.localeCompare(b.type);
        if (typeComparison !== 0) return typeComparison;
        return a.path.localeCompare(b.path);
      });
      break;
    case 'type-desc':
      files.sort((a, b) => {
        const typeComparison = b.type.localeCompare(a.type);
        if (typeComparison !== 0) return typeComparison;
        return b.path.localeCompare(a.path);
      });
      break;
    case 'size-desc':
      files.sort((a, b) => {
        const sizeComparison = (b.size || 0) - (a.size || 0);
        if (sizeComparison !== 0) return sizeComparison;
        return a.path.localeCompare(b.path);
      });
      break;
    case 'size-asc':
      files.sort((a, b) => {
        const sizeComparison = (a.size || 0) - (b.size || 0);
        if (sizeComparison !== 0) return sizeComparison;
        return a.path.localeCompare(b.path);
      });
      break;
  }
} 