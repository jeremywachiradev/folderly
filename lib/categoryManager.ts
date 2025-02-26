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

    console.log('Creating category:', newCategory);
    await saveCategories([...categories, newCategory]);
    console.log('Category saved locally, now synchronizing with Appwrite...');
    
    // Skip cloud sync for guest users
    if (!userId.startsWith('guest_')) {
      try {
        await saveCategoriesToCloud(userId, [...categories, newCategory]);
        console.log('Category synchronized with Appwrite successfully.');
      } catch (cloudError) {
        console.error('Error synchronizing with Appwrite:', cloudError);
        console.log('Category will be available locally but not in the cloud.');
        // Don't throw error here, continue with local success
      }
    } else {
      console.log('Guest user detected, skipping cloud synchronization');
    }
    
    showToast('success', 'Category created successfully!');
    return newCategory;
  } catch (error) {
    console.error('Error creating category:', error);
    showToast('error', error instanceof Error ? error.message : 'Failed to create category');
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
        console.log('Category update synchronized with Appwrite successfully.');
      } catch (cloudError) {
        console.error('Error synchronizing update with Appwrite:', cloudError);
        console.log('Category update will be available locally but not in the cloud.');
        // Don't throw error here, continue with local success
      }
    } else if (userId) {
      console.log('Guest user detected, skipping cloud synchronization for update');
    }
    
    return updatedCategory;
  } catch (error) {
    console.error('Error updating category:', error);
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
        console.log('Category deletion synchronized with Appwrite successfully.');
      } catch (cloudError) {
        console.error('Error synchronizing deletion with Appwrite:', cloudError);
        console.log('Category deletion will be applied locally but not in the cloud.');
        // Don't throw error here, continue with local success
      }
    } else {
      console.log('Guest user detected, skipping cloud synchronization for deletion');
    }
  } catch (error) {
    console.error('Error deleting category:', error);
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
        console.log('Directory addition synchronized with Appwrite successfully.');
      } catch (cloudError) {
        console.error('Error synchronizing directory addition with Appwrite:', cloudError);
        console.log('Directory addition will be available locally but not in the cloud.');
        // Don't throw error here, continue with local success
      }
    } else if (userId) {
      console.log('Guest user detected, skipping cloud synchronization for directory addition');
    }
    
    return updatedCategory;
  } catch (error) {
    console.error('Error adding directory to category:', error);
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
        console.log('Directory removal synchronized with Appwrite successfully.');
      } catch (cloudError) {
        console.error('Error synchronizing directory removal with Appwrite:', cloudError);
        console.log('Directory removal will be available locally but not in the cloud.');
        // Don't throw error here, continue with local success
      }
    } else if (userId) {
      console.log('Guest user detected, skipping cloud synchronization for directory removal');
    }
    
    return updatedCategory;
  } catch (error) {
    console.error('Error removing directory from category:', error);
    throw error;
  }
};

export const getCategory = async (id: string): Promise<Category | undefined> => {
  try {
    const categories = await getCategories();
    return categories.find(cat => cat.id === id);
  } catch (error) {
    console.error('Error getting category:', error);
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