import React, { useState } from 'react';
import { View, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useFileSystem } from '@/lib/hooks/useFileSystem';
import { Header, Loading } from '@/components/ui';

interface UploadingFile {
  uri: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export default function UploadScreen() {
  const router = useRouter();
  const { currentPath, refresh } = useFileSystem();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleSelectFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const newFiles: UploadingFile[] = result.assets.map(file => ({
        uri: file.uri,
        name: file.name || 'unknown',
        size: file.size || 0,
        progress: 0,
        status: 'pending'
      }));

      setUploadingFiles(prev => [...prev, ...newFiles]);
      startUploads(newFiles);
    } catch (err) {
      Alert.alert('Error', 'Failed to select files');
    }
  };

  const startUploads = async (files: UploadingFile[]) => {
    setIsUploading(true);

    try {
      await Promise.all(files.map(file => uploadFile(file)));
      await refresh();
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Some files failed to upload');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFile = async (file: UploadingFile) => {
    const destinationUri = `${currentPath}/${file.name}`;

    try {
      // Check if file already exists
      const fileInfo = await FileSystem.getInfoAsync(destinationUri);
      if (fileInfo.exists) {
        setUploadingFiles(prev =>
          prev.map(f =>
            f.uri === file.uri
              ? { ...f, status: 'error', error: 'File already exists' }
              : f
          )
        );
        return;
      }

      // Start the upload
      const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        setUploadingFiles(prev =>
          prev.map(f =>
            f.uri === file.uri
              ? { ...f, status: 'uploading', progress }
              : f
          )
        );
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        file.uri,
        destinationUri,
        {},
        callback
      );

      await downloadResumable.downloadAsync();

      setUploadingFiles(prev =>
        prev.map(f =>
          f.uri === file.uri
            ? { ...f, status: 'completed', progress: 1 }
            : f
        )
      );
    } catch (err) {
      setUploadingFiles(prev =>
        prev.map(f =>
          f.uri === file.uri
            ? { ...f, status: 'error', error: 'Upload failed' }
            : f
        )
      );
      throw err;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <View className="flex-1">
      <Header
        title="Upload Files"
        showBack
        action={
          uploadingFiles.length > 0
            ? {
                icon: 'close',
                onPress: () => router.back(),
                label: 'Cancel',
              }
            : undefined
        }
      />

      <ScrollView className="flex-1 p-4">
        {uploadingFiles.map((file, index) => (
          <View
            key={file.uri}
            className="bg-white dark:bg-neutral-800 rounded-lg p-4 mb-4 shadow-sm"
          >
            <View className="flex-row items-center mb-2">
              <Ionicons
                name={
                  file.status === 'completed'
                    ? 'checkmark-circle'
                    : file.status === 'error'
                    ? 'alert-circle'
                    : 'cloud-upload'
                }
                size={24}
                color={
                  file.status === 'completed'
                    ? '#22c55e'
                    : file.status === 'error'
                    ? '#ef4444'
                    : '#3b82f6'
                }
              />
              <Text className="flex-1 ml-2 font-medium text-neutral-900 dark:text-white">
                {file.name}
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                {formatFileSize(file.size)}
              </Text>
            </View>

            <View className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
              <View
                className={`h-full rounded-full ${
                  file.status === 'completed'
                    ? 'bg-green-500'
                    : file.status === 'error'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${file.progress * 100}%` }}
              />
            </View>

            {file.error && (
              <Text className="mt-2 text-sm text-red-500">{file.error}</Text>
            )}
          </View>
        ))}
      </ScrollView>

      {!isUploading && (
        <View className="p-4">
          <TouchableOpacity
            onPress={handleSelectFiles}
            className="bg-primary-500 rounded-lg p-4 items-center justify-center shadow-sm"
          >
            <Text className="text-white font-medium">Select Files</Text>
          </TouchableOpacity>
        </View>
      )}

      {isUploading && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <Loading text="Uploading files..." />
        </View>
      )}
    </View>
  );
} 