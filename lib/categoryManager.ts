import AsyncStorage from '@react-native-async-storage/async-storage';
import { AndroidDirectory } from './androidDirectories';

export interface Category {
  id: string;
  name: string;
  color: string;
  directories: AndroidDirectory[];
  createdAt: number;
  updatedAt: number;
}

const CATEGORIES_STORAGE_KEY = '@folderly/categories';

export const createCategory = async (
  name: string,
  color: string = '#007AFF',
  directories: AndroidDirectory[] = []
): Promise<Category> => {
  try {
    const categories = await getCategories();
    
    // Check for duplicate names
    if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('A category with this name already exists');
    }

    const newCategory: Category = {
      id: Date.now().toString(),
      name,
      color,
      directories,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await saveCategories([...categories, newCategory]);
    return newCategory;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const data = await AsyncStorage.getItem(CATEGORIES_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};

export const updateCategory = async (
  id: string,
  updates: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Category> => {
  try {
    const categories = await getCategories();
    const index = categories.findIndex(cat => cat.id === id);
    
    if (index === -1) {
      throw new Error('Category not found');
    }

    // Check for duplicate names if name is being updated
    if (updates.name && 
        categories.some(cat => 
          cat.id !== id && 
          cat.name.toLowerCase() === updates.name?.toLowerCase()
        )) {
      throw new Error('A category with this name already exists');
    }

    const updatedCategory = {
      ...categories[index],
      ...updates,
      updatedAt: Date.now()
    };

    categories[index] = updatedCategory;
    await saveCategories(categories);
    
    return updatedCategory;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    const categories = await getCategories();
    const filtered = categories.filter(cat => cat.id !== id);
    await saveCategories(filtered);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

export const addDirectoryToCategory = async (
  categoryId: string,
  directory: AndroidDirectory
): Promise<Category> => {
  try {
    const categories = await getCategories();
    const index = categories.findIndex(cat => cat.id === categoryId);
    
    if (index === -1) {
      throw new Error('Category not found');
    }

    // Check if directory already exists in the category
    if (categories[index].directories.some(dir => dir.path === directory.path)) {
      throw new Error('Directory already exists in this category');
    }

    const updatedCategory = {
      ...categories[index],
      directories: [...categories[index].directories, directory],
      updatedAt: Date.now()
    };

    categories[index] = updatedCategory;
    await saveCategories(categories);
    
    return updatedCategory;
  } catch (error) {
    console.error('Error adding directory to category:', error);
    throw error;
  }
};

export const removeDirectoryFromCategory = async (
  categoryId: string,
  directoryPath: string
): Promise<Category> => {
  try {
    const categories = await getCategories();
    const index = categories.findIndex(cat => cat.id === categoryId);
    
    if (index === -1) {
      throw new Error('Category not found');
    }

    const updatedCategory = {
      ...categories[index],
      directories: categories[index].directories.filter(dir => dir.path !== directoryPath),
      updatedAt: Date.now()
    };

    categories[index] = updatedCategory;
    await saveCategories(categories);
    
    return updatedCategory;
  } catch (error) {
    console.error('Error removing directory from category:', error);
    throw error;
  }
};

const saveCategories = async (categories: Category[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (error) {
    console.error('Error saving categories:', error);
    throw error;
  }
}; 