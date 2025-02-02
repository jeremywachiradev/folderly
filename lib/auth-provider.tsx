import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Client, ID, type OAuthProvider } from 'appwrite';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

interface User {
  email: string;
  id: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  handleOAuthCallback: (response: any) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
  setGuestMode: () => void;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const generateCompatibleUserId = async (originalId: string): Promise<string> => {
  // Create a hash of the original ID
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    originalId
  );
  // Take first 32 chars and add a prefix to ensure it starts with a letter
  return `u${hash.slice(0, 31)}`;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setIsLoading(true);
      // Clear any existing guest mode on app start
      await AsyncStorage.removeItem('guestMode');
      
      try {
        const session = await account.get();
        setUser({
          email: session.email,
          id: session.$id,
          name: session.name,
        });
        setIsGuest(false);
      } catch (sessionError) {
        setIsGuest(false);
        setUser(null);
      }
    } catch (error) {
      console.log('Error checking session:', error);
      setIsGuest(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await account.createSession(email, password);
      const session = await account.get();
      setUser({
        email: session.email,
        id: session.$id,
        name: session.name,
      });
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google sign-in process...');
      
      // Different callback URLs for different platforms
      const successUrl = Platform.select({
        ios: 'folderly://callback',
        android: 'folderly://callback',
        default: 'folderly://callback',
      });

      const failureUrl = Platform.select({
        ios: 'folderly://failure',
        android: 'folderly://failure',
        default: 'folderly://failure',
      });

      console.log('Creating OAuth session with URLs:', { successUrl, failureUrl });

      // Get the OAuth URL from Appwrite
      const oauthUrl = `${process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT}/account/sessions/oauth2/google?` +
        new URLSearchParams({
          project: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
          success: successUrl!,
          failure: failureUrl!
        }).toString();

      console.log('Opening OAuth URL:', oauthUrl);

      // Open the OAuth URL in the browser
      const result = await WebBrowser.openAuthSessionAsync(
        oauthUrl,
        successUrl!
      );

      console.log('Auth session result:', result);

      if (result.type === 'success') {
        // The user has been redirected back to the app
        // The session will be automatically created by Appwrite
        await new Promise(resolve => setTimeout(resolve, 1000));
        const session = await account.get();
        setUser({
          email: session.email,
          id: session.$id,
          name: session.name,
        });
      } else {
        throw new Error('Authentication was cancelled');
      }
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      throw new Error('Failed to start Google sign-in. Please try again.');
    }
  };

  const handleOAuthCallback = async (response: any) => {
    try {
      console.log('Handling OAuth callback with response:', response);
      
      // Wait a bit to ensure the session is properly created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const session = await account.get();
      console.log('Got user session:', session);
      
      const compatibleUserId = await generateCompatibleUserId(session.$id);
      console.log('Generated compatible user ID:', compatibleUserId);
      
      await account.updatePrefs({
        originalUserId: session.$id,
      });

      setUser({
        email: session.email,
        id: compatibleUserId,
        name: session.name,
      });
      
      console.log('Successfully set user in state');
    } catch (error) {
      console.error('Error in handleOAuthCallback:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      throw error;
    }
  };

  const setGuestMode = async () => {
    try {
      setIsLoading(true);
      // Generate a temporary guest ID
      const guestId = `guest_${Date.now()}`;
      
      // First clear any existing state
      await AsyncStorage.removeItem('guestMode');
      setUser(null);
      
      // Then set the new guest state
      await AsyncStorage.setItem('guestMode', guestId);
      setIsGuest(true);
      
      // Set a minimal user object for guest mode
      setUser({
        id: guestId,
        email: 'guest@local',
        name: 'Guest User'
      });
    } catch (error) {
      console.error('Error setting guest mode:', error);
      // Reset state on error
      setIsGuest(false);
      setUser(null);
      await AsyncStorage.removeItem('guestMode');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await AsyncStorage.removeItem('guestMode');
      setIsGuest(false);
      try {
        await account.deleteSession('current');
      } catch (e) {
        // Ignore error if no session exists
      }
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        signIn, 
        signInWithGoogle, 
        handleOAuthCallback, 
        signOut, 
        isLoading,
        setGuestMode,
        isGuest
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 