import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  TextInput,
  Modal,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import FilePreview from './FilePreview';
import FileOperations from './FileOperations';
import { getSearchHistory, addToSearchHistory, clearSearchHistory, SearchHistoryItem } from '../lib/searchHistory';
import { SearchFilter, SIZE_RANGES, DATE_RANGES, isWithinDateRange, isWithinSizeRange } from '../lib/searchFilters';
import { FileItem, FileType, getFilesFromDirectory } from '@/lib/fileSystem';
import { useTheme } from '@/lib/theme-provider';
import { hasStoragePermissions, requestAndroidPermissions } from '@/lib/androidDirectories';

interface FileListProps {
  directories: string[];
  onRefresh?: () => void;
}

type FileExtensions = {
  image: readonly string[];
  video: readonly string[];
  audio: readonly string[];
  document: readonly string[];
  other: readonly string[];
};

const FILE_TYPES: FileExtensions = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  video: ['mp4', 'mov', 'avi', 'mkv'],
  audio: ['mp3', 'wav', 'm4a', 'aac'],
  document: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
  other: []
} as const;

export default function FileList({ directories, onRefresh }: FileListProps) {
  const { isDarkMode } = useTheme();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<FileType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<FileItem | null>(null);
  const [showOperations, setShowOperations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const searchInputRef = useRef<TextInput>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>([]);

  // Add filter analytics
  const filterCounts = useMemo(() => {
    const counts = {
      size: new Map<string, number>(),
      date: new Map<string, number>(),
    };

    files.forEach(file => {
      // Calculate size counts
      SIZE_RANGES.forEach(range => {
        if (isWithinSizeRange(file.size, range.min, range.max)) {
          counts.size.set(range.id, (counts.size.get(range.id) || 0) + 1);
        }
      });

      // Calculate date counts
      DATE_RANGES.forEach(range => {
        if (isWithinDateRange(file.modificationTime, range.days)) {
          counts.date.set(range.id, (counts.date.get(range.id) || 0) + 1);
        }
      });
    });

    return counts;
  }, [files]);

  useEffect(() => {
    loadFiles();
    loadSearchHistory();
  }, [directories]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const allFiles: FileItem[] = [];

      // Ensure we have storage permissions
      const hasPermission = await hasStoragePermissions();
      if (!hasPermission) {
        const { granted } = await requestAndroidPermissions();
        if (!granted) {
          handleError('Storage permission not granted');
          return;
        }
      }

      // Load files from each directory
      for (const directory of directories) {
        try {
          const dirFiles = await getFilesFromDirectory(directory);
          allFiles.push(...dirFiles);
        } catch (error) {
          console.error('Error loading directory:', directory, error);
        }
      }

      // Sort files by date (most recent first)
      const sortedFiles = allFiles.sort((a, b) => b.modificationTime - a.modificationTime);
      setFiles(sortedFiles);
    } catch (error) {
      console.error('Error loading files:', error);
      handleError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const loadSearchHistory = async () => {
    const history = await getSearchHistory();
    setSearchHistory(history);
  };

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase();
    const suggestions = new Set<string>();
    
    // Add file name suggestions
    files.forEach(file => {
      const name = file.name.toLowerCase();
      if (name.includes(query) && name !== query) {
        suggestions.add(file.name);
      }
    });
    
    // Add extension suggestions
    const matchingExtensions = files
      .filter(file => file.name.toLowerCase().includes(query))
      .map(file => file.name.split('.').pop()?.toLowerCase())
      .filter((ext): ext is string => !!ext);
    
    const extensionCounts = new Map<string, number>();
    matchingExtensions.forEach(ext => {
      extensionCounts.set(ext, (extensionCounts.get(ext) || 0) + 1);
    });
    
    // Add popular extensions as suggestions
    extensionCounts.forEach((count, ext) => {
      if (count > 1) {
        suggestions.add(`.${ext}`);
      }
    });
    
    return Array.from(suggestions).slice(0, 5); // Limit to 5 suggestions
  }, [files, searchQuery]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setShowSuggestions(false);
    if (query.trim()) {
      await addToSearchHistory(query);
      await loadSearchHistory();
    }
    setShowSearchHistory(false);
  };

  const handleClearHistory = async () => {
    await clearSearchHistory();
    setSearchHistory([]);
  };

  const sortFiles = (filesToSort: FileItem[], by: string, order: 'asc' | 'desc') => {
    return [...filesToSort].sort((a, b) => {
      let comparison = 0;
      switch (by) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = (a.modificationTime || 0) - (b.modificationTime || 0);
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
      }
      return order === 'asc' ? comparison : -comparison;
    });
  };

  const handleSort = (by: 'name' | 'date' | 'size') => {
    const newOrder = sortBy === by && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(by);
    setSortOrder(newOrder);
    setFiles(sortFiles(files, by, newOrder));
  };

  const handleFilter = (type: FileType | 'all') => {
    setFilterType(type);
  };

  const handleFilterToggle = (filter: SearchFilter) => {
    setActiveFilters(prev => {
      const exists = prev.find(f => f.id === filter.id);
      if (exists) {
        return prev.filter(f => f.id !== filter.id);
      }
      // Remove other filters of the same type if it's size or date
      const newFilters = prev.filter(f => 
        (filter.type === 'size' || filter.type === 'date') ? f.type !== filter.type : true
      );
      return [...newFilters, filter];
    });
  };

  const getFilteredFiles = () => {
    let result = files;
    
    // Apply active filters
    if (activeFilters.length > 0) {
      result = result.filter(file => {
        return activeFilters.every(filter => {
          switch (filter.type) {
            case 'size': {
              const range = SIZE_RANGES.find(r => r.id === filter.id);
              return range ? isWithinSizeRange(file.size, range.min, range.max) : true;
            }
            case 'date': {
              const range = DATE_RANGES.find(r => r.id === filter.id);
              return range ? isWithinDateRange(file.modificationTime, range.days) : true;
            }
            case 'type':
              return file.type === filter.value;
            case 'extension':
              return file.name.toLowerCase().endsWith(filter.value.toLowerCase());
            default:
              return true;
          }
        });
      });
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      result = result.filter(file => file.type === filterType);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(file => 
        file.name.toLowerCase().includes(query) ||
        file.type.toLowerCase().includes(query)
      );
    }

    return result;
  };

  const handleFilePress = (file: FileItem) => {
    if (selectedFiles.size > 0) {
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(file.path)) {
        newSelected.delete(file.path);
      } else {
        newSelected.add(file.path);
      }
      setSelectedFiles(newSelected);
    } else {
      setSelectedPreviewFile(file);
    }
  };

  const handleFileLongPress = (file: FileItem) => {
    const newSelected = new Set(selectedFiles);
    newSelected.add(file.path);
    setSelectedFiles(newSelected);
  };

  const previewFile = async (file: FileItem) => {
    // To be implemented with file preview component
    Alert.alert('Preview', `Opening ${file.name}`);
  };

  const handleShare = async () => {
    try {
      if (selectedFiles.size === 0) return;

      const filesToShare = Array.from(selectedFiles);
      if (Platform.OS === 'ios') {
        await Share.share({
          url: filesToShare[0], // iOS supports sharing one file at a time
          message: filesToShare.length > 1 ? `Sharing ${filesToShare.length} files` : undefined
        });
      } else {
        await Share.share({
          message: filesToShare.join('\n')
        });
      }
    } catch (error) {
      console.error('Error sharing files:', error);
      Alert.alert('Error', 'Failed to share files');
    }
  };

  const handleSave = async () => {
    try {
      if (selectedFiles.size === 0) return;

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Storage permission is required to save files');
        return;
      }

      for (const path of selectedFiles) {
        await MediaLibrary.createAssetAsync(path);
      }

      Alert.alert('Success', 'Files saved to gallery');
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Error saving files:', error);
      Alert.alert('Error', 'Failed to save files');
    }
  };

  const handleOperations = () => {
    setShowOperations(true);
  };

  const handleOperationsComplete = () => {
    setShowOperations(false);
    setSelectedFiles(new Set());
    loadFiles();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleSuggestionSelect = (suggestion: string) => {
    if (suggestion.startsWith('.')) {
      // If it's an extension suggestion, append it to the current query
      const currentQuery = searchQuery.split('.')[0];
      handleSearch(`${currentQuery}${suggestion}`);
    } else {
      handleSearch(suggestion);
    }
  };

  // Update keyboard navigation handler for React Native
  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (!showSuggestions || searchSuggestions.length === 0) return;

    switch (e.nativeEvent.key) {
      case 'ArrowDown':
        e.preventDefault?.();
        setSelectedSuggestionIndex(prev => 
          prev < searchSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault?.();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : searchSuggestions.length - 1
        );
        break;
      case 'Enter':
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionSelect(searchSuggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Update suggestion reset logic
  useEffect(() => {
    setSelectedSuggestionIndex(-1);
  }, [searchQuery]);

  const handleBatchSelect = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(file => file.path)));
    }
  };

  const handleError = (message: string) => {
    Alert.alert('Error', message);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const filteredFiles = getFilteredFiles();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    searchInput: {
      flex: 1,
      color: isDarkMode ? '#f1f5f9' : '#0f172a',
    },
    batchSelectButton: {
      padding: 8,
      marginLeft: 8,
    },
    selectedBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 8,
      backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#475569' : '#e2e8f0',
    },
    selectedText: {
      fontSize: 16,
      color: isDarkMode ? '#7cc2ff' : '#0077ff',
      fontWeight: '600',
    },
    clearButton: {
      padding: 8,
    },
    clearButtonText: {
      color: isDarkMode ? '#fca5a5' : '#ef4444',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <View className="flex-1">
      {/* Search Bar */}
      <View className="bg-white border-b border-gray-200 p-4">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-4 py-2">
          <TouchableOpacity onPress={() => setShowSearchHistory(true)}>
            <Ionicons name="search" size={20} color="#666666" />
          </TouchableOpacity>
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setShowSuggestions(text.length > 0);
            }}
            onKeyPress={handleKeyPress}
            onFocus={() => {
              if (searchQuery.trim()) {
                setShowSuggestions(true);
              } else {
                setShowSearchHistory(true);
              }
            }}
            onBlur={() => {
              // Delay hiding suggestions to allow for click events
              setTimeout(() => {
                setShowSuggestions(false);
                setSelectedSuggestionIndex(-1);
              }, 200);
            }}
            placeholder="Search files..."
            placeholderTextColor="#999999"
            className="flex-1 ml-2 text-base text-gray-900"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#666666" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search Suggestions */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <View className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg mt-1 shadow-lg z-50">
            {searchSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={suggestion}
                onPress={() => handleSuggestionSelect(suggestion)}
                className={`p-3 flex-row items-center ${
                  index < searchSuggestions.length - 1 ? 'border-b border-gray-100' : ''
                } ${index === selectedSuggestionIndex ? 'bg-gray-100' : ''}`}
              >
                <Ionicons
                  name={suggestion.startsWith('.') ? 'document' : 'search-outline'}
                  size={16}
                  color="#666666"
                />
                <Text className={`ml-3 ${
                  index === selectedSuggestionIndex ? 'font-medium' : ''
                }`}>
                  {suggestion.startsWith('.')
                    ? `Files with ${suggestion}`
                    : suggestion}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Search History Modal */}
      <Modal
        visible={showSearchHistory}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSearchHistory(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowSearchHistory(false)}
        >
          <View className="bg-white mt-32 mx-4 rounded-lg">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
              <Text className="text-lg font-medium">Recent Searches</Text>
              {searchHistory.length > 0 && (
                <TouchableOpacity onPress={handleClearHistory}>
                  <Text className="text-blue-500">Clear All</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView className="max-h-80">
              {searchHistory.length === 0 ? (
                <View className="p-4">
                  <Text className="text-gray-500 text-center">No recent searches</Text>
                </View>
              ) : (
                searchHistory.map((item) => (
                  <TouchableOpacity
                    key={item.timestamp}
                    onPress={() => handleSearch(item.query)}
                    className="flex-row items-center p-4 border-b border-gray-100"
                  >
                    <Ionicons name="time-outline" size={20} color="#666666" />
                    <Text className="ml-3 flex-1">{item.query}</Text>
                    <Text className="text-gray-400 text-sm">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="bg-white border-b border-gray-200 py-2 px-4"
        >
          <View className="flex-row space-x-2">
            {activeFilters.map(filter => (
              <TouchableOpacity
                key={filter.id}
                onPress={() => handleFilterToggle(filter)}
                className="flex-row items-center bg-blue-100 rounded-full px-3 py-1"
              >
                <Text className="text-blue-600 text-sm">{filter.label}</Text>
                <Ionicons name="close-circle" size={16} color="#2563EB" className="ml-1" />
              </TouchableOpacity>
            ))}
            {activeFilters.length > 0 && (
              <TouchableOpacity
                onPress={() => setActiveFilters([])}
                className="flex-row items-center bg-gray-100 rounded-full px-3 py-1"
              >
                <Text className="text-gray-600 text-sm">Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

      {/* Filter Options */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="bg-white border-b border-gray-200 py-2"
      >
        <View className="flex-row px-4 space-x-4">
          {/* Size Filter */}
          <View>
            <Text className="text-sm font-medium text-gray-500 mb-2">Size</Text>
            <View className="flex-row space-x-2">
              {SIZE_RANGES.map(range => {
                const count = filterCounts.size.get(range.id) || 0;
                const isActive = activeFilters.some(f => f.id === range.id);
                return (
                  <TouchableOpacity
                    key={range.id}
                    onPress={() => handleFilterToggle({
                      id: range.id,
                      type: 'size',
                      value: range.value,
                      label: range.label
                    })}
                    className={`px-3 py-1 rounded-full ${
                      isActive ? 'bg-blue-500' : 'bg-gray-100'
                    }`}
                  >
                    <View>
                      <Text
                        className={
                          isActive ? 'text-white' : 'text-gray-600'
                        }
                      >
                        {range.label}
                      </Text>
                      <Text
                        className={`text-xs ${
                          isActive ? 'text-blue-100' : 'text-gray-400'
                        }`}
                      >
                        {count} {count === 1 ? 'file' : 'files'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Date Filter */}
          <View>
            <Text className="text-sm font-medium text-gray-500 mb-2">Date</Text>
            <View className="flex-row space-x-2">
              {DATE_RANGES.map(range => {
                const count = filterCounts.date.get(range.id) || 0;
                const isActive = activeFilters.some(f => f.id === range.id);
                return (
                  <TouchableOpacity
                    key={range.id}
                    onPress={() => handleFilterToggle({
                      id: range.id,
                      type: 'date',
                      value: range.value,
                      label: range.label
                    })}
                    className={`px-3 py-1 rounded-full ${
                      isActive ? 'bg-blue-500' : 'bg-gray-100'
                    }`}
                  >
                    <View>
                      <Text
                        className={
                          isActive ? 'text-white' : 'text-gray-600'
                        }
                      >
                        {range.label}
                      </Text>
                      <Text
                        className={`text-xs ${
                          isActive ? 'text-blue-100' : 'text-gray-400'
                        }`}
                      >
                        {count} {count === 1 ? 'file' : 'files'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sort Bar */}
      <View className="flex-row justify-between items-center bg-white border-b border-gray-200 p-2">
        <View className="flex-row space-x-4">
          <TouchableOpacity onPress={() => handleSort('name')} className="flex-row items-center">
            <Text className={sortBy === 'name' ? 'text-blue-500' : 'text-gray-600'}>Name</Text>
            {sortBy === 'name' && (
              <Ionicons
                name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#007AFF"
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort('date')} className="flex-row items-center">
            <Text className={sortBy === 'date' ? 'text-blue-500' : 'text-gray-600'}>Date</Text>
            {sortBy === 'date' && (
              <Ionicons
                name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#007AFF"
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort('size')} className="flex-row items-center">
            <Text className={sortBy === 'size' ? 'text-blue-500' : 'text-gray-600'}>Size</Text>
            {sortBy === 'size' && (
              <Ionicons
                name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#007AFF"
              />
            )}
          </TouchableOpacity>
        </View>
        {selectedFiles.size > 0 && (
          <View className="flex-row space-x-4">
            <TouchableOpacity onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave}>
              <Ionicons name="download-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOperations}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* File List */}
      <ScrollView className="flex-1">
        <View className="p-4 space-y-2">
          {filteredFiles.length === 0 ? (
            <View className="py-8 items-center">
              <Ionicons name="search" size={48} color="#999999" />
              <Text className="text-center text-gray-500 mt-4">
                {searchQuery.trim()
                  ? 'No files match your search'
                  : filterType !== 'all'
                  ? `No ${filterType} files found`
                  : 'No files found'}
              </Text>
            </View>
          ) : (
            filteredFiles.map((file) => (
              <TouchableOpacity
                key={file.path}
                onPress={() => handleFilePress(file)}
                onLongPress={() => handleFileLongPress(file)}
                className={`bg-white p-4 rounded-lg flex-row items-center space-x-3 ${
                  selectedFiles.has(file.path) ? 'border-2 border-blue-500' : ''
                }`}
              >
                <Ionicons
                  name={
                    file.type === 'image'
                      ? 'image'
                      : file.type === 'video'
                      ? 'videocam'
                      : file.type === 'audio'
                      ? 'musical-notes'
                      : file.type === 'document'
                      ? 'document-text'
                      : 'document'
                  }
                  size={24}
                  color="#007AFF"
                />
                <View className="flex-1">
                  <Text className="font-medium">{file.name}</Text>
                  <Text className="text-gray-500 text-sm">
                    {formatFileSize(file.size)} • {new Date(file.modificationTime || 0).toLocaleDateString()}
                  </Text>
                </View>
                {selectedFiles.has(file.path) && (
                  <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Operations Bar */}
      {selectedFiles.size > 0 && (
        <View className="flex-row justify-between items-center bg-white border-b border-gray-200 p-2">
          <View className="flex-row space-x-4">
            <TouchableOpacity onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave}>
              <Ionicons name="download-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOperations}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setSelectedFiles(new Set())}>
            <Ionicons name="close-circle-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      )}

      {/* File Operations Sheet */}
      {showOperations && (
        <View className="absolute bottom-0 left-0 right-0">
          <FileOperations
            selectedFiles={files.filter(f => selectedFiles.has(f.path))}
            onComplete={() => {
              setShowOperations(false);
              setSelectedFiles(new Set());
              loadFiles();
            }}
            onError={handleError}
          />
        </View>
      )}

      {/* File Preview Modal */}
      <Modal
        visible={!!selectedPreviewFile}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setSelectedPreviewFile(null)}
      >
        {selectedPreviewFile && (
          <View className="flex-1">
            <View className="bg-white dark:bg-zinc-900 p-4 flex-row justify-between items-center">
              <Text className="text-lg font-rubik-medium text-black-300 dark:text-white">
                {selectedPreviewFile.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedPreviewFile(null)}>
                <Ionicons name="close" size={24} color="#999999" />
              </TouchableOpacity>
            </View>
            <FilePreview file={selectedPreviewFile} />
          </View>
        )}
      </Modal>

      {selectedFiles.size > 0 && (
        <View style={styles.selectedBar}>
          <Text style={styles.selectedText}>
            {selectedFiles.size} selected
          </Text>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSelectedFiles(new Set())}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity 
        style={styles.batchSelectButton} 
        onPress={handleBatchSelect}
      >
        <Ionicons 
          name={selectedFiles.size === filteredFiles.length ? "checkbox" : "square-outline"} 
          size={24} 
          color="#007AFF" 
        />
      </TouchableOpacity>
    </View>
  );
} 