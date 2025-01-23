import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { FileItem } from '@/lib/fileSystem';

interface FileUploadProps {
  visible: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
  currentPath: string;
}

interface UploadingFile {
  name: string;
  uri: string;
  size: number;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export default function FileUpload({
  visible,
  onClose,
  onUploadComplete,
  currentPath,
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map(asset => ({
          name: asset.name,
          uri: asset.uri,
          size: asset.size || 0,
          progress: 0,
          status: 'uploading' as const
        }));

        setUploadingFiles(prev => [...prev, ...newFiles]);
        newFiles.forEach(file => startUpload(file));
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick files');
    }
  };

  const startUpload = async (file: UploadingFile) => {
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
              ? { ...f, progress }
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

      // Check if all files are completed
      const allCompleted = uploadingFiles.every(f => 
        f.status === 'completed' || f.status === 'error'
      );
      if (allCompleted) {
        onUploadComplete();
      }
    } catch (err: any) {
      setUploadingFiles(prev =>
        prev.map(f =>
          f.uri === file.uri
            ? { ...f, status: 'error', error: err.message }
            : f
        )
      );
    }
  };

  const handleClose = () => {
    if (uploadingFiles.some(f => f.status === 'uploading')) {
      Alert.alert(
        'Cancel Uploads',
        'Are you sure you want to cancel ongoing uploads?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: () => {
              setUploadingFiles([]);
              onClose();
            }
          }
        ]
      );
    } else {
      setUploadingFiles([]);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50">
        <View className="flex-1 mt-20 bg-white dark:bg-zinc-900 rounded-t-xl">
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-zinc-100 dark:border-zinc-800">
            <Text className="text-xl font-rubik-medium text-black-300 dark:text-white">
              Upload Files
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons
                name="close"
                size={24}
                className="text-black-400 dark:text-zinc-400"
              />
            </TouchableOpacity>
          </View>

          {/* Upload List */}
          <View className="flex-1 p-4">
            {uploadingFiles.length === 0 ? (
              <View className="flex-1 justify-center items-center">
                <TouchableOpacity
                  onPress={pickFiles}
                  className="items-center"
                >
                  <View className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full items-center justify-center mb-4">
                    <Ionicons
                      name="cloud-upload-outline"
                      size={32}
                      className="text-primary-500"
                    />
                  </View>
                  <Text className="font-rubik-medium text-black-300 dark:text-white text-lg mb-2">
                    Upload Files
                  </Text>
                  <Text className="font-rubik text-black-400 dark:text-zinc-400 text-center">
                    Tap to select files from your device
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {uploadingFiles.map((file, index) => (
                  <View
                    key={file.uri}
                    className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 mb-4"
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1">
                        <Text className="font-rubik-medium text-black-300 dark:text-white" numberOfLines={1}>
                          {file.name}
                        </Text>
                        <Text className="font-rubik text-black-400 dark:text-zinc-400 text-sm">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Text>
                      </View>
                      {file.status === 'completed' && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          className="text-green-500"
                        />
                      )}
                      {file.status === 'error' && (
                        <Ionicons
                          name="alert-circle"
                          size={24}
                          className="text-red-500"
                        />
                      )}
                    </View>

                    {file.status === 'uploading' && (
                      <View className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <View
                          className="h-full bg-primary-500"
                          style={{ width: `${file.progress * 100}%` }}
                        />
                      </View>
                    )}

                    {file.status === 'error' && file.error && (
                      <Text className="font-rubik text-red-500 text-sm mt-1">
                        {file.error}
                      </Text>
                    )}
                  </View>
                ))}

                <TouchableOpacity
                  onPress={pickFiles}
                  className="bg-primary-500 rounded-lg py-3 mt-4"
                >
                  <Text className="font-rubik-medium text-white text-center">
                    Upload More Files
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
} 