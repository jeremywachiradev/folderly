import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

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

// This function will be replaced by the useDialog hook from DialogProvider
// Keeping it for backward compatibility until we update all usages
export const showDialog = ({ title, message, buttons }: ShowDialogOptions): Promise<string> => {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      buttons.map(button => ({
        text: button.text,
        onPress: () => {
          button.onPress();
          resolve(button.text);
        },
        style: button.style,
      })),
      { cancelable: false }
    );
  });
};

type ToastType = 'success' | 'error' | 'info';

export const showToast = (type: ToastType, message: string) => {
  console.log('Showing toast:', { type, message });
  Toast.show({
    type,
    text1: message,
    position: 'bottom',
    visibilityTime: 3000,
  });
  console.log('Toast shown');
}; 