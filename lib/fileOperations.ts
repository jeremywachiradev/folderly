import * as FileSystem from 'expo-file-system';
import { FileItem } from './fileSystem';

interface FileOperationError extends Error {
  code?: string;
}

export async function createFolder(path: string, name: string): Promise<void> {
  try {
    if (!path || !name) {
      throw new Error('Path and name are required');
    }

    const newFolderPath = `${path}/${name}`.replace(/\/+/g, '/');
    
    // Check if folder already exists
    const folderInfo = await FileSystem.getInfoAsync(newFolderPath);
    if (folderInfo.exists) {
      throw new Error('A folder with this name already exists');
    }

    // Create the folder
    await FileSystem.makeDirectoryAsync(newFolderPath, {
      intermediates: false
    });
  } catch (error) {
    const err = error as FileOperationError;
    throw new Error(`Failed to create folder: ${err.message}`);
  }
}

export async function renameItem(oldPath: string, newName: string): Promise<void> {
  try {
    if (!oldPath || !newName) {
      throw new Error('Old path and new name are required');
    }

    const pathParts = oldPath.split('/');
    pathParts.pop(); // Remove the old name
    const newPath = `${pathParts.join('/')}/${newName}`.replace(/\/+/g, '/');

    // Check if source exists
    const sourceInfo = await FileSystem.getInfoAsync(oldPath);
    if (!sourceInfo.exists) {
      throw new Error('Source file does not exist');
    }

    // Check if destination already exists
    const destInfo = await FileSystem.getInfoAsync(newPath);
    if (destInfo.exists) {
      throw new Error('An item with this name already exists');
    }

    // Rename/move the item
    await FileSystem.moveAsync({
      from: oldPath,
      to: newPath
    });
  } catch (error) {
    const err = error as FileOperationError;
    throw new Error(`Failed to rename item: ${err.message}`);
  }
}

export async function moveItems(items: FileItem[], destinationPath: string): Promise<void> {
  try {
    if (!items.length || !destinationPath) {
      throw new Error('Items and destination path are required');
    }

    // Validate destination exists and is a directory
    const destInfo = await FileSystem.getInfoAsync(destinationPath);
    if (!destInfo.exists || !destInfo.isDirectory) {
      throw new Error('Invalid destination folder');
    }

    // Move each item
    await Promise.all(items.map(async (item) => {
      if (!item.uri || !item.name) {
        throw new Error('Invalid file item');
      }

      const fileName = item.name;
      const newPath = `${destinationPath}/${fileName}`.replace(/\/+/g, '/');

      // Check if source exists
      const sourceInfo = await FileSystem.getInfoAsync(item.uri);
      if (!sourceInfo.exists) {
        throw new Error(`Source file "${fileName}" does not exist`);
      }

      // Check if destination already exists
      const fileExists = await FileSystem.getInfoAsync(newPath);
      if (fileExists.exists) {
        throw new Error(`"${fileName}" already exists in destination folder`);
      }

      // Move the item
      await FileSystem.moveAsync({
        from: item.uri,
        to: newPath
      });
    }));
  } catch (error) {
    const err = error as FileOperationError;
    throw new Error(`Failed to move items: ${err.message}`);
  }
}

export async function copyItems(items: FileItem[], destinationPath: string): Promise<void> {
  try {
    if (!items.length || !destinationPath) {
      throw new Error('Items and destination path are required');
    }

    // Validate destination exists and is a directory
    const destInfo = await FileSystem.getInfoAsync(destinationPath);
    if (!destInfo.exists || !destInfo.isDirectory) {
      throw new Error('Invalid destination folder');
    }

    // Copy each item
    await Promise.all(items.map(async (item) => {
      if (!item.uri || !item.name) {
        throw new Error('Invalid file item');
      }

      const fileName = item.name;
      const newPath = `${destinationPath}/${fileName}`.replace(/\/+/g, '/');

      // Check if source exists
      const sourceInfo = await FileSystem.getInfoAsync(item.uri);
      if (!sourceInfo.exists) {
        throw new Error(`Source file "${fileName}" does not exist`);
      }

      // Check if destination already exists
      const fileExists = await FileSystem.getInfoAsync(newPath);
      if (fileExists.exists) {
        throw new Error(`"${fileName}" already exists in destination folder`);
      }

      // Copy the item
      await FileSystem.copyAsync({
        from: item.uri,
        to: newPath
      });
    }));
  } catch (error) {
    const err = error as FileOperationError;
    throw new Error(`Failed to copy items: ${err.message}`);
  }
}

export async function deleteItems(items: FileItem[]): Promise<void> {
  try {
    if (!items.length) {
      throw new Error('No items to delete');
    }

    // Delete each item
    await Promise.all(items.map(async (item) => {
      if (!item.uri) {
        throw new Error('Invalid file item');
      }

      const info = await FileSystem.getInfoAsync(item.uri);
      if (!info.exists) {
        throw new Error(`"${item.name}" does not exist`);
      }

      await FileSystem.deleteAsync(item.uri, { idempotent: true });
    }));
  } catch (error) {
    const err = error as FileOperationError;
    throw new Error(`Failed to delete items: ${err.message}`);
  }
} 