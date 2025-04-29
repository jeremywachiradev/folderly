import AsyncStorage from '@react-native-async-storage/async-storage';
import { AndroidDirectory } from './androidDirectories';
import { saveCategories as saveCategoriesToCloud, deleteCategories } from './config-sync';
import { showToast } from './notifications';

export interface Category {
  id: string;
  name: string;
  color: string;
  directories: AndroidDirectory[];
  createdAt: number;
  updatedAt: number;
  isChecked?: boolean;
}

const CATEGORIES_STORAGE_KEY = '@folderly/categories';

export const createCategory = async (
  name: string,
  color: string = '#007AFF',
  directories: AndroidDirectory[] = [],
  userId: string
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
    
    
    // Skip cloud sync for guest users
    if (!userId.startsWith('guest_')) {
      try {
        await saveCategoriesToCloud(userId, [...categories, newCategory]);
        
      } catch (cloudError) {
        
        
        // Don't throw error here, continue with local success
      }
    } else {
      
    }
    
    showToast('success', 'Category created successfully!');
    return newCategory;
  } catch (error) {
    
    showToast('error', error instanceof Error ? error.message : 'Failed to create category');
    throw error;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const data = await AsyncStorage.getItem(CATEGORIES_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    
    return [];
  }
};

export const updateCategory = async (
  id: string,
  updates: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>,
  userId?: string
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
    
    // If userId is provided and not a guest user, sync with cloud
    if (userId && !userId.startsWith('guest_')) {
      try {
        await saveCategoriesToCloud(userId, categories);
        
      } catch (cloudError) {
        
        
        // Don't throw error here, continue with local success
      }
    } else if (userId) {
      
    }
    
    return updatedCategory;
  } catch (error) {
    
    throw error;
  }
};

export const deleteCategory = async (id: string, userId: string): Promise<void> => {
  try {
    const categories = await getCategories();
    const filtered = categories.filter(cat => cat.id !== id);
    await saveCategories(filtered);
    
    // Skip cloud sync for guest users
    if (!userId.startsWith('guest_')) {
      try {
        // Delete from Appwrite
        await deleteCategories(userId, [id]);
        
      } catch (cloudError) {
        
        
        // Don't throw error here, continue with local success
      }
    } else {
      
    }
  } catch (error) {
    
    showToast('error', 'Failed to delete category');
    throw error;
  }
};

export const addDirectoryToCategory = async (
  categoryId: string,
  directory: AndroidDirectory,
  userId?: string
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
    
    // If userId is provided and not a guest user, sync with cloud
    if (userId && !userId.startsWith('guest_')) {
      try {
        await saveCategoriesToCloud(userId, categories);
        
      } catch (cloudError) {
        
        
        // Don't throw error here, continue with local success
      }
    } else if (userId) {
      
    }
    
    return updatedCategory;
  } catch (error) {
    
    throw error;
  }
};

export const removeDirectoryFromCategory = async (
  categoryId: string,
  directoryPath: string,
  userId?: string
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
    
    // If userId is provided and not a guest user, sync with cloud
    if (userId && !userId.startsWith('guest_')) {
      try {
        await saveCategoriesToCloud(userId, categories);
        
      } catch (cloudError) {
        
        
        // Don't throw error here, continue with local success
      }
    } else if (userId) {
      
    }
    
    return updatedCategory;
  } catch (error) {
    
    throw error;
  }
};

export const getCategory = async (id: string): Promise<Category | undefined> => {
  try {
    const categories = await getCategories();
    return categories.find(cat => cat.id === id);
  } catch (error) {
    
    throw error;
  }
};

const saveCategories = async (categories: Category[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (error) {
    
    throw error;
  }
}; 