import React, { useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/ui';
import CategoryForm from '@/components/CategoryForm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCategory } from '@/lib/categoryManager';
import { Category } from '@/types';

export default function CategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);

  const isEditing = params.mode === 'edit';
  const title = isEditing ? 'Edit Category' : 'New Category';

  useEffect(() => {
    if (isEditing && params.id) {
      loadCategory(params.id as string);
    }
  }, [params.id, isEditing]);

  const loadCategory = async (id: string) => {
    try {
      setLoading(true);
      const loadedCategory = await getCategory(id);
      if (!loadedCategory) {
        Alert.alert('Error', 'Category not found');
        router.back();
        return;
      }
      setCategory(loadedCategory);
    } catch (error) {
      Alert.alert('Error', 'Failed to load category');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() }
      ]
    );
  };

  return (
    <View 
      className="flex-1 bg-white dark:bg-neutral-900"
      style={{ paddingTop: insets.top }}
    >
      <Header
        title={title}
        showBack
        onBackPress={handleBackPress}
      />
      <CategoryForm 
        category={category || undefined}
        isEditing={isEditing}
        loading={loading}
      />
    </View>
  );
} 