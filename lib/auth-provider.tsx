import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ID, type Models } from 'appwrite';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { account, avatars } from './appwrite';
import { initializeUserConfig, deleteUserCategories } from './config-sync';

const CATEGORIES_STORAGE_KEY = '@folderly/categories';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
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
      await AsyncStorage.removeItem('guestMode');
      
      try {
        const session = await account.get();
        
        // Check if session is valid
        try {
          await account.getSession('current');
        } catch (sessionError) {
          console.log('Session expired, cleaning up...');
          await signOut();
          return;
        }

        const userAvatar = session.name ? avatars.getInitials(session.name) : undefined;
        
        setUser({
          id: session.$id,
          email: session.email,
          name: session.name,
          avatar: userAvatar?.toString(),
          createdAt: session.$createdAt,
          updatedAt: session.$updatedAt,
        });
        setIsGuest(false);
      } catch (sessionError) {
        console.log('No active session found:', sessionError);
        await cleanupUserData();
      }
    } catch (error) {
      console.log('Error checking session:', error);
      await cleanupUserData();
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to clean up user data
  const cleanupUserData = async () => {
    try {
      setIsGuest(false);
      setUser(null);
      await AsyncStorage.removeItem('guestMode');
      
      // Don't remove categories storage on logout, as we want to preserve cloud data
      await AsyncStorage.multiRemove([
        'user_preferences',
        'last_session',
        'auth_state',
        'guest_categories' // Remove guest categories when logging out
      ]);
    } catch (error) {
      console.error('Error cleaning up user data:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await account.createSession(email, password);
      const session = await account.get();
      const userAvatar = session.name ? avatars.getInitials(session.name) : undefined;

      const userData = {
        id: session.$id,
        email: session.email,
        name: session.name,
        avatar: userAvatar?.toString(),
        createdAt: session.$createdAt,
        updatedAt: session.$updatedAt,
      };

      // Initialize user config in Appwrite
      await initializeUserConfig(userData.id);

      setUser(userData);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google sign-in process...');
      
      // Clean up any existing sessions before starting new auth
      await cleanupUserData();
      
      const redirectUri = Linking.createURL("/");
      
      const response = await account.createOAuth2Token(
        'google' as any,
        redirectUri,
        redirectUri
      );
      
      if (!response) throw new Error("Create OAuth2 token failed");

      const browserResult = await WebBrowser.openAuthSessionAsync(
        response.toString(),
        redirectUri,
        {
          showInRecents: false,
          preferEphemeralSession: true
        }
      );

      if (browserResult.type !== "success") {
        throw new Error("Authentication was cancelled");
      }

      const url = new URL(browserResult.url);
      const secret = url.searchParams.get("secret")?.toString();
      const userId = url.searchParams.get("userId")?.toString();
      
      if (!secret || !userId) {
        throw new Error("Missing authentication parameters");
      }

      // Create session with rate limiting
      let retries = 0;
      const maxRetries = 3;
      let session;

      while (retries < maxRetries) {
        try {
          session = await account.createSession(userId, secret);
          break;
        } catch (error) {
          retries++;
          if (retries === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }

      if (!session) throw new Error("Failed to create session");

      // Get user details after successful session creation
      const userSession = await account.get();
      
      // Verify email is present and verified
      if (!userSession.email) {
        await signOut();
        throw new Error("Email is required for authentication");
      }

      const userAvatar = userSession.name ? avatars.getInitials(userSession.name) : undefined;

      const userData = {
        id: userSession.$id,
        email: userSession.email,
        name: userSession.name,
        avatar: userAvatar?.toString(),
        createdAt: userSession.$createdAt,
        updatedAt: userSession.$updatedAt,
      };

      // Initialize user config in Appwrite
      await initializeUserConfig(userData.id);

      setUser(userData);

      // Store last successful auth timestamp
      await AsyncStorage.setItem('last_successful_auth', Date.now().toString());
      
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      await cleanupUserData();
      throw new Error('Failed to complete Google sign-in. Please try again.');
    }
  };

  const handleOAuthCallback = async (response: any) => {
    try {
      console.log('Handling OAuth callback with response:', response);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const session = await account.get();
      console.log('Got user session:', session);
      
      const compatibleUserId = await generateCompatibleUserId(session.$id);
      console.log('Generated compatible user ID:', compatibleUserId);
      
      await account.updatePrefs({
        originalUserId: session.$id,
      });

      const userAvatar = session.name ? avatars.getInitials(session.name) : undefined;

      setUser({
        id: compatibleUserId,
        email: session.email,
        name: session.name,
        avatar: userAvatar?.toString(),
        createdAt: session.$createdAt,
        updatedAt: session.$updatedAt,
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
      
      // Clean up any existing session first
      await cleanupUserData();
      
      // Create a temporary guest user
      const guestId = `guest_${Date.now()}`;
      const guestUser = {
        id: guestId,
        email: 'guest@folderly.app',
        name: 'Guest User',
      };

      // Set guest mode in storage
      await AsyncStorage.setItem('guestMode', 'true');
      
      // Initialize guest categories from backup if exists
      const guestCategories = await AsyncStorage.getItem('guest_categories');
      if (guestCategories) {
        await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, guestCategories);
      } else {
        await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, '[]');
      }

      // Update states with a small delay to ensure proper order
      await new Promise<void>(resolve => {
        setTimeout(() => {
          setUser(guestUser);
          setIsGuest(true);
          resolve();
        }, 100);
      });
      
      console.log('Guest mode setup completed');
    } catch (error) {
      console.error('Error setting guest mode:', error);
      // Reset states on error
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
      
      // Delete all sessions instead of just current
      try {
        const sessions = await account.listSessions();
        await Promise.all(
          sessions.sessions.map(session => 
            account.deleteSession(session.$id)
          )
        );
      } catch (e) {
        console.log('No sessions to delete');
      }

      await cleanupUserData();
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