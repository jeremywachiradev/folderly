import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export default function FileSystemMetadataExample() {
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkFileMetadata() {
      try {
        // This is just an example path - replace with an actual file path in your app
        const filePath = FileSystem.documentDirectory + 'example.txt';
        
        // First, let's create a test file
        await FileSystem.writeAsStringAsync(filePath, 'This is a test file');
        
        // Get file info using getInfoAsync
        const info = await FileSystem.getInfoAsync(filePath, { size: true, md5: true });
        
        setFileInfo(info);
        
        // Directory metadata example
        const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory!, { size: true });
        console.log('Directory info:', dirInfo);
        
        // List files in a directory
        const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory!);
        console.log('Files in directory:', files);
        
        // You can also get content URI on Android
        if (Platform.OS === 'android') {
          const contentUri = await FileSystem.getContentUriAsync(filePath);
          console.log('Content URI:', contentUri);
        }
      } catch (err) {
        console.error('Error getting file metadata:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    
    checkFileMetadata();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>File Metadata Example</Text>
      
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : fileInfo ? (
        <View style={styles.metadataContainer}>
          <Text style={styles.label}>File URI:</Text>
          <Text style={styles.value}>{fileInfo.uri}</Text>
          
          <Text style={styles.label}>File Exists:</Text>
          <Text style={styles.value}>{fileInfo.exists ? 'Yes' : 'No'}</Text>
          
          <Text style={styles.label}>File Size:</Text>
          <Text style={styles.value}>{fileInfo.size} bytes</Text>
          
          <Text style={styles.label}>Is Directory:</Text>
          <Text style={styles.value}>{fileInfo.isDirectory ? 'Yes' : 'No'}</Text>
          
          <Text style={styles.label}>MD5 Hash:</Text>
          <Text style={styles.value}>{fileInfo.md5 || 'Not available'}</Text>
          
          <Text style={styles.label}>Last Modified:</Text>
          <Text style={styles.value}>{fileInfo.modificationTime ? new Date(fileInfo.modificationTime * 1000).toLocaleString() : 'Not available'}</Text>
        </View>
      ) : (
        <Text style={styles.loading}>Loading file metadata...</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  metadataContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  value: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  loading: {
    fontSize: 16,
    color: '#666',
  },
  error: {
    fontSize: 16,
    color: 'red',
    padding: 16,
    backgroundColor: '#ffeeee',
    borderRadius: 8,
  },
}); 