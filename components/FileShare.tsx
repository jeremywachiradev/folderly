import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { FileItem } from '@/lib/fileSystem';

interface FileShareProps {
  file: FileItem;
  visible: boolean;
  onClose: () => void;
}

export default function FileShare({ file, visible, onClose }: FileShareProps) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const generateShareUrl = async () => {
    try {
      setLoading(true);
      
      // Create a temporary sharing URL
      const shareableUrl = await FileSystem.getContentUriAsync(file.path);
      setShareUrl(shareableUrl);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to generate sharing URL');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.path, {
          UTI: file.type,
          mimeType: getMimeType(file.name),
          dialogTitle: `Share ${file.name}`
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share file');
    }
  };

  const getMimeType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      mp3: 'audio/mpeg',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain'
    };
    
    return mimeTypes[extension || ''] || 'application/octet-stream';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Share File</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#999999" />
            </TouchableOpacity>
          </View>

          <View style={styles.fileInfo}>
            <Ionicons 
              name={getFileIcon(file.type)} 
              size={48} 
              color="#007AFF" 
            />
            <Text style={styles.fileName}>{file.name}</Text>
            <Text style={styles.fileSize}>
              {formatFileSize(file.size)}
            </Text>
          </View>

          <View style={styles.qrContainer}>
            {shareUrl ? (
              <QRCode
                value={shareUrl}
                size={200}
                color="#000"
                backgroundColor="#fff"
              />
            ) : (
              <TouchableOpacity
                style={styles.generateButton}
                onPress={generateShareUrl}
                disabled={loading}
              >
                <Text style={styles.generateButtonText}>
                  Generate QR Code
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            disabled={!shareUrl}
          >
            <Ionicons name="share-outline" size={24} color="#fff" />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const getFileIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'image':
      return 'image-outline';
    case 'video':
      return 'videocam-outline';
    case 'audio':
      return 'musical-notes-outline';
    case 'document':
      return 'document-text-outline';
    default:
      return 'document-outline';
  }
};

const formatFileSize = (bytes: number | undefined): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 20,
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  fileInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 5,
  },
  fileSize: {
    fontSize: 14,
    color: '#666',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 250,
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  shareButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
}); 