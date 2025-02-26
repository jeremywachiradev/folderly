import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Portal, Modal as PaperModal } from 'react-native-paper';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-provider';

type DialogButton = {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

interface DialogOptions {
  title: string;
  message: string;
  buttons: DialogButton[];
}

interface DialogContextType {
  showDialog: (options: DialogOptions) => Promise<string>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [dialogOptions, setDialogOptions] = useState<DialogOptions | null>(null);
  const [resolveDialog, setResolveDialog] = useState<((value: string) => void) | null>(null);
  const { isDarkMode } = useTheme();

  const showDialog = (options: DialogOptions): Promise<string> => {
    return new Promise((resolve) => {
      setDialogOptions(options);
      setResolveDialog(() => resolve);
      setVisible(true);
    });
  };

  const handleButtonPress = (button: DialogButton) => {
    setVisible(false);
    button.onPress();
    if (resolveDialog) {
      resolveDialog(button.text);
    }
  };

  return (
    <DialogContext.Provider value={{ showDialog }}>
      {children}
      <Portal>
        {dialogOptions && (
          <PaperModal
            visible={visible}
            onDismiss={() => setVisible(false)}
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
                  {dialogOptions.title}
                </Text>
                <TouchableOpacity onPress={() => setVisible(false)}>
                  <Ionicons name="close" size={24} color={isDarkMode ? '#ffffff' : '#000000'} />
                </TouchableOpacity>
              </View>

              <Text className="text-base text-neutral-600 dark:text-neutral-400 mb-6">
                {dialogOptions.message}
              </Text>

              <View className="flex-row justify-end space-x-4">
                {dialogOptions.buttons.map((button, index) => {
                  const isDestructive = button.style === 'destructive';
                  const isCancel = button.style === 'cancel';
                  
                  let buttonStyle = "bg-primary-500";
                  let textStyle = "text-white";
                  
                  if (isDestructive) {
                    buttonStyle = "bg-red-500";
                  } else if (isCancel) {
                    buttonStyle = "";
                    textStyle = "text-neutral-500";
                  }
                  
                  return (
                    <TouchableOpacity 
                      key={index}
                      onPress={() => handleButtonPress(button)}
                      className={`px-4 py-2 ${buttonStyle} ${isCancel ? '' : 'rounded-lg'}`}
                    >
                      <Text className={textStyle}>{button.text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </PaperModal>
        )}
      </Portal>
    </DialogContext.Provider>
  );
}; 