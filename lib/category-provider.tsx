import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category } from './categoryManager';
import { useAuth } from './auth-provider';
import { saveCategories, loadCategories, deleteCategories } from './config-sync';
import { showToast } from './notifications';

const CATEGORIES_STORAGE_KEY = '@folderly/categories';

interface CategoryContextType {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  deleteAllCategories: () => Promise<void>;
  isLoading: boolean;
  loadCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | null>(null);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isGuest } = useAuth();

  useEffect(() => {
    loadCategoriesData();
  }, [user?.id]);

  const loadCategoriesData = async () => {
    try {
      setIsLoading(true);

      if (user && !isGuest) {
        // Try to load from cloud first
        try {
          console.log('Loading categories from cloud for user:', user.id);
          const cloudCategories = await loadCategories(user.id);
          console.log('Successfully loaded categories from cloud:', cloudCategories.length);
          
          // If no categories found in cloud, check if this is the first login
          if (cloudCategories.length === 0) {
            const isFirstLogin = await AsyncStorage.getItem(`first_login_${user.id}`) === null;
            if (isFirstLogin) {
              console.log('First login detected with no categories, default categories will be created by auth provider');
            }
          }
          
          setCategories(cloudCategories);
          // Also update local storage as backup
          await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cloudCategories));
          setIsLoading(false);
          return;
        } catch (error) {
          console.error('Error loading cloud categories:', error);
          showToast('error', 'Failed to load categories from cloud');
        }
      }

      // Fall back to local storage
      const categoriesJson = await AsyncStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (categoriesJson) {
        const localCategories = JSON.parse(categoriesJson);
        setCategories(localCategories);

        // If user is logged in, sync local categories to cloud
        if (user && !isGuest) {
          try {
            await saveCategories(user.id, localCategories);
          } catch (error) {
            console.error('Error syncing local categories to cloud:', error);
            showToast('error', 'Failed to sync categories to cloud');
          }
        }
      } else if (user && !isGuest) {
        // No categories in local storage for logged-in user
        // Check if this is the first login
        const isFirstLogin = await AsyncStorage.getItem(`first_login_${user.id}`) === null;
        if (isFirstLogin) {
          console.log('First login detected with no local categories, default categories will be created by auth provider');
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      showToast('error', 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCategoriesData = async (newCategories: Category[]) => {
    try {
      console.log('=== START: saveCategoriesData ===', {
        isGuest,
        userId: user?.id,
        categoriesCount: newCategories.length
      });
      
      // Always save to local storage first
      await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(newCategories));
      
      // Only attempt cloud save if not in guest mode and have a user ID
      if (!isGuest && user?.id) {
        try {
          console.log('Attempting cloud save for user:', user.id);
          await saveCategories(user.id, newCategories);
          console.log('Cloud save successful');
        } catch (error) {
          console.error('Error during cloud save:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          throw error; // Let the caller handle the error
        }
      }
      
      console.log('=== END: saveCategoriesData - Success ===');
    } catch (error) {
      console.error('=== ERROR: saveCategoriesData ===', error);
      throw error;
    }
  };


  const addCategory = async (category: Category) => {
    console.log('=== START: addCategory ===');
    console.log('Adding category:', {
      name: category.name,
      id: category.id,
      isGuest,
      userId: user?.id
    });
  
    try {
      const newCategories = [...categories, category];
      
      // First attempt to save both locally and to cloud
      await saveCategoriesData(newCategories);
      
      // Update state after successful save
      setCategories(newCategories);
      
      // Show success toast
      showToast('success', 'Category added successfully');
      console.log('=== END: addCategory - Success ===');
    } catch (error) {
      console.error('=== ERROR: addCategory ===', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Show specific error message
      showToast('error', error instanceof Error ? error.message : 'Failed to add category');
      throw error; // Re-throw to be handled by the form
    }
  };


  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const newCategories = categories.map(cat => 
      cat.id === id ? { ...cat, ...updates, updatedAt: Date.now() } : cat
    );
    await saveCategoriesData(newCategories);
    setCategories(newCategories);
  };

  const deleteCategory = async (id: string) => {
    const newCategories = categories.filter(cat => cat.id !== id);
    await saveCategoriesData(newCategories);
    setCategories(newCategories);
  };

  const deleteAllCategories = async () => {
    try {
      console.log('=== START: deleteAllCategories ===');
      
      // Save empty array to local storage
      await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify([]));
      
      // If user is logged in, delete all categories from cloud
      if (!isGuest && user?.id) {
        try {
          // Get IDs of all categories to delete from cloud
          const categoryIds = categories.map(cat => cat.id);
          
          // Delete all categories from cloud
          if (categoryIds.length > 0) {
            await deleteCategories(user.id, categoryIds);
          }
          
          console.log('All categories deleted from cloud');
          
          // Reset first login flag to ensure default categories are created on next login
          await AsyncStorage.removeItem(`first_login_${user.id}`);
        } catch (error) {
          console.error('Error deleting categories from cloud:', error);
          showToast('error', 'Failed to delete all categories from cloud');
          throw error;
        }
      }
      
      // Update state
      setCategories([]);
      
      // Show success toast
      showToast('success', 'All categories deleted successfully');
      
      // Only show the "default categories will be restored" message for logged-in users
      if (!isGuest && user?.id) {
        showToast('info', 'Default categories will be restored on next login');
      }
      
      console.log('=== END: deleteAllCategories - Success ===');
    } catch (error) {
      console.error('=== ERROR: deleteAllCategories ===', error);
      showToast('error', 'Failed to delete all categories');
      throw error;
    }
  };

  return (
    <CategoryContext.Provider
      value={{
        categories,
        setCategories,
        addCategory,
        updateCategory,
        deleteCategory,
        deleteAllCategories,
        isLoading,
        loadCategories: loadCategoriesData
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
} 