import { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { FileItem, getFilesFromDirectory } from '@/lib/fileSystem';

interface UseFileSystemReturn {
  currentPath: string;
  files: FileItem[];
  isLoading: boolean;
  error: string | null;
  navigate: (path: string) => void;
  refresh: () => Promise<void>;
}

export function useFileSystem(initialPath: string = FileSystem.documentDirectory || ''): UseFileSystemReturn {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedFiles = await getFilesFromDirectory(currentPath);
      setFiles(loadedFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  const navigate = (path: string) => {
    setCurrentPath(path);
  };

  const refresh = async () => {
    await loadFiles();
  };

  return {
    currentPath,
    files,
    isLoading,
    error,
    navigate,
    refresh
  };
} 