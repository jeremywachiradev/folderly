import React, { useState, useEffect, useCallback } from "react";
import { useColorScheme } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Appearance,
} from "react-native";
import { login } from "@/lib/appwrite";
import { Redirect, useRouter } from "expo-router";
import { useGlobalContext } from "@/lib/global-provider";
import icons from "@/constants/icons";
import images from "@/constants/images";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Checkbox, MD3DarkTheme, MD3LightTheme, useTheme  } from "react-native-paper";
import { LinearGradient } from 'expo-linear-gradient';

const Auth = () => {
  const router = useRouter();
  const colorScheme = useColorScheme(); 
  const insets = useSafeAreaInsets();
  const paperTheme = useTheme(); // Access the theme object

  const { refetch, loading, isLogged } = useGlobalContext();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem("hasSeenOnboarding");
        if (value === "true") {
          setHasSeenOnboarding(true);
        }
      } catch (e) {
        console.log("Error reading from AsyncStorage:", e);
      }
    };

    checkOnboarding();
  }, []);

  useEffect(() => {
    if (!loading && isLogged && hasSeenOnboarding) {
      router.replace("/"); 
    }
  }, [isLogged, loading, hasSeenOnboarding, router]);

  const handleLogin = async () => {
    if (!agreedToTerms) {
      Toast.show({
        type: "error",
        text1: "Agreement Required",
        text2:
          "Please agree to the Terms of Use and Privacy Policy before signing in.",
      });
      return;
    }

    const result = await login();
    if (result) {
      refetch(); 
      try {
        await AsyncStorage.setItem("hasSeenOnboarding", "true");
      } catch (e) {
        console.log("Error saving to AsyncStorage:", e);
      }
    } else {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to log in",
      });
    }
  };

  const handleContinueWithoutAccount = async () => {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
      setHasSeenOnboarding(true);
    } catch (e) {
      console.log("Error saving to AsyncStorage:", e);
    }
  };

  if (!loading && isLogged && hasSeenOnboarding) {
    return <Redirect href="/" />;
  }

  return (
      <SafeAreaView className="bg-white h-full dark:bg-black" style={{paddingTop: insets.top, paddingBottom: insets.bottom}}> 
        <ScrollView
        contentContainerStyle={{
          height: "100%",
        }}
      >
        <View className="relative w-full h-4/6 overflow-hidden">
          <Image
            source={images.onboarding}
            className="w-full h-full absolute"  
            resizeMode="cover"                 
          />
          <LinearGradient
            colors={[
              paperTheme.dark ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)', 
              'transparent', 
              'transparent', 
              paperTheme.dark ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)'
            ]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            locations={[0, 0.2, 0.8, 1]}
          />
        </View>
        
          <View className="px-10">
            <Text className="text-base text-center uppercase font-rubik text-black-200 dark:text-white"> 
              Welcome To Folderly
            </Text>

            <Text className="text-3xl font-rubik-bold text-black-300 text-center mt-2 dark:text-white"> 
              Dive Deeper Into Your
              <Text className="text-primary-300"> Files</Text>
            </Text>

            <TouchableOpacity
              onPress={handleLogin}
              className="bg-white shadow-md shadow-zinc-300 rounded-full w-full py-4 mt-5 dark:bg-black" 
            >
              <View className="flex flex-row items-center justify-center">
              
                <Image
                  source={icons.google}
                  className="w-5 h-5"
                  resizeMode="contain"
                />
                <Text className="text-lg font-rubik-medium text-black-300 ml-2 dark:text-white"> 
                  Continue with Google
                </Text>
              </View>
            </TouchableOpacity>

            <View className="flex flex-row items-center  mt-3">
              <Checkbox
                status={agreedToTerms ? "checked" : "unchecked"}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                color={paperTheme.colors.primary.main} 
              />
              <View className="flex flex-row items-center  mt-3">
                <Text className="text-sm font-rubik text-black-400 dark:text-white"> 
                  By checking you have read and agreed to the
                </Text>
                <TouchableOpacity
                  onPress={() => {}}
                >
                  <Text className="text-sm font-rubik text-black-300 ml-2  underline dark:text-white"> 
                    Terms & Conditions
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleContinueWithoutAccount}
              className="flex flex-row items-center justify-center mt-5"
            >
              <Text className="text-lg font-rubik text-black-400 underline dark:text-white"> 
                Continue without an account
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        
        <Toast />
      </SafeAreaView>
  );
};

export default Auth;
