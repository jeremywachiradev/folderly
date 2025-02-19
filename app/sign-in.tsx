import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { Text } from '@/components/ui';
import { useAuth } from '@/lib/auth-provider';
import { useTheme } from '@/lib/theme-provider';
import { Ionicons } from '@expo/vector-icons';

// Initialize WebBrowser and enable Google sign-in
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const { userId, secret } = useLocalSearchParams();
  const { signInWithGoogle, handleOAuthCallback, setGuestMode, user, isGuest, isLoading } = useAuth();
  const { isDarkMode } = useTheme();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Handle navigation after authentication
  useEffect(() => {
    const navigate = async () => {
      if (!isLoading && !isAuthenticating && (user || isGuest) && !hasNavigated) {
        setHasNavigated(true);
        try {
          await router.replace('/(tabs)');
        } catch (error) {
          console.error('Navigation error:', error);
          // Reset navigation state if navigation fails
          setHasNavigated(false);
        }
      }
    };
    navigate();
  }, [user, isGuest, isLoading, isAuthenticating, hasNavigated]);

  // Handle the OAuth callback
  useEffect(() => {
    if (!isLoading && userId && secret) {
      console.log('Received OAuth callback params:', { userId, secret });
      handleOAuthCallback({ userId, secret }).then(() => {
        console.log('OAuth callback handled successfully');
      }).catch((error) => {
        console.error('Error handling OAuth callback:', error);
        alert('Failed to complete sign in. Please try again.');
      });
    }
  }, [userId, secret, isLoading]);

  const handleGoogleSignIn = async () => {
    if (!agreedToTerms) {
      alert("Please agree to the terms and policies to continue");
      return;
    }
    
    try {
      setIsAuthenticating(true);
      console.log('Starting Google sign-in...');
      await signInWithGoogle();
      console.log('Google sign-in completed successfully');
    } catch (e) {
      console.error("Error in handleGoogleSignIn:", e);
      if (e instanceof Error) {
        console.error('Error details:', e.message);
      }
      alert('Failed to start sign in. Please try again.');
      setIsAuthenticating(false);
    }
  };

  const handleContinueAsGuest = async () => {
    if (isAuthenticating) return;
    
    try {
      setIsAuthenticating(true);
      console.log('Setting guest mode...');
      await setGuestMode();
      console.log('Guest mode set successfully');
      
      // Reset authenticating state after guest mode is set
      setIsAuthenticating(false);
    } catch (error) {
      console.error("Error in handleContinueAsGuest:", error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      alert('Failed to continue as guest. Please try again.');
      setIsAuthenticating(false);
    }
  };

  // Prevent rendering if already authenticated and navigated
  if (hasNavigated) {
    return null;
  }

  // Show loading state
  if (isLoading || isAuthenticating) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0077ff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
      <View className="flex-1 justify-center items-center p-8">
        <Image
          source={require("@/assets/images/splash.png")}
          className="w-80 h-80 mb-8"
          resizeMode="contain"
        />

        <Text
          variant="h1"
          weight="bold"
          className="text-center mb-4 text-neutral-900 dark:text-white"
        >
          Sign in to Folderly
        </Text>

        <Text
          variant="body"
          className="text-center mb-12 text-neutral-600 dark:text-neutral-300"
        >
          Access your files and settings across all your devices
        </Text>

        {/* Terms Agreement */}
        <TouchableOpacity 
          onPress={() => setAgreedToTerms(!agreedToTerms)}
          className="flex-row items-center mb-6 space-x-2"
        >
          <View className={`w-5 h-5 rounded border ${agreedToTerms ? 'bg-primary-500 border-primary-500' : isDarkMode ? 'border-neutral-400' : 'border-neutral-500'} items-center justify-center`}>
            {agreedToTerms && <Ionicons name="checkmark" size={16} color="white" />}
          </View>
          <View className="flex-row flex-wrap mx-4">
            <Text className="text-neutral-600 dark:text-neutral-300">I agree to the </Text>
            <TouchableOpacity onPress={() => router.push('/terms')}>
              <Text className="text-primary-500 underline">Terms and Policies</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Google Sign In Button */}
        <TouchableOpacity
          onPress={handleGoogleSignIn}
          className="bg-primary-600 active:bg-primary-700 rounded-lg w-full py-4 shadow-lg"
        >
          <View className="flex-row justify-center items-center space-x-4">
            <Image
              source={require("@/assets/icons/google.png")}
              className="w-6 h-6 mx-4"
              resizeMode="contain"
            />
            <Text
              variant="body"
              weight="semibold"
              className="text-white"
            >
              Continue with Google
            </Text>
          </View>
        </TouchableOpacity>

        {/* Continue as Guest Link */}
        <TouchableOpacity 
          onPress={handleContinueAsGuest}
          className="mt-16"
        >
          <Text className="text-neutral-500 dark:text-neutral-400 underline">
            Continue without an account
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
