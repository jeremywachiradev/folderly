import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { FileCategory, saveCategory } from '@/lib/fileSystem';
import Toast from 'react-native-toast-message';

interface AddCategoryModalProps {
  visible: boolean;
  onDismiss: () => void;
  onCategoryAdded: (category: FileCategory) => void;
}

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB',
];

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  visible,
  onDismiss,
  onCategoryAdded,
}) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [directories, setDirectories] = useState<string[]>([]);

  const handleAddDirectory = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: false,
      });

      if (!result.canceled && result.assets[0]) {
        const newDirectory = result.assets[0].uri;
        if (!directories.includes(newDirectory)) {
          setDirectories([...directories, newDirectory]);
        }
      }
    } catch (error) {
      console.error('Error picking directory:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to select directory',
      });
    }
  };

  const handleRemoveDirectory = (index: number) => {
    setDirectories(directories.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a category name',
      });
      return;
    }

    if (directories.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please add at least one directory',
      });
      return;
    }

    try {
      const newCategory: FileCategory = {
        id: Date.now().toString(),
        name: name.trim(),
        color: selectedColor,
        directories,
      };

      await saveCategory(newCategory);
      onCategoryAdded(newCategory);
      onDismiss();

      // Reset form
      setName('');
      setSelectedColor(PRESET_COLORS[0]);
      setDirectories([]);
    } catch (error) {
      console.error('Error saving category:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save category',
      });
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          backgroundColor: 'white',
          margin: 20,
          borderRadius: 16,
          padding: 20,
        }}
      >
        <ScrollView>
          <Text className="text-xl font-rubik-bold text-black-300 mb-4">
            Add New Category
          </Text>

          <Text className="text-sm font-rubik text-black-400 mb-2">
            Category Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter category name"
            className="bg-zinc-100 rounded-lg p-3 mb-4 font-rubik"
          />

          <Text className="text-sm font-rubik text-black-400 mb-2">
            Select Color
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {PRESET_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setSelectedColor(color)}
                className="w-10 h-10 rounded-full justify-center items-center"
                style={{ backgroundColor: color }}
              >
                {color === selectedColor && (
                  <Ionicons name="checkmark" size={20} color="white" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-sm font-rubik text-black-400 mb-2">
            Directories
          </Text>
          {directories.map((dir, index) => (
            <View
              key={index}
              className="flex-row items-center bg-zinc-100 rounded-lg p-3 mb-2"
            >
              <Text className="flex-1 font-rubik text-black-300" numberOfLines={1}>
                {dir}
              </Text>
              <TouchableOpacity
                onPress={() => handleRemoveDirectory(index)}
                className="ml-2"
              >
                <Ionicons name="close-circle" size={24} className="text-red-500" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={handleAddDirectory}
            className="flex-row items-center justify-center bg-primary-100 rounded-lg p-3 mb-4"
          >
            <Ionicons name="add-circle-outline" size={24} className="text-primary-500 mr-2" />
            <Text className="font-rubik text-primary-500">Add Directory</Text>
          </TouchableOpacity>

          <View className="flex-row justify-end gap-2">
            <TouchableOpacity
              onPress={onDismiss}
              className="px-4 py-2 rounded-lg bg-zinc-100"
            >
              <Text className="font-rubik text-black-400">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              className="px-4 py-2 rounded-lg bg-primary-500"
            >
              <Text className="font-rubik text-white">Save</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
};

export default AddCategoryModal; 