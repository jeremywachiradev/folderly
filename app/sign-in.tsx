import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { Text } from '@/components/ui';
import { useAuth } from '@/lib/auth-provider';
import { Ionicons } from '@expo/vector-icons';

// Initialize WebBrowser and enable Google sign-in
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const { userId, secret } = useLocalSearchParams();
  const { signInWithGoogle, handleOAuthCallback, setGuestMode, user, isGuest, isLoading } = useAuth();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Handle navigation after authentication
  useEffect(() => {
    const navigate = async () => {
      if (!isLoading && !isAuthenticating && (user || isGuest) && !hasNavigated) {
        setHasNavigated(true);
        await router.replace('/(root)/(tabs)');
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

  // Show loading state
  if (isLoading || isAuthenticating) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-900">
        <View className="flex-1 justify-center items-center">
          <Text className="text-white">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-900">
      <View className="flex-1 justify-center items-center p-8">
        <View className="w-64 h-64 mb-8 bg-white/10 rounded-3xl items-center justify-center">
          <Image
            source={require("@/assets/images/splash.png")}
            className="w-56 h-56"
            resizeMode="contain"
          />
        </View>

        <Text
          variant="h1"
          weight="bold"
          className="text-center mb-4 text-white"
        >
          Sign in to Folderly
        </Text>

        <Text
          variant="body"
          className="text-center mb-12 text-neutral-300"
        >
          Access your files and settings across all your devices
        </Text>

        {/* Terms Agreement */}
        <TouchableOpacity 
          onPress={() => setAgreedToTerms(!agreedToTerms)}
          className="flex-row items-center mb-6 space-x-2"
        >
          <View className={`w-5 h-5 rounded border ${agreedToTerms ? 'bg-primary-500 border-primary-500' : 'border-neutral-400'} items-center justify-center`}>
            {agreedToTerms && <Ionicons name="checkmark" size={16} color="white" />}
          </View>
          <View className="flex-row flex-wrap mx-4 ">
            <Text className="text-neutral-300">I agree to the </Text>
            <TouchableOpacity onPress={() => router.push('/terms')}>
              <Text className="text-primary-500 underline">Terms and Policies</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Google Sign In Button */}
        <TouchableOpacity
          onPress={handleGoogleSignIn}
          className="bg-primary-600 active:bg-primary-600 rounded-lg w-full py-4 shadow-lg"
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
          <Text className="text-neutral-400 underline">
            Continue without an account
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
