import React from 'react';
import { StorageAccessFramework } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasStoragePermissions, requestAndroidPermissions } from '@/lib/androidDirectories';
import { AndroidDirectory } from '@/lib/androidDirectories';
import { showDialog, showToast } from '@/lib/notifications';

interface DirectoryPickerProps {
  mode?: 'single' | 'multiple';
  onClose: () => void;
}

export default function DirectoryPicker({ mode = 'single', onClose }: DirectoryPickerProps) {
  const [selectedDirectories, setSelectedDirectories] = React.useState<AndroidDirectory[]>([]);

  React.useEffect(() => {
    // Load existing directories from form state
    loadExistingDirectories();
    // Start directory picking
    pickDirectory();
  }, []);

  const loadExistingDirectories = async () => {
    try {
      const formStateJson = await AsyncStorage.getItem('@folderly/category_form_state');
      if (formStateJson) {
        const formState = JSON.parse(formStateJson);
        if (formState.directories) {
          setSelectedDirectories(formState.directories);
        }
      }
    } catch (error) {
      console.error('Error loading existing directories:', error);
    }
  };

  const checkPermissions = async () => {
    if (!hasStoragePermissions()) {
      await showDialog({
        title: 'Permission Required',
        message: 'Storage access permission is required to select directories.',
        buttons: [
          {
            text: 'OK',
            onPress: () => {},
          }
        ]
      });
      return false;
    }
    return true;
  };

  const pickDirectory = async () => {
    try {
      // Check if we already have root permissions
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        // Request root permissions first time
        const { granted } = await requestAndroidPermissions();
        if (!granted) {
          onClose();
          return;
        }
      }

      // Use SAF to pick a directory
      const result = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      
      if (result.granted) {
        const uri = result.directoryUri;
        
        try {
          // Verify we can read the directory by attempting to list its contents
          const directory = await StorageAccessFramework.readDirectoryAsync(uri);
          
          if (!directory) {
            showToast('error', 'Could not access the selected directory. Please try again.');
            onClose();
            return;
          }
          
          // Get the directory name from the URI
          const dirName = decodeURIComponent(uri.split('/').pop() || 'Selected Directory')
            .replace(/^primary:/, '')  // Remove 'primary:' prefix if present
            .replace(/^\d{4}-\d{4}:/, ''); // Remove any device ID prefix
          
          // Create the new directory object
          const newDirectory: AndroidDirectory = {
            name: dirName,
            path: uri,
            type: 'custom',
            uri: uri,
            validated: true
          };

          // If in multiple mode, add to existing directories
          if (mode === 'multiple') {
            // Check if directory already exists
            const exists = selectedDirectories.some(dir => dir.path === newDirectory.path);
            if (!exists) {
              const updatedDirectories = [...selectedDirectories, newDirectory];
              setSelectedDirectories(updatedDirectories);
              
              // Store the selected directories
              await AsyncStorage.setItem(
                '@folderly/selected_directories',
                JSON.stringify(updatedDirectories)
              );
            }
          } else {
            // In single mode, just store the directory
            await AsyncStorage.setItem(
              '@folderly/selected_directories',
              JSON.stringify([newDirectory])
            );
          }
        } catch (error) {
          console.error('Error verifying directory access:', error);
          showToast('error', 'Could not access the selected directory. Please try again.');
          onClose();
          return;
        }
      }
      // Always close after selection
      onClose();
    } catch (error) {
      console.error('Error picking directory:', error);
      showToast('error', 'Failed to select directory. Please try again.');
      onClose();
    }
  };

  // Return null since this is just a functional component that redirects
  return null;
} 
