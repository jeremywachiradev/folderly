import React, { useState, useEffect, useContext } from "react";
import { View, TouchableOpacity, Image, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/theme-provider';
import { Portal, Modal as PaperModal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { 
  hasStoragePermissions, 
  requestAndroidPermissions, 
  AndroidDirectory,
  checkDirectoryExists,
  getAlternativeDirectories,
  pathToSafUri
} from '@/lib/androidDirectories';
import { showToast, showDialog } from '@/lib/notifications';
import * as FileSystem from 'expo-file-system';
import { useConfiguration } from '@/contexts/ConfigurationContext';
import { requestPermissions } from '@/lib/fileSystem';
import { TELEGRAM_PATHS, WHATSAPP_PATHS } from '@/lib/androidDirectories';

export default function OnboardingScreen() {
  const { isDarkMode } = useTheme();
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { createCategory } = useConfiguration();

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const hasPerms = await hasStoragePermissions();
    setHasPermission(hasPerms);
  };

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
      
      if (Platform.OS === 'android' && !hasPermission) {
        setPermissionModalVisible(true);
      } else {
        // Skip category creation in onboarding - it will be handled in auth provider
        router.replace("/sign-in");
      }
    } catch (e) {
      
    }
  };

  const handleRequestPermission = async () => {
    const { granted } = await requestAndroidPermissions();
    setPermissionModalVisible(false);
    
    if (granted) {
      setHasPermission(true);
      // Skip category creation in onboarding - it will be handled in auth provider
      router.replace("/sign-in");
    } else {
      showToast('error', 'Storage permission is required to use this app');
    }
  };

  const handleSkipPermission = () => {
    setPermissionModalVisible(false);
    router.replace("/sign-in");
  };

  const gradientColors = isDarkMode 
    ? ['transparent', 'transparent', 'transparent', 'rgba(15, 23, 42, 0.2)', 'rgb(15, 23, 42)'] as const
    : ['transparent', 'transparent', 'transparent', 'rgba(241, 245, 249, 0.2)', 'rgb(241, 245, 249)'] as const;

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-neutral-900' : 'bg-white'}`}>
      <View className="flex-1 justify-center items-center p-8">
        <View className="relative w-[420px] h-[420px] mb-8">
          {/* Top gradient */}
          <LinearGradient
            colors={gradientColors}
            locations={[0, 0.2, 0.5, 0.8, 1]}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              borderRadius: 24,
              zIndex: 1
            }}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          {/* Left gradient */}
          <LinearGradient
            colors={gradientColors}
            locations={[0, 0.2, 0.5, 0.8, 1]}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              borderRadius: 24,
              zIndex: 1
            }}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
          />
          {/* Right gradient */}
          <LinearGradient
            colors={gradientColors}
            locations={[0, 0.2, 0.5, 0.8, 1]}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              borderRadius: 24,
              zIndex: 1
            }}
            start={{ x: 1, y: 0.5 }}
            end={{ x: 0, y: 0.5 }}
          />
          {/* Bottom gradient */}
          <LinearGradient
            colors={gradientColors}
            locations={[0, 0.2, 0.5, 0.8, 1]}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              borderRadius: 24,
              zIndex: 1
            }}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
          />
          <View className="w-full h-full items-center justify-center overflow-hidden rounded-3xl">
            <Image
              source={require("@/assets/images/onboarding.png")}
              className="w-[98%] h-[98%]"
              resizeMode="contain"
            />
          </View>
        </View>

        <Text
          variant="h1"
          weight="bold"
          className={`text-center mb-4 ${isDarkMode ? 'text-white' : 'text-neutral-900'} flex-row items-center justify-center`}
        >
          Welcome to{' '}<Text variant="h1" weight="bold" className="text-[#0077ff]">Folderly</Text>
        </Text>
        
        <Text
          variant="body"
          className={`text-center mb-12 ${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}`}
        >
          Organize and manage your files efficiently with easy access to your important directories
        </Text>

        <TouchableOpacity
          onPress={handleGetStarted}
          className="bg-primary-500 active:bg-primary-600 rounded-lg w-full py-4 shadow-lg"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text
              variant="body"
              weight="medium"
              className="text-white text-center"
            >
              Get Started
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Permission Request Modal */}
      <Portal>
        <PaperModal
          visible={permissionModalVisible}
          onDismiss={() => setPermissionModalVisible(false)}
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
                Storage Permission Required
              </Text>
              <TouchableOpacity onPress={() => setPermissionModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? '#ffffff' : '#000000'} />
              </TouchableOpacity>
            </View>

            <Text className="text-base text-neutral-600 dark:text-neutral-400 mb-6">
              Folderly needs access to your device storage to manage and organize your files. Without this permission, the app won't be able to function properly.
            </Text>

            <View className="flex-row justify-end space-x-4">
              <TouchableOpacity 
                onPress={handleSkipPermission}
                className="px-4 py-2"
              >
                <Text className="text-neutral-500">Skip for now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleRequestPermission}
                className="bg-primary-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">Grant Permission</Text>
              </TouchableOpacity>
            </View>
          </View>
        </PaperModal>
      </Portal>
    </SafeAreaView>
  );
} 