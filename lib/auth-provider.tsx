import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ID, type Models } from 'appwrite';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { account, avatars } from './appwrite';
import { initializeUserConfig } from './config-sync';
import { showToast } from './notifications';
import { createCategory, getCategories, Category } from './categoryManager';
import { pathToSafUri } from './androidDirectories';

const CATEGORIES_STORAGE_KEY = '@folderly/categories';

interface User {
  id: string;
  $id?: string;
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
          
          await signOut();
          return;
        }

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
        
        // Create default categories if needed
        await createDefaultCategoriesIfNeeded(userData.id);

        setUser(userData);
        setIsGuest(false);
        
        // Store last successful auth timestamp
        await AsyncStorage.setItem('last_successful_auth', Date.now().toString());
      } catch (sessionError) {
        
        await cleanupUserData();
      }
    } catch (error) {
      
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
      
    }
  };

  // Function to create default categories if they don't exist
  const createDefaultCategoriesIfNeeded = async (userId: string) => {
    try {
      // Check if categories already exist
      const existingCategories = await getCategories();
      
      // If user already has categories, don't create default ones
      if (existingCategories.length > 0) {
        
        return;
      }
      
      // Check if this is the first login for the user
      const isFirstLogin = await AsyncStorage.getItem(`first_login_${userId}`) === null;
      
      // Only proceed if it's the first login or there are no categories
      if (!isFirstLogin && existingCategories.length > 0) {
        
        return;
      }
      
      
      
      // Create Telegram category
      await createCategory(
        'Telegram Media',
        '#0088cc', // Telegram blue
        [
          { 
            name: 'Telegram Images', 
            path: '/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Images',
            uri: pathToSafUri('/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Images'),
            type: 'default',
            validated: true
          },
          { 
            name: 'Telegram Video', 
            path: '/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Video',
            uri: pathToSafUri('/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Video'),
            type: 'default',
            validated: true
          }
        ],
        userId
      );
      
      
      // Create WhatsApp category
      await createCategory(
        'WhatsApp Status',
        '#25D366', // WhatsApp green
        [
          { 
            name: 'WhatsApp Statuses', 
            path: '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses',
            uri: pathToSafUri('/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses'),
            type: 'default',
            validated: true
          }
        ],
        userId
      );
      
      
      // Store both as default categories
      await AsyncStorage.setItem('defaultCategories', JSON.stringify(['telegram', 'whatsapp']));
      
      // Mark that this user has had their first login
      await AsyncStorage.setItem(`first_login_${userId}`, 'true');
      
      // Get the newly created categories to get their IDs
      const newCategories = await getCategories();
      
      // Update selected categories to include all default categories
      const selectedCategoryIds = newCategories.map(cat => cat.id);
      await AsyncStorage.setItem('@folderly/selected_categories', JSON.stringify(selectedCategoryIds));
      
    } catch (error) {
      
      // Don't throw error, just log it
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
      
      // Create default categories if needed
      await createDefaultCategoriesIfNeeded(userData.id);

      setUser(userData);
    } catch (error) {
      
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      
      
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
      
      // Create default categories if needed
      await createDefaultCategoriesIfNeeded(userData.id);

      setUser(userData);

      // Store last successful auth timestamp
      await AsyncStorage.setItem('last_successful_auth', Date.now().toString());
      
    } catch (error) {
      
      if (error instanceof Error) {
        
      }
      await cleanupUserData();
      throw new Error('Failed to complete Google sign-in. Please try again.');
    }
  };

  const handleOAuthCallback = async (response: any) => {
    try {
      
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const session = await account.get();
      
      
      const compatibleUserId = await generateCompatibleUserId(session.$id);
      
      
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
      
      

      // Initialize user config in Appwrite
      await initializeUserConfig(compatibleUserId);
      
      // Create default categories if needed
      await createDefaultCategoriesIfNeeded(compatibleUserId);
    } catch (error) {
      
      if (error instanceof Error) {
        
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
      
      // Create default categories for guest user - always create for guest users
      await createDefaultCategoriesForGuest(guestId);
      
      // Backup guest categories for future guest sessions
      const updatedCategories = await getCategories();
      await AsyncStorage.setItem('guest_categories', JSON.stringify(updatedCategories));
      
      
    } catch (error) {
      
      // Reset states on error
      setIsGuest(false);
      setUser(null);
      await AsyncStorage.removeItem('guestMode');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to create default categories specifically for guest users
  const createDefaultCategoriesForGuest = async (guestId: string) => {
    try {
      // Check if categories already exist
      const existingCategories = await getCategories();
      
      // For guest users, we always want to ensure they have the default categories
      // Create Telegram category if it doesn't exist
      const hasTelegram = existingCategories.some(cat => 
        cat.name.toLowerCase().includes('telegram')
      );
      
      if (!hasTelegram) {
        // Create a local-only category for guest users
        const newCategory: Category = {
          id: `telegram_${Date.now().toString()}`,
          name: 'Telegram Media',
          color: '#0088cc', // Telegram blue
          directories: [
            { 
              name: 'Telegram Images', 
              path: '/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Images',
              uri: pathToSafUri('/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Images'),
              type: 'default',
              validated: true
            },
            { 
              name: 'Telegram Video', 
              path: '/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Video',
              uri: pathToSafUri('/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Video'),
              type: 'default',
              validated: true
            }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isChecked: true // Set checked by default for guest users
        };
        
        // Save locally only
        const categories = await getCategories();
        await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify([...categories, newCategory]));
      }
      
      // Create WhatsApp category if it doesn't exist
      const hasWhatsApp = existingCategories.some(cat => 
        cat.name.toLowerCase().includes('whatsapp')
      );
      
      if (!hasWhatsApp) {
        // Create a local-only category for guest users
        const newCategory: Category = {
          id: `whatsapp_${Date.now().toString()}`,
          name: 'WhatsApp Status',
          color: '#25D366', // WhatsApp green
          directories: [
            { 
              name: 'WhatsApp Statuses', 
              path: '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses',
              uri: pathToSafUri('/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses'),
              type: 'default',
              validated: true
            }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isChecked: true // Set checked by default for guest users
        };
        
        // Save locally only
        const categories = await getCategories();
        await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify([...categories, newCategory]));
      }
      
      // Store default categories for future reference
      await AsyncStorage.setItem('defaultCategories', JSON.stringify(['telegram', 'whatsapp']));
      
      // Get the newly created categories to get their IDs
      const allCategories = await getCategories();
      
      // Update selected categories to include all default categories
      const selectedCategoryIds = allCategories.map(cat => cat.id);
      await AsyncStorage.setItem('@folderly/selected_categories', JSON.stringify(selectedCategoryIds));
      
    } catch (error) {
      
      // Don't throw error, just log it
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      
      // If in guest mode, backup categories before signing out
      if (isGuest) {
        const currentCategories = await getCategories();
        await AsyncStorage.setItem('guest_categories', JSON.stringify(currentCategories));
        
      }
      
      // Delete all sessions instead of just current
      try {
        const sessions = await account.listSessions();
        await Promise.all(
          sessions.sessions.map(session => 
            account.deleteSession(session.$id)
          )
        );
      } catch (error) {
        
        // Continue with cleanup even if session deletion fails
      }
      
      await cleanupUserData();
      
      
    } catch (error) {
      
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