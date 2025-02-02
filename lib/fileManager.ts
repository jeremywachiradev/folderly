import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system';
import { FileItem } from '@/types';
import { AndroidDirectory } from './androidDirectories';

const PAGE_SIZE = 20;

type FileInfoResult = FileSystem.FileInfo & {
  exists: boolean;
  isDirectory: boolean;
  size?: number;
  modificationTime?: number;
};

export async function listFiles(
  directories: AndroidDirectory[],
  page: number = 1,
  sortOption: string = 'date-desc'
): Promise<{ files: FileItem[]; hasMore: boolean }> {
  try {
    const allFiles: FileItem[] = [];
    const processedPaths = new Set<string>();

    // Collect files from all directories
    for (const directory of directories) {
      if (!directory.uri) continue;

      try {
        const files = await StorageAccessFramework.readDirectoryAsync(directory.uri);
        
        for (const uri of files) {
          try {
            // Get file info using FileSystem
            const fileInfo = await FileSystem.getInfoAsync(uri, { size: true }) as FileInfoResult;
            
            // Skip if file doesn't exist or we've already processed this path
            if (!fileInfo.exists || processedPaths.has(uri)) continue;
            processedPaths.add(uri);

            if (!fileInfo.isDirectory) {
              const name = uri.split('/').pop() || '';
              const extension = name.split('.').pop()?.toLowerCase() || '';
              
              allFiles.push({
                path: uri,
                uri,
                name,
                type: getFileType(extension),
                size: fileInfo.size || 0,
                modifiedTime: fileInfo.modificationTime || Date.now(),
                categoryId: directory.path
              });
            }
          } catch (error) {
            console.error('Error processing file:', error);
          }
        }
      } catch (error) {
        console.error('Error reading directory:', error);
      }
    }

    // Sort files
    sortFiles(allFiles, sortOption);

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
    return { files: [], hasMore: false };
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
      files.sort((a, b) => b.modifiedTime - a.modifiedTime);
      break;
    case 'date-asc':
      files.sort((a, b) => a.modifiedTime - b.modifiedTime);
      break;
    case 'name-asc':
      files.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      files.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'type-asc':
      files.sort((a, b) => a.type.localeCompare(b.type));
      break;
    case 'type-desc':
      files.sort((a, b) => b.type.localeCompare(a.type));
      break;
  }
} 