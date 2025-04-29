import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileItem } from '@/types';

// Helper function to normalize URIs for comparison
const normalizeUri = (uri: string) => {
  try {
    const decodedUri = decodeURIComponent(uri);
    return decodedUri.replace(/([^:])\/\//g, '$1/');
  } catch {
    return uri;
  }
};

interface FileStore {
  files: FileItem[];
  setFiles: (files: FileItem[]) => void;
  addFiles: (files: FileItem[]) => void;
  currentFile: FileItem | null;
  setCurrentFile: (file: FileItem | null) => void;
  findFileByPath: (path: string) => FileItem | null;
  updateFile: (path: string, updates: Partial<FileItem>) => void;
  clearFiles: () => void;
}

export const useFileStore = create<FileStore>()(
  persist(
    (set, get) => ({
      files: [],
      currentFile: null,
      setFiles: (files: FileItem[]) => set({ files }),
      addFiles: (newFiles: FileItem[]) => {
        const { files } = get();
        const existingFiles = new Map(
          files.map(file => [normalizeUri(file.uri), file])
        );
        
        newFiles.forEach(newFile => {
          if (newFile.uri) {
            existingFiles.set(normalizeUri(newFile.uri), newFile);
          }
        });
        
        const updatedFiles = Array.from(existingFiles.values());
        set({ files: updatedFiles });
      },
      setCurrentFile: (file: FileItem | null) => set({ currentFile: file }),
      findFileByPath: (path: string) => {
        const { files, currentFile } = get();
        const normalizedPath = normalizeUri(path);
        
        if (currentFile?.uri && normalizeUri(currentFile.uri) === normalizedPath) {
          return currentFile;
        }
        
        return files.find(f => normalizeUri(f.uri) === normalizedPath) || null;
      },
      updateFile: (path: string, updates: Partial<FileItem>) => {
        const { files } = get();
        const normalizedPath = normalizeUri(path);
        const fileIndex = files.findIndex(f => normalizeUri(f.uri) === normalizedPath);
        if (fileIndex >= 0) {
          const updatedFiles = [...files];
          updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], ...updates };
          set({ files: updatedFiles });
        }
      },
      clearFiles: () => set({ files: [], currentFile: null }),
    }),
    {
      name: 'file-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
); 