import React, { useState, useEffect } from 'react';
import { View, Image, Text, ScrollView, Dimensions, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';
import { FileItem } from '@/lib/fileSystem';
import { Ionicons } from '@expo/vector-icons';
import SyntaxHighlighter from 'react-native-syntax-highlighter';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@/lib/theme-provider';

interface FilePreviewProps {
  file: FileItem;
}

interface PreviewError {
  type: 'load' | 'format' | 'permission';
  message: string;
}

export default function FilePreview({ file }: FilePreviewProps) {
  const { isDarkMode } = useTheme();
  const [textContent, setTextContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PreviewError | null>(null);
  const [videoStatus, setVideoStatus] = useState<AVPlaybackStatus | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    loadContent();
  }, [file]);

  const loadContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (isTextFile(extension) || isCodeFile(extension)) {
        try {
          const content = await FileSystem.readAsStringAsync(file.uri);
          setTextContent(content);
        } catch (error) {
          setError({
            type: 'load',
            message: 'Failed to load text content'
          });
        }
      } else if (isMediaFile(extension)) {
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        if (!fileInfo.exists) {
          setError({
            type: 'load',
            message: 'File not found'
          });
        }
      } else if (isOfficeFile(extension)) {
        // For Office files, we'll use a WebView with Office Online Viewer
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        if (!fileInfo.exists) {
          setError({
            type: 'load',
            message: 'File not found'
          });
        }
      }
    } catch (error) {
      setError({
        type: 'load',
        message: 'Error loading file'
      });
    } finally {
      setLoading(false);
    }
  };

  const isTextFile = (extension?: string): boolean => {
    return ['txt', 'md', 'json', 'xml', 'html', 'css', 'ini', 'conf'].includes(extension || '');
  };

  const isCodeFile = (extension?: string): boolean => {
    return ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'swift', 'go'].includes(extension || '');
  };

  const isMediaFile = (extension?: string): boolean => {
    return ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi', 'mp3', 'wav', 'm4a'].includes(extension || '');
  };

  const isOfficeFile = (extension?: string): boolean => {
    return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension || '');
  };

  const getLanguageFromExtension = (extension?: string): string => {
    const languageMap: { [key: string]: string } = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      swift: 'swift',
      go: 'go',
    };
    return languageMap[extension || ''] || 'text';
  };

  const handleVideoError = (error: string) => {
    setError({
      type: 'format',
      message: `Failed to play video: ${error}`
    });
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      );
    }

    const extension = file.name.split('.').pop()?.toLowerCase();

    switch (true) {
      case ['jpg', 'jpeg', 'png', 'gif'].includes(extension || ''):
        return (
          <View style={styles.mediaContainer}>
            <Image
              source={{ uri: file.uri }}
              style={styles.image}
              resizeMode="contain"
              onError={() => setError({
                type: 'format',
                message: 'Failed to load image'
              })}
            />
          </View>
        );

      case ['mp4', 'mov', 'avi'].includes(extension || ''):
        return (
          <View style={styles.mediaContainer}>
            <Video
              source={{ uri: file.uri }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
              onPlaybackStatusUpdate={setVideoStatus}
              onError={handleVideoError}
            />
            {videoStatus?.isLoaded && videoStatus.isBuffering && (
              <ActivityIndicator 
                size="large" 
                color="#007AFF" 
                style={styles.bufferingIndicator} 
              />
            )}
          </View>
        );

      case ['mp3', 'wav', 'm4a'].includes(extension || ''):
        return (
          <View style={styles.audioContainer}>
            <Ionicons name="musical-notes" size={48} color="#007AFF" />
            <Video
              source={{ uri: file.uri }}
              useNativeControls
              style={styles.audio}
              onError={handleVideoError}
            />
          </View>
        );

      case extension === 'pdf':
        return (
          <View style={styles.pdfContainer}>
            <WebView
              source={{ uri: file.uri }}
              style={styles.webview}
              onError={() => setError({
                type: 'format',
                message: 'Failed to load PDF'
              })}
            />
            <View style={styles.pdfControls}>
              <TouchableOpacity 
                style={styles.pageButton}
                onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <Ionicons name="chevron-back" size={24} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.pageText}>Page {currentPage}</Text>
              <TouchableOpacity 
                style={styles.pageButton}
                onPress={() => setCurrentPage(p => p + 1)}
              >
                <Ionicons name="chevron-forward" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
        );

      case isOfficeFile(extension):
        return (
          <WebView
            source={{
              uri: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.uri)}`,
            }}
            style={styles.webview}
            onError={() => setError({
              type: 'format',
              message: 'Failed to load document'
            })}
          />
        );

      case isCodeFile(extension):
        return (
          <ScrollView style={styles.codeContainer}>
            <SyntaxHighlighter
              language={getLanguageFromExtension(extension)}
              style={{
                fontSize: 14,
                backgroundColor: 'transparent',
                padding: 16,
              }}
            >
              {textContent}
            </SyntaxHighlighter>
          </ScrollView>
        );

      case isTextFile(extension):
        return (
          <ScrollView style={styles.textContainer}>
            <Text style={styles.textContent}>
              {textContent}
            </Text>
          </ScrollView>
        );

      default:
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="document" size={48} color="#999999" />
            <Text style={styles.unsupportedText}>
              Preview not available for this file type
            </Text>
          </View>
        );
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    mediaContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#000000',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    video: {
      width: '100%',
      height: '100%',
    },
    bufferingIndicator: {
      position: 'absolute',
    },
    audioContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    audio: {
      width: '100%',
      height: 100,
    },
    webview: {
      flex: 1,
    },
    textContainer: {
      flex: 1,
      padding: 15,
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    },
    textContent: {
      fontSize: 16,
      lineHeight: 24,
      color: isDarkMode ? '#f1f5f9' : '#0f172a',
    },
    codeContainer: {
      flex: 1,
      backgroundColor: isDarkMode ? '#0f172a' : '#f8f8f8',
    },
    codeBlock: {
      margin: 0,
      padding: 15,
      fontSize: 14,
      backgroundColor: 'transparent',
    },
    pdfContainer: {
      flex: 1,
    },
    pdfControls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 10,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#334155' : '#e1e1e1',
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    },
    pageButton: {
      padding: 10,
    },
    pageText: {
      marginHorizontal: 15,
      fontSize: 16,
      color: isDarkMode ? '#f1f5f9' : '#0f172a',
    },
    errorText: {
      marginTop: 10,
      color: isDarkMode ? '#fca5a5' : '#FF3B30',
      textAlign: 'center',
    },
    unsupportedText: {
      marginTop: 10,
      color: isDarkMode ? '#94a3b8' : '#999999',
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      {renderPreview()}
    </View>
  );
} 