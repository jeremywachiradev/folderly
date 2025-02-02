import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  Dimensions,
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';
import { useTheme } from '@/lib/theme-provider';
import { FileItem } from '@/types';
import { saveFile } from '@/lib/fileSystem';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { StorageAccessFramework } from 'expo-file-system';

interface FileViewerMethods {
  present: () => void;
  dismiss: () => void;
}

interface FileViewerProps {
  file: FileItem | null;
  files: FileItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDelete: (file: FileItem) => void;
  onRename: (file: FileItem, newName: string) => void;
  onSave: (file: FileItem) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const FileViewer = forwardRef<FileViewerMethods, FileViewerProps>(({
  file,
  files,
  currentIndex,
  onClose,
  onNavigate,
  onDelete,
  onRename,
  onSave
}, ref) => {
  const { isDarkMode } = useTheme();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [newName, setNewName] = React.useState('');

  useImperativeHandle(ref, () => ({
    present: () => bottomSheetRef.current?.present(),
    dismiss: () => bottomSheetRef.current?.dismiss()
  }));

  const handleShare = async () => {
    if (!file) return;
    try {
      await Share.share({
        url: file.uri,
        title: file.name
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share file');
    }
  };

  const handleOpenWith = async () => {
    if (!file) return;
    try {
      if (Platform.OS === 'android') {
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: file.uri,
          flags: 1
        });
      } else {
        await Linking.openURL(file.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const handleRename = () => {
    if (!file) return;
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }
    onRename(file, newName);
    setIsRenaming(false);
    setNewName('');
  };

  const handleDelete = () => {
    if (!file) return;
    Alert.alert(
      'Delete File',
      'Are you sure you want to delete this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(file);
            onClose();
          }
        }
      ]
    );
  };

  const renderMediaContent = () => {
    if (!file) return null;

    switch (file.type) {
      case 'image':
        return (
          <Image
            source={{ uri: file.uri }}
            style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
            contentFit="contain"
          />
        );
      case 'video':
        return (
          <View>
            <Video
              ref={videoRef}
              source={{ uri: file.uri }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              onPlaybackStatusUpdate={status => {
                if (status.isLoaded) {
                  setIsPlaying(status.isPlaying);
                }
              }}
            />
          </View>
        );
      case 'audio':
        return (
          <View className="p-4 items-center">
            <TouchableOpacity
              onPress={() => {
                if (videoRef.current) {
                  if (isPlaying) {
                    videoRef.current.pauseAsync();
                  } else {
                    videoRef.current.playAsync();
                  }
                }
              }}
              className="w-16 h-16 rounded-full bg-primary-600 items-center justify-center"
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color="#ffffff"
              />
            </TouchableOpacity>
            <Text className="mt-2 text-neutral-600 dark:text-neutral-400">
              {file.name}
            </Text>
          </View>
        );
      case 'document':
        return (
          <WebView
            source={{ uri: file.uri }}
            style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
          />
        );
      default:
        return (
          <View className="p-4 items-center">
            <Ionicons
              name="document-outline"
              size={64}
              color={isDarkMode ? '#ffffff' : '#000000'}
            />
            <Text className="mt-2 text-neutral-600 dark:text-neutral-400">
              {file.name}
            </Text>
          </View>
        );
    }
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['90%']}
      enablePanDownToClose
      enableDismissOnClose
      onDismiss={onClose}
      backgroundStyle={{
        backgroundColor: isDarkMode ? '#171717' : '#ffffff'
      }}
    >
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 py-2 flex-row justify-between items-center border-b border-neutral-200 dark:border-neutral-800">
          <View className="flex-1">
            {isRenaming ? (
              <View className="flex-row items-center">
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Enter new name"
                  placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                  className={`flex-1 p-2 rounded-lg ${
                    isDarkMode ? 'bg-neutral-800 text-white' : 'bg-white text-neutral-900'
                  }`}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={handleRename}
                  className="ml-2"
                >
                  <Text className="text-primary-600">Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setIsRenaming(false);
                    setNewName('');
                  }}
                  className="ml-2"
                >
                  <Text className="text-neutral-600 dark:text-neutral-400">Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text
                className="text-lg font-medium text-neutral-900 dark:text-white"
                numberOfLines={1}
              >
                {file?.name}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="ml-4"
          >
            <Ionicons
              name="close"
              size={24}
              color={isDarkMode ? '#ffffff' : '#000000'}
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <BottomSheetScrollView>
          <View className="flex-1">
            {/* Navigation Buttons */}
            <View className="flex-row justify-between items-center px-4 py-2">
              <TouchableOpacity
                onPress={() => onNavigate(currentIndex - 1)}
                disabled={currentIndex <= 0}
                className={currentIndex <= 0 ? 'opacity-50' : ''}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={isDarkMode ? '#ffffff' : '#000000'}
                />
              </TouchableOpacity>
              <Text className="text-neutral-600 dark:text-neutral-400">
                {currentIndex + 1} of {files.length}
              </Text>
              <TouchableOpacity
                onPress={() => onNavigate(currentIndex + 1)}
                disabled={currentIndex >= files.length - 1}
                className={currentIndex >= files.length - 1 ? 'opacity-50' : ''}
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={isDarkMode ? '#ffffff' : '#000000'}
                />
              </TouchableOpacity>
            </View>

            {/* Media Content */}
            {renderMediaContent()}

            {/* Actions */}
            <View className="p-4 flex-row flex-wrap justify-around">
              <TouchableOpacity
                onPress={() => file && onSave(file)}
                className="items-center p-2"
              >
                <Ionicons
                  name="save-outline"
                  size={24}
                  color={isDarkMode ? '#ffffff' : '#000000'}
                />
                <Text className="mt-1 text-neutral-600 dark:text-neutral-400">
                  Save
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsRenaming(true)}
                className="items-center p-2"
              >
                <Ionicons
                  name="pencil-outline"
                  size={24}
                  color={isDarkMode ? '#ffffff' : '#000000'}
                />
                <Text className="mt-1 text-neutral-600 dark:text-neutral-400">
                  Rename
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShare}
                className="items-center p-2"
              >
                <Ionicons
                  name="share-outline"
                  size={24}
                  color={isDarkMode ? '#ffffff' : '#000000'}
                />
                <Text className="mt-1 text-neutral-600 dark:text-neutral-400">
                  Share
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                className="items-center p-2"
              >
                <Ionicons
                  name="trash-outline"
                  size={24}
                  color="#ef4444"
                />
                <Text className="mt-1 text-red-500">
                  Delete
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleOpenWith}
                className="items-center p-2"
              >
                <Ionicons
                  name="open-outline"
                  size={24}
                  color={isDarkMode ? '#ffffff' : '#000000'}
                />
                <Text className="mt-1 text-neutral-600 dark:text-neutral-400">
                  Open With
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheetScrollView>
      </View>
    </BottomSheetModal>
  );
}); 