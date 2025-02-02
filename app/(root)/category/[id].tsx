import React, { useState, useEffect } from 'react';
import {  View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Category, getCategories, deleteCategory } from '@/lib/categoryManager';
import { Header, Loading, EmptyState } from '@/components/ui';
import CategoryView from '@/components/CategoryView';

export default function CategoryPage() {
  const { id } = useLocalSearchParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof id === 'string') {
      loadCategory(id);
    } else {
      router.back();
    }
  }, [id]);

  const loadCategory = async (categoryId: string) => {
    try {
      setLoading(true);
      const categories = await getCategories();
      const found = categories.find(cat => cat.id === categoryId);
      
      if (!found) {
        router.back();
        return;
      }

      setCategory(found);
    } catch (error) {
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (category) {
      router.push(`/category/${category.id}/edit` as any);
    }
  };

  const handleDelete = async () => {
    if (!category) return;

    try {
      await deleteCategory(category.id);
      router.back();
    } catch (error) {
      // Error is handled by the deleteCategory function
    }
  };

  if (loading) {
    return <Loading fullScreen text="Loading category..." />;
  }

  if (!category) {
    return (
      <EmptyState
        icon="alert-circle"
        title="Category Not Found"
        description="The category you're looking for doesn't exist."
        action={{
          label: "Go Back",
          icon: "arrow-back",
          onPress: () => router.back(),
        }}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
      <Header
        title={category.name}
        showBack
        action={{
          icon: "ellipsis-horizontal",
          onPress: handleEdit,
          label: "Options",
        }}
      />
      <CategoryView
        category={category}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
} 