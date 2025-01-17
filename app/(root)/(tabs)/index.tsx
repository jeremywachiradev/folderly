// Home.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  Alert,
  useColorScheme
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome,
} from "@expo/vector-icons";
import { Portal, Modal, TextInput, Button, Text } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Card from "@/components/Cards";
import NoResults from "@/components/NoResults";

import type { ImageSourcePropType } from 'react-native';

interface AppIcons {
  [appName: string]: React.ComponentProps<typeof Ionicons>['name'];
}

const appIcons: AppIcons = {
  whatsapp: 'logo-whatsapp',
  telegram: 'logo-telegram', // Make sure 'logo-telegram' is a valid Ionicons name
};

interface FileType {
  name: string;
  icon: React.ComponentProps<typeof Ionicons | typeof MaterialIcons | typeof FontAwesome>['name'];
  mediaType: string; // Use string for mediaType
}

const fileTypes: FileType[] = [
  { name: 'All', icon: 'folder', mediaType: 'unknown' },
  { name: 'Images', icon: 'image', mediaType: 'photo' },
  { name: 'Videos', icon: 'videocam', mediaType: 'video' },
  { name: 'Audio', icon: 'headset', mediaType: 'audio' },
  // Add more file types as needed
];

interface CardProps {
  item: MediaLibrary.Asset;
  onPress: (uri: string) => void;
  isFolder: boolean;
}

interface SelectedApps {
  [appName: string]: boolean;
}

interface AppSettings {
  [appName: string]: string[];
}

