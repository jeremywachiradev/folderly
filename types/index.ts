import { AndroidDirectory } from '@/lib/androidDirectories';

export type SortOption = 'date-desc' | 'date-asc' | 'type-asc' | 'type-desc' | 'name-asc' | 'name-desc';

export interface FileItem {
  name: string;
  path: string;
  uri: string;
  size: number;
  type: string;
  categoryId: string;
  modifiedTime: number;
  displayName?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  directories: AndroidDirectory[];
  createdAt: number;
  updatedAt: number;
} 