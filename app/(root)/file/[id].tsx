import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, TouchableOpacity, Alert, Platform, Dimensions, ScrollView, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-provider';
import { useFileStore } from '@/lib/file-store';
import type { FileItem } from '@/types';
import { Audio } from 'expo-av';
import { useVideoPlayer, VideoView, VideoSource, VideoPlayerStatus } from 'expo-video';
import { useEvent } from 'expo';
import { Image } from 'expo-image';
import type { ImageErrorEventData } from 'expo-image';
import { useRef, useState, useEffect, useMemo, useCallback, memo } from 'react';
import * as IntentLauncher from 'expo-intent-launcher';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system';
import { saveFile, getSaveDirectory, setSaveDirectory, getFileStats } from '@/lib/fileSystem';
import { isAvailableAsync, shareFile } from '@/lib/sharing-utils';
import { formatFileSize, formatDate, getFileName, formatDisplayName, formatDisplayPath } from '@/lib/utils';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Portal, Modal } from 'react-native-paper';
import { Loading } from '@/components/ui';
import { ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { StyleSheet } from 'react-native';
import { showToast } from '@/lib/notifications';
import * as MediaLibrary from 'expo-media-library';
import { useDialog } from '@/components/ui/DialogProvider';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const PREVIEW_HEIGHT = SCREEN_HEIGHT * 0.6;

type FileType = 'image' | 'video' | 'audio' | 'document' | 'unknown' | 'pdf' | 'word' | 'excel' | 'powerpoint' | 'text';

// Define video types
interface VideoStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  error?: {
    code: string;
    message: string;
  };
}

interface AudioStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  error?: string;
}

interface VideoError {
  code: string;
  message: string;
}

export function getFileType(extension: string): FileType {
  const ext = extension.toLowerCase();
  
  // Image types
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) {
    return 'image';
  }
  
  // Video types
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return 'video';
  }
  
  // Audio types
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) {
    return 'audio';
  }
  
  // Document types
  if (['pdf'].includes(ext)) {
    return 'pdf';
  }
  if (['doc', 'docx'].includes(ext)) {
    return 'word';
  }
  if (['xls', 'xlsx'].includes(ext)) {
    return 'excel';
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return 'powerpoint';
  }
  if (['txt', 'rtf'].includes(ext)) {
    return 'text';
  }
  
  // Default to unknown type
  return 'unknown';
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  errorText: {
    color: '#ff0000',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  mediaContent: {
    width: SCREEN_WIDTH,
    height: PREVIEW_HEIGHT,
  },
});

// Add these constants at the top level for better caching configuration
const IMAGE_CACHE_CONFIG = {
  cachePolicy: 'memory-disk' as const,
  priority: 'high' as const,
  prefetchChunkSize: 2048,
};

const VIDEO_CACHE_CONFIG = {
  shouldPlay: false,
  isMuted: false,
  useNativeControls: true,
};

// Add a memoized file cache manager
const useFileCache = () => {
  const [cache] = useState(() => new Map<string, { uri: string; timestamp: number }>());
  
  const getCachedFile = useCallback(async (uri: string) => {
    const cached = cache.get(uri);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
      return cached.uri;
    }
    
    try {
      const cacheDir = `${FileSystem.cacheDirectory}file_viewer/`;
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      
      const fileName = uri.split('/').pop() || '';
      const cachedPath = `${cacheDir}${fileName}`;
      
      await FileSystem.copyAsync({
        from: uri,
        to: cachedPath
      });
      
      cache.set(uri, { uri: cachedPath, timestamp: Date.now() });
      return cachedPath;
    } catch (error) {
      
      return uri;
    }
  }, []);
  
  return { getCachedFile };
};

