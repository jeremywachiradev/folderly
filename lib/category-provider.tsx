import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category } from './categoryManager';

const CATEGORIES_STORAGE_KEY = '@folderly/categories';

interface CategoryContextType {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  isLoading: boolean;
  loadCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | null>(null);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const categoriesJson = await AsyncStorage.getItem(CATEGORIES_STORAGE_KEY);

      if (categoriesJson) {
        const parsedCategories = JSON.parse(categoriesJson);
        setCategories(parsedCategories);
      } else {
        setCategories([]);
      }
    } catch (error) {
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCategories = async (newCategories: Category[]) => {
    try {
      await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(newCategories));
      setCategories(newCategories);
    } catch (error) {
      console.error('Error saving categories:', error);
    }
  };

  const addCategory = async (category: Category) => {
    try {
      const newCategories = [...categories, category];
      await saveCategories(newCategories);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const newCategories = categories.map(cat =>
      cat.id === id ? { ...cat, ...updates } : cat
    );
    await saveCategories(newCategories);
    setCategories(newCategories);
  };

  const deleteCategory = async (id: string) => {
    const newCategories = categories.filter(cat => cat.id !== id);
    await saveCategories(newCategories);
    setCategories(newCategories);
  };

  return (
    <CategoryContext.Provider
      value={{
        categories,
        setCategories,
        addCategory,
        updateCategory,
        deleteCategory,
        isLoading,
        loadCategories
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