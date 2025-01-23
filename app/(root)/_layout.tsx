import { Redirect, Slot } from "expo-router";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-provider";

export default function AppLayout() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const { user, isLoading } = useAuth();

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const value = await AsyncStorage.getItem("hasSeenOnboarding");
      setHasSeenOnboarding(value === "true");
    } catch (e) {
      console.log("Error reading from AsyncStorage:", e);
      setHasSeenOnboarding(false);
    }
  };

  if (hasSeenOnboarding === null || isLoading) {
    return (
      <SafeAreaView className="bg-neutral-900 h-full flex justify-center items-center">
        <ActivityIndicator color="#0077ff" size="large" />
      </SafeAreaView>
    );
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  return <Slot />;
}
