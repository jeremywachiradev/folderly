import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

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