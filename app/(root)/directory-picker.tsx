import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/ui';
import DirectoryPicker from '@/components/DirectoryPicker';

export default function DirectoryPickerPage() {
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState('/storage/emulated/0');

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <Header
        title="Select Directory"
        showBack
        action={{
          icon: "checkmark",
          onPress: () => router.back(),
          label: "Done",
        }}
      />
      <DirectoryPicker
        currentPath={currentPath}
        onSelect={async (path) => {
          setCurrentPath(path);
        }}
        onClose={() => router.back()}
      />
    </View>
  );
} 