import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import * as Zip from 'react-native-zip-archive';
import { FileItem } from '@/lib/fileSystem';
import FileShare from './FileShare';
import { useTheme } from '@/lib/theme-provider';

interface FileOperationsProps {
  selectedFiles: FileItem[];
  onComplete: () => void;
  onError: (error: string) => void;
}

interface OperationProgress {
  current: number;
  total: number;
  operation: string;
}

export default function FileOperations({ selectedFiles, onComplete, onError }: FileOperationsProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<OperationProgress | null>(null);
  const [targetDirectory, setTargetDirectory] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const router = useRouter();
  const { isDarkMode } = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: isDarkMode ? '#1e293b' : 'white',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: isDarkMode ? '#f1f5f9' : '#0f172a',
    },
    content: {
      maxHeight: '60%',
    },
    operationsContainer: {
      padding: 16,
      gap: 16,
    },
    operationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    operationText: {
      flex: 1,
      color: isDarkMode ? '#7cc2ff' : '#0077ff',
      fontSize: 16,
    },
    deleteText: {
      color: isDarkMode ? '#fca5a5' : '#ef4444',
    },
    progressContainer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    progressText: {
      fontSize: 14,
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: 8,
    },
    progressBar: {
      height: 4,
      backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: isDarkMode ? '#7cc2ff' : '#0077ff',
    },
  });

  const handleCopy = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        onError('Permission denied');
        return;
      }

      setProgress({ current: 0, total: selectedFiles.length, operation: 'copy' });
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const asset = await MediaLibrary.createAssetAsync(file.path);
        await MediaLibrary.createAlbumAsync('Folderly', asset, false);
        setProgress(prev => prev ? { ...prev, current: i + 1 } : null);
      }
      
      setProgress(null);
      onComplete();
    } catch (error) {
      onError('Failed to copy files');
    }
  };

  const handleMove = async () => {
    if (!targetDirectory) {
      router.push('/directory-picker');
      return;
    }

    try {
      setLoading(true);
      setProgress({ current: 0, total: selectedFiles.length, operation: 'move' });
      let successCount = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const sourcePath = selectedFiles[i].path;
        try {
          const fileName = sourcePath.split('/').pop();
          const destinationPath = `${targetDirectory}/${fileName}`;

          // Check if file already exists
          const destInfo = await FileSystem.getInfoAsync(destinationPath);
          if (destInfo.exists) {
            const newName = await getUniqueFileName(targetDirectory, fileName || '');
            await FileSystem.moveAsync({
              from: sourcePath,
              to: `${targetDirectory}/${newName}`
            });
          } else {
            await FileSystem.moveAsync({
              from: sourcePath,
              to: destinationPath
            });
          }
          successCount++;
          setProgress(prev => prev ? { ...prev, current: i + 1 } : null);
        } catch (error) {
          console.error(`Error moving file ${sourcePath}:`, error);
        }
      }

      setProgress(null);
      Alert.alert(
        'Move Complete',
        `Successfully moved ${successCount} of ${selectedFiles.length} files`
      );
      onComplete();
    } catch (error) {
      console.error('Error during move operation:', error);
      Alert.alert('Error', 'Failed to move files');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Files',
      `Are you sure you want to delete ${selectedFiles.length} file(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setProgress({ current: 0, total: selectedFiles.length, operation: 'delete' });
              
              for (let i = 0; i < selectedFiles.length; i++) {
                await FileSystem.deleteAsync(selectedFiles[i].path);
                setProgress(prev => prev ? { ...prev, current: i + 1 } : null);
              }
              
              setProgress(null);
              onComplete();
            } catch (error) {
              onError('Failed to delete files');
            }
          },
        },
      ]
    );
  };

  const handleCompress = async () => {
    try {
      setProgress({ current: 0, total: selectedFiles.length, operation: 'compress' });
      
      // Create a temporary directory for compression
      const tempDir = `${FileSystem.cacheDirectory}temp_zip_${Date.now()}/`;
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
      
      // Copy files to temp directory
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const destPath = `${tempDir}${file.name}`;
        await FileSystem.copyAsync({
          from: file.path,
          to: destPath
        });
        setProgress(prev => prev ? { ...prev, current: i + 1 } : null);
      }

      // Create zip file
      const zipPath = `${FileSystem.documentDirectory}archive_${Date.now()}.zip`;
      await Zip.zip(tempDir, zipPath);
      
      // Clean up temp directory
      await FileSystem.deleteAsync(tempDir, { idempotent: true });
      
      setProgress(null);
      Alert.alert('Success', 'Files compressed successfully');
      onComplete();
    } catch (error) {
      onError('Failed to compress files');
    }
  };

  const handleDecompress = async () => {
    if (selectedFiles.length !== 1 || !selectedFiles[0].name.toLowerCase().endsWith('.zip')) {
      Alert.alert('Error', 'Please select a single ZIP file to decompress');
      return;
    }

    try {
      setProgress({ current: 0, total: 1, operation: 'decompress' });
      
      const zipFile = selectedFiles[0];
      const extractPath = `${FileSystem.documentDirectory}extracted_${Date.now()}/`;
      
      await FileSystem.makeDirectoryAsync(extractPath, { intermediates: true });
      await Zip.unzip(zipFile.path, extractPath);
      
      setProgress(prev => prev ? { ...prev, current: 1 } : null);
      setProgress(null);
      Alert.alert('Success', 'File decompressed successfully');
      onComplete();
    } catch (error) {
      onError('Failed to decompress file');
    }
  };

  const getUniqueFileName = async (directory: string, fileName: string): Promise<string> => {
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    const extension = fileName.slice(fileName.lastIndexOf('.'));
    let counter = 1;
    let newName = fileName;

    while (true) {
      const exists = await FileSystem.getInfoAsync(`${directory}/${newName}`);
      if (!exists.exists) break;
      newName = `${nameWithoutExt} (${counter})${extension}`;
      counter++;
    }

    return newName;
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="slide"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
          </Text>
          <TouchableOpacity onPress={onComplete}>
            <Ionicons name="close" size={24} color="#999999" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.operationsContainer}>
            <TouchableOpacity
              onPress={handleCopy}
              disabled={loading}
              style={styles.operationButton}
            >
              <Ionicons name="copy-outline" size={24} color="#007AFF" />
              <Text style={styles.operationText}>Copy to Gallery</Text>
              {loading && <ActivityIndicator color="#007AFF" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleMove}
              disabled={loading}
              style={styles.operationButton}
            >
              <Ionicons name="arrow-forward-outline" size={24} color="#007AFF" />
              <Text style={styles.operationText}>Move to...</Text>
              {loading && <ActivityIndicator color="#007AFF" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDelete}
              disabled={loading}
              style={styles.operationButton}
            >
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              <Text style={[styles.operationText, styles.deleteText]}>Delete</Text>
              {loading && <ActivityIndicator color="#FF3B30" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCompress}
              disabled={loading}
              style={styles.operationButton}
            >
              <Ionicons name="archive-outline" size={24} color="#007AFF" />
              <Text style={styles.operationText}>Compress</Text>
              {loading && <ActivityIndicator color="#007AFF" />}
            </TouchableOpacity>

            {selectedFiles.length === 1 && selectedFiles[0].name.toLowerCase().endsWith('.zip') && (
              <TouchableOpacity
                onPress={handleDecompress}
                disabled={loading}
                style={styles.operationButton}
              >
                <Ionicons name="folder-open-outline" size={24} color="#007AFF" />
                <Text style={styles.operationText}>Extract</Text>
                {loading && <ActivityIndicator color="#007AFF" />}
              </TouchableOpacity>
            )}

            {selectedFiles.length === 1 && (
              <TouchableOpacity
                onPress={() => setShowShareModal(true)}
                disabled={loading}
                style={styles.operationButton}
              >
                <Ionicons name="qr-code-outline" size={24} color="#007AFF" />
                <Text style={styles.operationText}>Share via QR Code</Text>
                {loading && <ActivityIndicator color="#007AFF" />}
              </TouchableOpacity>
            )}
          </View>

          {progress && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {progress.operation === 'copy' ? 'Copying' :
                 progress.operation === 'move' ? 'Moving' :
                 progress.operation === 'delete' ? 'Deleting' :
                 progress.operation === 'compress' ? 'Compressing' :
                 'Extracting'} files... ({progress.current}/{progress.total})
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${(progress.current / progress.total) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          )}
        </ScrollView>

        {selectedFiles.length === 1 && (
          <FileShare
            file={selectedFiles[0]}
            visible={showShareModal}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </View>
    </Modal>
  );
} 