const Home = async () => {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allFiles, setAllFiles] = useState<MediaLibrary.Asset[]>([]);
  const [selectedApps, setSelectedApps] = useState<SelectedApps>({
    whatsapp: true,
    telegram: false,
  });
  const [selectedFileTypes, setSelectedFileTypes] = useState<FileType[]>([]);

  const [visible, setVisible] = useState(false);
  const [activeAppName, setActiveAppName] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    whatsapp: ["Android/media/com.whatsapp/WhatsApp/Media/.Statuses"],
    telegram: [],
  });
  const [newPath, setNewPath] = useState("");
  const colorScheme = useColorScheme();

  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setPermissionsGranted(status === "granted");
    };

    getPermissions();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem('appSettings');
        if (storedSettings) {
          setAppSettings(JSON.parse(storedSettings));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    if (permissionsGranted) {
      fetchAllFiles();
    }
  }, [permissionsGranted, appSettings]);

  const handleDeepLink = useCallback(async (event: Linking.EventType) => {
    if (Platform.OS === 'android' && event.url && typeof event.url === 'string') {
      const uriParts = event.url.split("%3A");
      if (uriParts.length > 1) {
        const selectedPath = uriParts[1].replace(/%2F/g, "/");
        setNewPath(selectedPath);
      }
    }
  }, []);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [handleDeepLink]);

  const fetchAllFiles = async () => {
    try {
      setLoading(true);
      const allAssets: MediaLibrary.Asset[] = [];

      for (const appName in appSettings) {
        if (selectedApps[appName]) {
          for (const path of appSettings[appName]) {
            const assets = await fetchFilesFromPath(path);
            allAssets.push(...assets);
          }
        }
      }

      setAllFiles(allAssets);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilesFromPath = async (
    path: string
  ): Promise<MediaLibrary.Asset[]> => {
    try {
      const fullUri = Platform.OS === "android" ? `file:///${path}` : path;

      // Now inside an async function
      const { exists } = await FileSystem.getInfoAsync(fullUri); 
      if (!exists) {
        console.warn(`Directory not found: ${path}`);
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(fullUri);

      const assets = await Promise.all(
        files.map(async (file) => {
          const fileUri = `${fullUri}/${file}`;
          const asset = await MediaLibrary.createAssetAsync(fileUri);
          return asset;
        })
      );

      return assets;
    } catch (error) {
      console.error(`Error fetching files from ${path}:`, error);
      return [];
    }
  };


  const handleChooseDirectory = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'directory' });
      // Ensure result has the correct type
      if (result.type === 'success' && 'uri' in result) {
        setNewPath(result.uri);
      } else {
        // Handle cases where 'uri' might not be present
        console.warn("DocumentPicker result does not have a 'uri' property:", result);
      }

    } catch (err) {
      if ((err as any)?.code !== 'ERR_CANCELED') {
        console.error("Error choosing directory:", err);
        Alert.alert('Error', 'There was an error while choosing the directory.');
      }
    }
  };


  const handleAddPath = () => {
    if (!activeAppName) return;

    if (newPath && !appSettings[activeAppName].includes(newPath)) {
      setAppSettings((prevSettings) => ({
        ...prevSettings,
        [activeAppName]: [...prevSettings[activeAppName], newPath],
      }));
      setNewPath("");
    }
  };
  const handleSettingsPress = (appName: string) => {
    setActiveAppName(appName);
    setVisible(true);
  };
  const handleAppToggle = (appName: string) => {
    setSelectedApps(prev => ({
      ...prev,
      [appName]: !prev[appName]
    }));
  };
  const handlePathChange = (newPath: string) => {
    setNewPath(newPath);
  };
  const handleFilePress = (uri: string) => {
    console.log("File pressed:", uri);
  };

  const handleFileTypePress = (fileType: FileType) => {
    setSelectedFileTypes(prevTypes => {
      if (prevTypes.includes(fileType)) {
        return prevTypes.filter(type => type !== fileType);
      } else {
        return [...prevTypes, fileType];
      }
    });
  };


  const getFilteredFiles = () => {
    return allFiles.filter(file => {
      const fileTypeMatch = selectedFileTypes.length === 0 || selectedFileTypes.some(selectedType => selectedType.mediaType === file.mediaType); // Check if any selected file type matches
      return fileTypeMatch;
    });
  };


  const handleDeletePath = (index: number) => {
    if (!activeAppName) return;

    setAppSettings((prevSettings) => {
      const updatedPaths = [...prevSettings[activeAppName]];
      updatedPaths.splice(index, 1);
      return {
        ...prevSettings,
        [activeAppName]: updatedPaths,
      };
    });
  };

  const handleSaveSettings = async () => {
    try {
      await AsyncStorage.setItem('appSettings', JSON.stringify(appSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
    setVisible(false);
  };

  if (!permissionsGranted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Folderly needs permission to access your files.</Text>
        <TouchableOpacity onPress={() => MediaLibrary.requestPermissionsAsync()}>
          <Text>Grant Permissions</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colorScheme === 'dark' ? '#121212' : '#fff',
        },
      ]}
    >
      <View style={styles.filtersContainer}>
        <View style={styles.appFilterContainer}>
          {Object.keys(selectedApps).map((appName) => (
            <TouchableOpacity
              key={appName}
              style={[
                styles.appFilterItem,
                {
                  backgroundColor: colorScheme === 'dark' ? '#1c1c1c' : '#f2f2f2'
                }
              ]}
              onPress={() => handleAppToggle(appName)}
            >
              <Ionicons name={appIcons[appName]} size={24} color={selectedApps[appName] ? '#0061FF' : '#a1a1a1'} />
              <Text style={[
                styles.filterText,
                {
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                }
              ]}>{appName}</Text>
              <TouchableOpacity onPress={() => handleSettingsPress(appName)}>
                <Ionicons name="settings-sharp" size={24} color="#a1a1a1" />
              </TouchableOpacity>

            </TouchableOpacity>
          ))}
        </View>
        {/* File Type Filters */}
        <View style={styles.fileTypeFilterContainer}>
          {fileTypes.map((fileType) => (
            <TouchableOpacity
              key={fileType.name}
              style={[
                styles.fileTypeFilterItem,
                {
                  backgroundColor: colorScheme === 'dark' ? '#1c1c1c' : '#f2f2f2'
                }
              ]}
              onPress={() => handleFileTypePress(fileType)}
            >
              {/* Conditionally render icons based on their source */}
              {fileType.icon.startsWith('md-') ? (
                <Ionicons name={fileType.icon as React.ComponentProps<typeof Ionicons>['name']} size={24} color={selectedFileTypes.includes(fileType) ? '#0061FF' : '#a1a1a1'} />
              ) : fileType.icon.startsWith('video') || fileType.icon.startsWith('image') ? (
                <MaterialIcons name={fileType.icon as React.ComponentProps<typeof MaterialIcons>['name']} size={24} color={selectedFileTypes.includes(fileType) ? '#0061FF' : '#a1a1a1'} />
              ) : (
                <FontAwesome name={fileType.icon as React.ComponentProps<typeof FontAwesome>['name']} size={24} color={selectedFileTypes.includes(fileType) ? '#0061FF' : '#a1a1a1'} />
              )}
              <Text style={[
                styles.filterText,
                {
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                }
              ]}>{fileType.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <View style={styles.fileListContainer}>
          {getFilteredFiles().length > 0 ? (
            <FlatList
              data={getFilteredFiles()}
              numColumns={2}
              renderItem={({ item }) => (
                <Card
                  item={item}
                  onPress={handleFilePress}
                  isFolder={false}
                />
              )}
              keyExtractor={(item) => item.id}
            />
          ) : (
            <NoResults />
          )}
        </View>
      )}

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            {
              backgroundColor: colorScheme === 'dark' ? '#252525' : '#fff'
            }
          ]}
        >
          <Text
            variant="titleMedium"
            style={{
              color: colorScheme === 'dark' ? '#fff' : '#000',
              textAlign: 'center',
              marginBottom: 12
            }}
          >
            Settings for {activeAppName}
          </Text>
          {activeAppName &&
            appSettings[activeAppName] &&
            appSettings[activeAppName].map((path, index) => (
              <View key={index} style={styles.pathItem}>
                <Text
                  style={{
                    color: colorScheme === 'dark' ? '#fff' : '#000'
                  }}
                >{path}</Text>
                <Button onPress={() => handleDeletePath(index)}>
                  Delete
                </Button>
              </View>
            ))}
          <Button onPress={handleChooseDirectory}>
            Choose Directory (File System)
          </Button>
          <TextInput
            label="Add new path (Manual)"
            value={newPath}
            onChangeText={handlePathChange}
            mode='outlined'
            style={{
              marginTop: 12
            }}
          />
          <Button onPress={handleAddPath} disabled={!newPath} style={{ marginTop: 12 }}>
            Add Path
          </Button>
          <Button onPress={handleSaveSettings} style={{ marginTop: 12 }}>Save Changes</Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Filters styles
  filtersContainer: {
    padding: 10,
  },
  appFilterContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },
  appFilterItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'lightgray',
    padding: 8,
    borderRadius: 20,
  },
  fileTypeFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  fileTypeFilterItem: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'lightgray',
    padding: 8,
    borderRadius: 20,
    margin: 5,
  },
  filterText: {
    marginLeft: 5,
  },
  fileListContainer: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
    margin: 20,
    borderRadius: 5,
  },
  pathItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
});

export default Home;

