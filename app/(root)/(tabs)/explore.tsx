import React from 'react';
import { View } from 'react-native';
import { useFileSystem } from '@/lib/hooks/useFileSystem';
import { EmptyState, Loading } from '@/components/ui';
import FileList from '@/components/FileList';

export default function ExploreScreen() {
  const { currentPath, files, isLoading, error, refresh } = useFileSystem();

  if (isLoading) {
    return <Loading fullScreen text="Loading files..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon="alert-circle"
        title="Error loading files"
        description={error}
      />
    );
  }

  if (!files || files.length === 0) {
    return (
      <EmptyState
        icon="folder-open"
        title="No files found"
        description="Add files to start organizing them into categories"
        action={{
          label: "Upload files",
          onPress: () => {/* TODO: Implement file upload */},
          icon: "cloud-upload"
        }}
      />
    );
  }

  return (
    <View className="flex-1">
      <FileList directories={[currentPath]} onRefresh={refresh} />
    </View>
  );
}

