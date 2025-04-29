import Toast from 'react-native-toast-message';
import { Portal, Modal as PaperModal } from 'react-native-paper';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-provider';

// These types are now defined in the DialogProvider component
// We're keeping them here for backward compatibility
type DialogButton = {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

interface ShowDialogOptions {
  title: string;
  message: string;
  buttons: DialogButton[];
}

// This function is now deprecated. Please use the useDialog hook from DialogProvider instead
export const showDialog = ({ title, message, buttons }: ShowDialogOptions): Promise<string> => {
  return new Promise((resolve) => {
    // Import and use the DialogProvider's showDialog function
    const { showDialog } = require('@/components/ui/DialogProvider').useDialog();
    showDialog({ title, message, buttons }).then(resolve);
  });
};

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export const showToast = (type: ToastType, message: string) => {
  
  Toast.show({
    type,
    text1: message,
    position: 'bottom',
    visibilityTime: 3000,
  });
  
}; 