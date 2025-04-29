import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

// Define theme types
export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: typeof MD3LightTheme | typeof MD3DarkTheme;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  
  // Initialize theme based on system
  const [theme, setTheme] = useState(
    systemColorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme
  );

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update theme when system theme or preference changes
  useEffect(() => {
    updateThemeBasedOnPreference(themePreference);
  }, [systemColorScheme, themePreference]);

  const loadThemePreference = async () => {
    try {
      const savedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedPreference) {
        setThemePreferenceState(savedPreference as ThemePreference);
      }
    } catch (error) {
      
    }
  };

  const setThemePreference = async (preference: ThemePreference) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
      setThemePreferenceState(preference);
    } catch (error) {
      
      throw error;
    }
  };

  const updateThemeBasedOnPreference = (preference: ThemePreference) => {
    let shouldUseDarkTheme: boolean;

    switch (preference) {
      case 'dark':
        shouldUseDarkTheme = true;
        break;
      case 'light':
        shouldUseDarkTheme = false;
        break;
      case 'system':
        shouldUseDarkTheme = systemColorScheme === 'dark';
        break;
      default:
        shouldUseDarkTheme = systemColorScheme === 'dark';
        break;
    }

    setTheme(shouldUseDarkTheme ? MD3DarkTheme : MD3LightTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themePreference,
        setThemePreference,
        isDarkMode: theme === MD3DarkTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 