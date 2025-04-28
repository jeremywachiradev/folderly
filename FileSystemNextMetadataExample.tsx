import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { File, Directory, Paths } from 'expo-file-system/next';
import * as FileSystem from 'expo-file-system';

// Helper function to get file metadata that's not directly accessible
async function getFileLastModified(fileUri: string): Promise<Date | null> {
  try {
    // We can use the standard FileSystem API to get modification time
    const fileInfo = await FileSystem.getInfoAsync(fileUri, { size: true });
    if (fileInfo && 'modificationTime' in fileInfo && fileInfo.modificationTime) {
      return new Date(fileInfo.modificationTime * 1000);
    }
    return null;
  } catch (e) {
    console.error('Error getting file last modified date:', e);
    return null;
  }
}

export default function FileSystemNextMetadataExample() {
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [dirContents, setDirContents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkFileMetadata() {
      try {
        // Create a test directory
        const testDir = new Directory(Paths.document, 'test-directory');
        testDir.create();

        // Create a test file
        const testFile = new File(testDir, 'example.txt');
        testFile.create();
        testFile.write('This is a test file using the new FileSystem API');

        // Get last modified date using our helper function
        const lastModified = await getFileLastModified(testFile.uri);

        // Get file metadata
        const metadata = {
          uri: testFile.uri,
          exists: testFile.exists,
          size: testFile.size,
          name: testFile.name,
          extension: testFile.extension,
          // Get the parent directory URI correctly
          directory: testDir.uri,
          lastModified: lastModified,
          // You can even get the file contents
          content: testFile.text(),
        };
        
        setFileInfo(metadata);

        // List directory contents
        const directory = new Directory(Paths.document);
        const contents = directory.list();
        
        // Map contents to a more display-friendly format with file metadata
        const contentsInfoPromises = contents.map(async (item) => {
          if (item instanceof Directory) {
            return {
              name: item.name,
              type: 'directory',
              size: null,
              uri: item.uri
            };
          } else {
            // For files, get the last modified date
            const lastModified = await getFileLastModified(item.uri);
            
            return {
              name: item.name,
              type: 'file',
              size: item.size,
              uri: item.uri,
              extension: item.extension,
              lastModified: lastModified
            };
          }
        });
        
        // Wait for all promises to resolve
        const contentsInfo = await Promise.all(contentsInfoPromises);
        setDirContents(contentsInfo);

        // Recursive directory listing example
        function listDirectoryRecursively(dir: Directory, depth = 0) {
          console.log(`${' '.repeat(depth * 2)}📁 ${dir.name}`);
          const items = dir.list();
          for (const item of items) {
            if (item instanceof Directory) {
              listDirectoryRecursively(item, depth + 1);
            } else {
              console.log(`${' '.repeat((depth + 1) * 2)}📄 ${item.name} (${item.size} bytes)`);
            }
          }
        }
        
        // Log recursive directory structure
        console.log('Directory structure:');
        listDirectoryRecursively(directory);
        
      } catch (err) {
        console.error('Error with FileSystem/next:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    
    checkFileMetadata();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>FileSystem/next Metadata Example</Text>
      
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          {fileInfo && (
            <View style={styles.metadataContainer}>
              <Text style={styles.sectionTitle}>File Metadata</Text>
              
              <Text style={styles.label}>File URI:</Text>
              <Text style={styles.value}>{fileInfo.uri}</Text>
              
              <Text style={styles.label}>File Name:</Text>
              <Text style={styles.value}>{fileInfo.name}</Text>
              
              <Text style={styles.label}>File Extension:</Text>
              <Text style={styles.value}>{fileInfo.extension || 'None'}</Text>
              
              <Text style={styles.label}>File Size:</Text>
              <Text style={styles.value}>{fileInfo.size} bytes</Text>
              
              <Text style={styles.label}>Parent Directory:</Text>
              <Text style={styles.value}>{fileInfo.directory}</Text>
              
              <Text style={styles.label}>Last Modified:</Text>
              <Text style={styles.value}>{fileInfo.lastModified ? new Date(fileInfo.lastModified).toLocaleString() : 'Not available'}</Text>
              
              <Text style={styles.label}>Content:</Text>
              <Text style={styles.content}>{fileInfo.content}</Text>
            </View>
          )}
          
          {dirContents.length > 0 && (
            <View style={styles.metadataContainer}>
              <Text style={styles.sectionTitle}>Directory Contents</Text>
              
              {dirContents.map((item, index) => (
                <View key={index} style={styles.itemContainer}>
                  <Text style={styles.itemIcon}>{item.type === 'directory' ? '📁' : '📄'}</Text>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.type === 'file' && item.size !== null && (
                      <Text style={styles.itemSize}>{item.size} bytes</Text>
                    )}
                    <Text style={styles.itemUri}>{item.uri}</Text>
                    {item.lastModified && (
                      <Text style={styles.itemDate}>Modified: {item.lastModified.toLocaleString()}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  metadataContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#555',
  },
  value: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  itemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  itemSize: {
    fontSize: 12,
    color: '#666',
  },
  itemUri: {
    fontSize: 11,
    color: '#999',
  },
  itemDate: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  error: {
    fontSize: 16,
    color: 'red',
    padding: 16,
    backgroundColor: '#ffeeee',
    borderRadius: 8,
  },
}); 