import React from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from '@/components/ui';

export default function OnboardingScreen() {
  const router = useRouter();

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
      router.replace("/sign-in");
    } catch (e) {
      console.log("Error saving to AsyncStorage:", e);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-900">
      <View className="flex-1 justify-center items-center p-8">
        <View className="w-64 h-64 mb-8 bg-white/10 rounded-3xl items-center justify-center">
          <Image
            source={require("@/assets/images/onboarding.png")}
            className="w-56 h-56"
            resizeMode="contain"
          />
        </View>

        <Text
          variant="h1"
          weight="bold"
          className="text-center mb-4 text-white"
        >
          Welcome to Folderly
        </Text>

        <Text
          variant="body"
          className="text-center mb-12 text-neutral-300"
        >
          Organize and manage your files efficiently with easy access to your important directories
        </Text>

        <TouchableOpacity
          onPress={handleGetStarted}
          className="bg-primary-500 active:bg-primary-600 rounded-lg w-full py-4 shadow-lg"
        >
          <Text
            variant="body"
            weight="medium"
            className="text-white text-center"
          >
            Get Started
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
} 