// Add a preloader component
const FilePreloader = memo(({ files, currentIndex }: { files: FileItem[]; currentIndex: number }) => {
  const { getCachedFile } = useFileCache();
  
  useEffect(() => {
    const preloadFiles = async () => {
      const preloadIndexes = [
        currentIndex + 1, // Next file
        currentIndex - 1, // Previous file
      ].filter(i => i >= 0 && i < files.length);
      
      for (const index of preloadIndexes) {
        const file = files[index];
        if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
          getCachedFile(file.uri).catch(console.warn);
        }
      }
    };
    
    preloadFiles();
  }, [currentIndex, files, getCachedFile]);
  
  return null;
});

// Create video player component
const VideoPlayerComponent = memo(({ uri, fileName }: { uri: string; fileName: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerStatus, setPlayerStatus] = useState<VideoPlayerStatus>('idle');

  const source: VideoSource = useMemo(() => ({
    uri,
    metadata: {
      title: fileName
    }
  }), [uri, fileName]);

  const player = useVideoPlayer(source);

  useEffect(() => {
    if (!player) return;

    const statusSubscription = player.addListener('statusChange', ({ status, error }) => {
      setPlayerStatus(status);
      if (status === 'readyToPlay') {
        setIsLoading(false);
      } else if (status === 'loading') {
        setIsLoading(true);
      } else if (status === 'error' && error) {
        setError(error.message);
        setIsLoading(false);
      }
    });

    const playingSubscription = player.addListener('playingChange', ({ isPlaying }) => {
      setIsPlaying(isPlaying);
    });

    return () => {
      statusSubscription.remove();
      playingSubscription.remove();
      player.release();
    };
  }, [player]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading video...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ width: SCREEN_WIDTH, height: PREVIEW_HEIGHT }}>
      <VideoView
        style={{ flex: 1 }}
        player={player}
        allowsFullscreen
        contentFit="contain"
        nativeControls={false}
      />
      <View className="absolute bottom-4 left-0 right-0 flex-row justify-center">
        <TouchableOpacity
          onPress={() => {
            if (isPlaying) {
              player.pause();
            } else {
              player.play();
            }
          }}
          className="w-12 h-12 rounded-full bg-black/50 items-center justify-center"
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function FileViewerScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [videoPlayer, setVideoPlayer] = useState<any>(null);
  const audioRef = useRef<Audio.Sound | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showFileInfo, setShowFileInfo] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<AudioStatus | null>(null);
  const [playerStatus, setPlayerStatus] = useState<VideoPlayerStatus>('idle');
  const [playerError, setPlayerError] = useState<string | null>(null);

  const currentFile = useFileStore((state: { currentFile: FileItem | null }) => state.currentFile);
  const allFiles = useFileStore((state: { files: FileItem[] }) => state.files);
  const setCurrentFile = useFileStore((state: { setCurrentFile: (file: FileItem | null) => void }) => state.setCurrentFile);
  
  // Cache the current file ID to prevent unnecessary re-renders
  const currentFileIdRef = useRef<string | null>(null);
  
  const fileUri = useMemo(() => {
    if (!id) return '';
    try {
      return atob(id as string);
    } catch (e) {
      
      return '';
    }
  }, [id]);

  const normalizeUri = (uri: string) => {
    try {
      let decoded = decodeURIComponent(uri);
      const fileName = decoded.split('/').pop() || '';
      return fileName.toLowerCase();
    } catch (error) {
      
      return uri.toLowerCase();
    }
  };

  const file = useMemo(() => {
    if (!fileUri) return null;

    const normalizedInput = normalizeUri(fileUri);
    let foundFile = allFiles.find(f => {
      const normalizedFile = normalizeUri(f.uri);
      return normalizedFile === normalizedInput;
    });

    if (foundFile) return foundFile;

    if (fileUri.startsWith('content://')) {
      const fileName = normalizeUri(fileUri);
      const virtualFile = {
        uri: fileUri,
        name: fileName,
        path: `Android/media/com.whatsapp/WhatsApp/Media/.Statuses/${fileName}`,
        size: 0,
        modifiedTime: Date.now(),
        type: fileName.toLowerCase().endsWith('.jpg') ? 'image/jpeg' : 
              fileName.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 
              fileName.toLowerCase().endsWith('.opus') ? 'audio/opus' :
              fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' :
              fileName.toLowerCase().endsWith('.doc') || fileName.toLowerCase().endsWith('.docx') ? 'application/msword' :
              fileName.toLowerCase().endsWith('.txt') ? 'text/plain' :
              'application/octet-stream',
        categoryId: 'media'
      } as FileItem;

      return virtualFile;
    }

    return null;
  }, [fileUri, allFiles]);

  // Sort files by modification time to ensure consistent order
  const sortedFiles = useMemo(() => {
    // Create a stable sort that matches the file list's order
    return [...allFiles].sort((a, b) => {
      // Primary sort by modification time
      const timeComparison = b.modifiedTime - a.modifiedTime;
      if (timeComparison !== 0) return timeComparison;
      
      // Secondary sort by name for stability when times are equal
      const nameComparison = a.name.localeCompare(b.name);
      if (nameComparison !== 0) return nameComparison;
      
      // Final sort by path for absolute stability
      return a.path.localeCompare(b.path);
    });
  }, [allFiles]);

  // Track current index in the sorted list
  const currentIndex = useMemo(() => {
    if (!file || !sortedFiles.length) return -1;
    // Use exact URI matching to find the current file
    return sortedFiles.findIndex(f => normalizeUri(f.uri) === normalizeUri(file.uri));
  }, [file, sortedFiles]);

  // Remove navigation state and buttons
  const { getCachedFile } = useFileCache();
  const [cachedUri, setCachedUri] = useState<string | null>(null);
  
  // Optimize file loading
  useEffect(() => {
    if (!file) return;
    
    const loadFile = async () => {
      setIsMediaLoading(true);
      setMediaError(null);
      
      try {
        const uri = await getCachedFile(file.uri);
        setCachedUri(uri);
        setMediaUri(uri);
      } catch (error) {
        
        setMediaError('Failed to load file');
      } finally {
        setIsMediaLoading(false);
      }
    };
    
    loadFile();
  }, [file, getCachedFile]);

  // Update the useEffect that handles file changes
  useEffect(() => {
    if (!file) return;
    
    // Find the current file's index in sorted files
    const index = sortedFiles.findIndex(f => normalizeUri(f.uri) === normalizeUri(file.uri));
    
    if (index !== -1) {
      setCurrentFile(file);
      setMediaUri(file.uri);
    }
  }, [file, sortedFiles, setCurrentFile]);

  const [currentFileId, setCurrentFileId] = useState<string | null>(null);

  // Cache URIs for better performance
  const mediaUriCache = useRef<Map<string, string>>(new Map());
  const prevFileRef = useRef<FileItem | null>(null);
  const nextFileCache = useRef<{ uri: string | null; index: number }>({ uri: null, index: -1 });

  const getMediaUri = async (uri: string): Promise<string> => {
    // If we already have a cached URI, use it
    const cachedUri = mediaUriCache.current.get(uri);
    if (cachedUri) {
      return cachedUri;
    }

    try {
      // For content URIs, ensure we have proper access
      if (uri.startsWith('content://')) {
        try {
          // Verify file exists and is accessible
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists) {
            mediaUriCache.current.set(uri, uri);
            return uri;
          }
          throw new Error('File not accessible');
        } catch (error) {
          
          throw error;
        }
      }
      return uri;
    } catch (error) {
      
      throw error;
    }
  };

  const handleVideoStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setIsVideoPlaying(status.isPlaying);
      setIsMediaLoading(false);
    } else {
      if ('error' in status) {
        setMediaError(`Video error: ${status.error}`);
      }
      setIsMediaLoading(false);
    }
  };

  const handleAudioStatusUpdate = async (status: any) => {
    if (status.isLoaded) {
      const positionMillis = typeof status.positionMillis === 'number' ? status.positionMillis : 0;
      const durationMillis = typeof status.durationMillis === 'number' ? status.durationMillis : 0;
      
      setAudioStatus({
        isLoaded: status.isLoaded,
        isPlaying: status.isPlaying,
        positionMillis,
        durationMillis,
        error: undefined
      });
      setIsMediaLoading(false);
      setIsVideoPlaying(status.isPlaying);
    } else {
      if ('error' in status) {
        setMediaError(`Audio error: ${status.error}`);
      }
      setIsMediaLoading(false);
    }
  };

  const handleMediaError = (error: any, type: string) => {
    
    setMediaError(`Failed to load ${type.toLowerCase()}`);
    
    // If using a cached file that failed, try the original URI
    if (mediaUri && mediaUri.startsWith('file://') && file?.uri) {
      
      setMediaUri(file.uri);
    }
  };

  // Update the renderVideoContent function
  const renderVideoContent = () => {
    if (!file) return null;
    return <VideoPlayerComponent uri={file.uri} fileName={file.name} />;
  };

  const renderContent = () => {
    if (!file) {
      return (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">No file selected</Text>
        </View>
      );
    }

    const fileType = getFileType(file.name.split('.').pop() || '');
    const isMediaFile = ['image', 'video', 'audio'].includes(fileType);

    // Reset loading state for non-media files
    if (!isMediaFile && isMediaLoading) {
      setIsMediaLoading(false);
    }

    if (!isMediaFile) {
      return (
        <View className="relative flex-1">
          <View className="bg-neutral-950 justify-center overflow-hidden" style={{ height: PREVIEW_HEIGHT }}>
            <View className="flex-1 items-center justify-center bg-neutral-900" style={{ height: PREVIEW_HEIGHT }}>
              <View className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900 items-center justify-center mb-4">
                <Ionicons 
                  name={
                    fileType === 'pdf' ? 'document-text' :
                    fileType === 'word' ? 'document' :
                    fileType === 'excel' ? 'grid' :
                    fileType === 'powerpoint' ? 'easel' :
                    fileType === 'text' ? 'create' :
                    'document-outline'
                  } 
                  size={48} 
                  color={isDarkMode ? '#ffffff' : '#000000'} 
                />
              </View>
              <Text className="text-lg text-neutral-400 dark:text-neutral-500 mb-4">
                {file.name}
              </Text>
              <TouchableOpacity
                className="bg-primary-500 rounded-lg px-6 py-3"
                onPress={handleOpenWith}
              >
                <Text className="text-white font-medium">Open with default app</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    // Handle different media types
    switch (fileType) {
      case 'image':
        return (
          <View className="relative flex-1">
            <View className="bg-neutral-950 justify-center overflow-hidden" style={{ height: PREVIEW_HEIGHT }}>
              <View className="relative flex-1">
                <Image
                  source={{ uri: mediaUri }}
                  style={{ width: SCREEN_WIDTH, height: PREVIEW_HEIGHT }}
                  contentFit="contain"
                  transition={200}
                  className="bg-neutral-100 dark:bg-neutral-900"
                  onError={(error: ImageErrorEventData) => {
                    
                    handleMediaError(error, 'Image');
                  }}
                  onLoad={() => setIsMediaLoading(false)}
                />
              </View>
            </View>
          </View>
        );

      case 'video':
        return renderVideoContent();

      case 'audio':
        return (
          <View style={{ width: SCREEN_WIDTH * 0.8, height: 80, marginHorizontal: 'auto' }} className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-neutral-900 dark:text-white font-medium" numberOfLines={1}>
                {file.name}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    if (!audioRef.current) {
                      const { sound } = await Audio.Sound.createAsync(
                        { uri: file.uri },
                        { shouldPlay: true },
                        handleAudioStatusUpdate as any
                      );
                      audioRef.current = sound;
                    } else {
                      if (audioStatus?.isLoaded && audioStatus.isPlaying) {
                        await audioRef.current.pauseAsync();
                      } else {
                        await audioRef.current.playAsync();
                      }
                    }
                  } catch (error) {
                    
                    setMediaError('Failed to play audio');
                  }
                }}
                className="w-10 h-10 rounded-full bg-primary-500 items-center justify-center"
              >
                <Ionicons
                  name={audioStatus?.isLoaded && audioStatus.isPlaying ? 'pause' : 'play'}
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
            </View>
            {audioStatus?.isLoaded && (
              <View className="h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full mt-3">
                <View
                  className="h-full bg-primary-500 rounded-full"
                  style={{
                    width: `${(audioStatus.positionMillis / audioStatus.durationMillis) * 100}%`,
                  }}
                />
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  const handleAdvertisementClick = () => {
    setShowAdModal(true);
  };

  const handleEmailRedirect = async () => {
    const email = 'jeremywachiradev@gmail.com';
    const subject = 'Advertisement Inquiry';
    const body = 'I am interested in advertising on your platform.';
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      if (Platform.OS === 'android') {
        await IntentLauncher.startActivityAsync('android.intent.action.SENDTO', {
          data: mailtoUrl
        });
      } else {
        await WebBrowser.openBrowserAsync(mailtoUrl);
      }
    } catch (error) {
      showToast('error', 'Could not open email client');
    } finally {
      setShowAdModal(false);
    }
  };

  useEffect(() => {
    const loadFile = async () => {
      if (!id) return;
      
      try {
        setIsMediaLoading(true);
        setMediaError(null);
        
        // Decode the file URI
        const decodedUri = atob(id as string);
        
        // Find the file in the file list first
        const existingFile = allFiles.find(f => f.uri === decodedUri);
        if (existingFile) {
          setCurrentFile(existingFile);
          setMediaUri(decodedUri);
          setIsMediaLoading(false);
          return;
        }
        
        // If not found in the list, get file stats using the same function as file list
        const fileStats = await getFileStats(decodedUri);
        if (!fileStats) {
          throw new Error('File not found or inaccessible');
        }

        // Get file metadata
        const name = decodeURIComponent(decodedUri.split('/').pop() || '');
        const extension = name.split('.').pop()?.toLowerCase() || '';
        
        // Get MIME type based on extension
        const getMimeType = (ext: string): string => {
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image/jpeg';
          if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'video/mp4';
          if (['mp3', 'wav', 'm4a'].includes(ext)) return 'audio/mpeg';
          if (['pdf'].includes(ext)) return 'application/pdf';
          if (['doc', 'docx'].includes(ext)) return 'application/msword';
          if (['txt'].includes(ext)) return 'text/plain';
          return 'application/octet-stream';
        };

        const newFile: FileItem = {
          path: decodedUri,
          uri: decodedUri,
          name,
          type: getMimeType(extension),
          size: fileStats.size,
          modifiedTime: fileStats.modificationTime,
          categoryId: ''
        };

        setCurrentFile(newFile);
        setMediaUri(decodedUri);
      } catch (error) {
        
        setMediaError(error instanceof Error ? error.message : 'Failed to load file');
      } finally {
        setIsMediaLoading(false);
      }
    };

    loadFile();
  }, [id, allFiles]);

  const handleShare = async () => {
    if (!file) return;
    
    try {
      if (!(await isAvailableAsync())) {
        showToast('error', 'Sharing is not available on this device');
        return;
      }
      
      await shareFile(file.uri, {
        mimeType: file.type,
        dialogTitle: `Share ${file.name}`
      });
    } catch (error) {
      
      showToast('error', 'Failed to share file. Please try again.');
    }
  };

  const handleOpenWith = async () => {
    if (!file) return;
    try {
      if (Platform.OS === 'android') {
        const getMimeType = (type: string, fileName: string) => {
          switch (getFileType(file.name.split('.').pop() || '')) {
            case 'image': return 'image/*';
            case 'video': return 'video/*';
            case 'audio': return 'audio/*';
            case 'document':
              const ext = fileName.split('.').pop()?.toLowerCase();
              switch (ext) {
                case 'pdf': return 'application/pdf';
                case 'doc':
                case 'docx': return 'application/msword';
                case 'txt': return 'text/plain';
                default: return '*/*';
              }
            default: return '*/*';
          }
        };

        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: file.uri,
          flags: 1,
          type: getMimeType(file.type, file.name)
        });
      } else {
        await WebBrowser.openBrowserAsync(file.uri);
      }
    } catch (error) {
      showToast('error', 'Failed to open file');
    }
  };

  const dialog = useDialog();

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      let saveDir = await getSaveDirectory();
      
      if (!saveDir) {
        // First time saving, prompt for directory
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          dialog.showDialog({
            title: 'Permission Required',
            message: 'Storage access permission is required to save files',
            buttons: [{ text: 'OK', onPress: () => {} }]
          });
          setIsSaving(false);
          return;
        }
        
        saveDir = permissions.directoryUri;
        await setSaveDirectory(saveDir);
        showToast('success', 'Save directory set successfully');
      }
      
      await saveFile(fileUri, file?.name || 'file');
      showToast('success', 'File saved successfully');
    } catch (error) {
      
      showToast('error', 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-neutral-900' : 'bg-white'}`}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'none'
        }} 
      />
      
      {/* Custom Header */}
      <View className={`${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'} border-b`}>
        <View className="flex-row items-center px-4 py-3 mt-12">
          <TouchableOpacity 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/(tabs)');
              }
            }}
            className="mr-4 p-2"
          >
            <Ionicons name="chevron-back" size={28} color={isDarkMode ? '#ffffff' : '#000000'} />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className={`text-lg font-rubik-medium ${isDarkMode ? 'text-white' : 'text-neutral-900'}`} numberOfLines={1}>
              {file ? formatDisplayName(file.name) : ''}
            </Text>
            <Text className="text-xs text-neutral-400 font-rubik" numberOfLines={1}>
              {file ? formatDisplayPath(file.path) : ''}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowFileInfo(true)}
            className="ml-4 p-2"
          >
            <Ionicons name="information-circle-outline" size={24} color={isDarkMode ? '#ffffff' : '#000000'} />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 relative">
        <ScrollView className="flex-1" bounces={false}>
          {renderContent()}
        </ScrollView>

        {/* Advertisement Space */}
        <View className="absolute left-0 right-0 bottom-0" style={{ top: PREVIEW_HEIGHT }}>
          <TouchableOpacity 
            className={`w-full h-full ${isDarkMode ? 'bg-neutral-800/90' : 'bg-neutral-100/90'} items-center justify-center`}
            onPress={handleAdvertisementClick}
          >
            <Text className={`text-lg font-rubik-medium text-center ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              Contact us to advertise{'\n'}your business here
            </Text>
          </TouchableOpacity>
            </View>
      </View>

      {/* Bottom Action Bar */}
      <BlurView 
        intensity={isDarkMode ? 30 : 50} 
        tint={isDarkMode ? "dark" : "light"} 
        className={`border-t ${isDarkMode ? 'border-white/10' : 'border-neutral-200'}`} 
        style={{ paddingBottom: insets.bottom }}
      >
        <View className="flex-row justify-around items-center py-4 px-4">
          <TouchableOpacity
            onPress={handleShare}
            className={`items-center px-6 py-3 rounded-xl ${isDarkMode ? 'bg-neutral-800/80' : 'bg-neutral-100/80'}`}
          >
            <Ionicons name="share-outline" size={24} color={isDarkMode ? '#ffffff' : '#000000'} />
            <Text className={`text-xs font-rubik-medium mt-1 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>Share</Text>
          </TouchableOpacity>
          
                <TouchableOpacity
            onPress={handleSave}
            className="items-center justify-center w-16 h-16 bg-primary-600 rounded-full shadow-lg"
            style={{
              elevation: 4,
              shadowColor: '#0077ff',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}
          >
            <Ionicons name="download-outline" size={28} color="#ffffff" />
            <Text className="text-white text-[10px] font-rubik-medium mt-0.5">Save</Text>
                </TouchableOpacity>
          
                <TouchableOpacity
            onPress={handleOpenWith}
            className={`items-center px-6 py-3 rounded-xl ${isDarkMode ? 'bg-neutral-800/80' : 'bg-neutral-100/80'}`}
          >
            <Ionicons name="open-outline" size={24} color={isDarkMode ? '#ffffff' : '#000000'} />
            <Text className={`text-xs font-rubik-medium mt-1 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>Open</Text>
                </TouchableOpacity>
              </View>
      </BlurView>

      {/* File Info Portal */}
      <Portal>
        <Modal
          visible={showFileInfo}
          onDismiss={() => setShowFileInfo(false)}
          contentContainerStyle={{
            backgroundColor: isDarkMode ? '#171717' : 'white',
            margin: 20,
            padding: 20,
            borderRadius: 16,
          }}
        >
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-rubik-medium text-neutral-900 dark:text-white">
                File Information
              </Text>
              <TouchableOpacity onPress={() => setShowFileInfo(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? '#ffffff' : '#000000'} />
              </TouchableOpacity>
                </View>

            <View className="space-y-4">
              <View>
                <Text className="text-sm font-rubik text-neutral-500 dark:text-neutral-400 mb-1">
                  File Name
                </Text>
                <Text className="text-base font-rubik text-neutral-900 dark:text-white">
                  {file ? formatDisplayName(file.name) : ''}
                </Text>
            </View>

              <View>
                <Text className="text-sm font-rubik text-neutral-500 dark:text-neutral-400 mb-1">
                  Location
                </Text>
                <Text className="text-base font-rubik text-neutral-900 dark:text-white">
                  {file ? formatDisplayPath(file.path) : ''}
                </Text>
              </View>

              <View>
                <Text className="text-sm font-rubik text-neutral-500 dark:text-neutral-400 mb-1">
                  Type
                </Text>
                <Text className="text-base font-rubik text-neutral-900 dark:text-white">
                  {file ? getFileType(file.name.split('.').pop() || '') : ''}
                </Text>
              </View>

              <View>
                <Text className="text-sm font-rubik text-neutral-500 dark:text-neutral-400 mb-1">
                  Size
                </Text>
                <Text className="text-base font-rubik text-neutral-900 dark:text-white">
                  {file ? formatFileSize(file.size) : ''}
                </Text>
              </View>

              <View>
                <Text className="text-sm font-rubik text-neutral-500 dark:text-neutral-400 mb-1">
                  Modified
                </Text>
                <Text className="text-base font-rubik text-neutral-900 dark:text-white">
                  {file ? formatDate(file.modifiedTime) : ''}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Advertisement Contact Portal */}
      <Portal>
        <Modal
          visible={showAdModal}
          onDismiss={() => setShowAdModal(false)}
          contentContainerStyle={{
            backgroundColor: isDarkMode ? '#171717' : 'white',
            margin: 20,
            padding: 20,
            borderRadius: 16,
          }}
        >
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-rubik-medium text-neutral-900 dark:text-white">
                Contact for Advertisement
              </Text>
              <TouchableOpacity onPress={() => setShowAdModal(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? '#ffffff' : '#000000'} />
              </TouchableOpacity>
            </View>

            <Text className="text-base text-neutral-600 dark:text-neutral-400 mb-6">
              Would you like to send an email to inquire about advertising opportunities?
            </Text>

            <View className="flex-row justify-end space-x-4">
          <TouchableOpacity 
                onPress={() => setShowAdModal(false)}
                className="px-4 py-2"
              >
                <Text className="text-neutral-500">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleEmailRedirect}
                className="bg-primary-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">Send Email</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Portal>

      <FilePreloader files={sortedFiles} currentIndex={currentIndex} />
    </View>
  );
}