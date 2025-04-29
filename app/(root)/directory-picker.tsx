import React from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/ui';
import DirectoryPicker from '@/components/DirectoryPicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DirectoryPickerPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: 'single' | 'multiple' }>();

  return (
    <View 
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
      style={{ paddingTop: insets.top }}
    >
      <Header
        title="Select Directory"
        showBack
        onBackPress={() => router.back()}
      />
      <DirectoryPicker
        mode={mode as 'single' | 'multiple'}
        onClose={() => router.back()}
      />
    </View>
  );
} 