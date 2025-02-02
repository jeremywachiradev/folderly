import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui';
import { useAuth } from '@/lib/auth-provider';

export default function CallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { handleOAuthCallback } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await handleOAuthCallback(params);
        router.replace('/(root)/(tabs)');
      } catch (error) {
        console.error('Error handling callback:', error);
        router.replace('/sign-in');
      }
    };

    handleCallback();
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-neutral-900">
      <Text className="text-white text-lg">Completing sign in...</Text>
    </View>
  );
} 