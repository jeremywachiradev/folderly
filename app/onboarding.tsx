import React from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';

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
        <View className="relative w-[420px] h-[420px] mb-8">
          {/* Top gradient */}
          <LinearGradient
            colors={['transparent', 'transparent', 'transparent', 'rgba(15, 23, 42, 0.2)', 'rgb(15, 23, 42)']}
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
            colors={['transparent', 'transparent', 'transparent', 'rgba(15, 23, 42, 0.2)', 'rgb(15, 23, 42)']}
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
            colors={['transparent', 'transparent', 'transparent', 'rgba(15, 23, 42, 0.2)', 'rgb(15, 23, 42)']}
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
            colors={['transparent', 'transparent', 'transparent', 'rgba(15, 23, 42, 0.2)', 'rgb(15, 23, 42)']}
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
          className="text-center mb-4 text-white flex-row items-center justify-center"
        >
          Welcome to{' '}<Text variant="h1" weight="bold" className="text-[#0077ff]">Folderly</Text>
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