import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/ui';
import CategoryForm from '@/components/CategoryForm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NewCategory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View 
      className="flex-1 bg-white dark:bg-neutral-900"
      style={{ paddingTop: insets.top }}
    >
      <Header
        title="New Category"
        showBack
        onBackPress={() => router.back()}
      />
      <CategoryForm />
    </View>
  );
} 