import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { FileItem } from '@/lib/fileSystem';
import { moveItems, copyItems, deleteItems, renameItem } from '@/lib/fileOperations';
import FileOperations from './FileOperations';
import FolderPicker from './FolderPicker';

interface FileActionsProps {
  files: FileItem[];
  visible: boolean;
  onClose: () => void;
  onFilesChange: () => void;
  currentPath: string;
}

interface FileError extends Error {
  code?: string;
  message: string;
}

export default function FileActions({
  files,
  visible,
  onClose,
  onFilesChange,
  currentPath
}: FileActionsProps) {
  const [showRename, setShowRename] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSingleFile = files.length === 1;
  const firstFile = files[0];
  const hasMedia = files.some(f => f.type.match(/^(jpg|jpeg|png|gif|mp4|mov|avi|mp3|wav|m4a)$/i));
  const hasImages = files.some(f => f.type.match(/^(jpg|jpeg|png|gif)$/i));
  const hasVideos = files.some(f => f.type.match(/^(mp4|mov|avi)$/i));

  const handleShare = async () => {
    try {
      if (isSingleFile) {
        await Share.share({ url: firstFile.uri });
      } else {
        await Promise.all(files.map(file => Share.share({ url: file.uri })));
      }
    } catch (err: unknown) {
      const error = err as FileError;
      Alert.alert('Sharing Error', error.message || 'Failed to share file(s)');
    }
  };

  const handleSaveToGallery = async () => {
    try {
      setLoading(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to save media to your gallery');
        return;
      }

      // Create an album for multiple files
      let album: MediaLibrary.Album | null = null;
      if (files.length > 1) {
        album = await MediaLibrary.getAlbumAsync('My Files');
        if (!album) {
          album = await MediaLibrary.createAlbumAsync('My Files');
        }
      }

      // Save each media file
      await Promise.all(files.map(async (file) => {
        const asset = await MediaLibrary.createAssetAsync(file.uri);
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      }));

      Alert.alert('Success', 'Media saved to gallery');
    } catch (err: unknown) {
      const error = err as FileError;
      Alert.alert('Gallery Error', error.message || 'Failed to save to gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async (destinationPath: string) => {
    try {
      setLoading(true);
      await moveItems(files, destinationPath);
      onFilesChange();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (destinationPath: string) => {
    try {
      setLoading(true);
      await copyItems(files, destinationPath);
      onFilesChange();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Files',
      `Are you sure you want to delete ${files.length === 1 ? 'this file' : 'these files'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteItems(files);
              onFilesChange();
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRename = async (oldPath: string, newName: string) => {
    try {
      setLoading(true);
      await renameItem(oldPath, newName);
      onFilesChange();
      setShowRename(false);
      onClose();
    } catch (error) {
      console.error('Error renaming file:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-zinc-900 rounded-t-xl">
            <View className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <Text className="text-xl font-rubik-medium text-black-300 dark:text-white text-center">
                {isSingleFile ? firstFile.name : `${files.length} items selected`}
              </Text>
              {!isSingleFile && (
                <Text className="text-sm font-rubik text-black-400 dark:text-zinc-400 text-center mt-1">
                  Total size: {totalSize} bytes
                </Text>
              )}
            </View>

            <View className="p-4">
              <View className="flex-row flex-wrap justify-around">
                <TouchableOpacity
                  onPress={handleShare}
                  className="items-center p-4"
                >
                  <View className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full items-center justify-center mb-2">
                    <Ionicons name="share-outline" size={24} className="text-primary-500" />
                  </View>
                  <Text className="font-rubik text-black-300 dark:text-white">Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowMove(true)}
                  className="items-center p-4"
                >
                  <View className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full items-center justify-center mb-2">
                    <Ionicons name="move-outline" size={24} className="text-primary-500" />
                  </View>
                  <Text className="font-rubik text-black-300 dark:text-white">Move</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowCopy(true)}
                  className="items-center p-4"
                >
                  <View className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full items-center justify-center mb-2">
                    <Ionicons name="copy-outline" size={24} className="text-primary-500" />
                  </View>
                  <Text className="font-rubik text-black-300 dark:text-white">Copy</Text>
                </TouchableOpacity>

                {isSingleFile && (
                  <TouchableOpacity
                    onPress={() => setShowRename(true)}
                    className="items-center p-4"
                  >
                    <View className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full items-center justify-center mb-2">
                      <Ionicons name="pencil-outline" size={24} className="text-primary-500" />
                    </View>
                    <Text className="font-rubik text-black-300 dark:text-white">Rename</Text>
                  </TouchableOpacity>
                )}

                {hasMedia && (
                  <TouchableOpacity
                    onPress={handleSaveToGallery}
                    className="items-center p-4"
                  >
                    <View className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full items-center justify-center mb-2">
                      <Ionicons name="images-outline" size={24} className="text-primary-500" />
                    </View>
                    <Text className="font-rubik text-black-300 dark:text-white">Save to Gallery</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleDelete}
                  className="items-center p-4"
                >
                  <View className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full items-center justify-center mb-2">
                    <Ionicons name="trash-outline" size={24} className="text-red-500" />
                  </View>
                  <Text className="font-rubik text-red-500">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="p-4 border-t border-zinc-100 dark:border-zinc-800"
            >
              <Text className="font-rubik text-black-400 dark:text-zinc-400 text-center">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showRename && isSingleFile && (
        <FileOperations
          selectedFiles={[firstFile]}
          onComplete={() => {
            setShowRename(false);
            onFilesChange();
            onClose();
          }}
          onError={(error) => Alert.alert('Error', error)}
        />
      )}

      {showMove && (
        <FolderPicker
          visible={showMove}
          onClose={() => setShowMove(false)}
          onSelect={handleMove}
          currentPath={currentPath}
          excludePaths={files.map(f => f.uri)}
          title="Move to Folder"
        />
      )}

      {showCopy && (
        <FolderPicker
          visible={showCopy}
          onClose={() => setShowCopy(false)}
          onSelect={handleCopy}
          currentPath={currentPath}
          title="Copy to Folder"
        />
      )}
    </>
  );
} 