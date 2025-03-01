import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './auth-provider';
import { showToast } from './notifications';

interface Settings {
  theme: 'light' | 'dark' | 'system';
  defaultView: 'list' | 'grid';
  sortBy: 'name' | 'date' | 'size';
  sortOrder: 'asc' | 'desc';
}

interface SettingsContextType {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: Settings = {
  theme: 'system',
  defaultView: 'list',
  sortBy: 'name',
  sortOrder: 'asc'
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isGuest } = useAuth();

  useEffect(() => {
    loadSettings();
  }, [user?.id]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Load from local storage
      const settingsJson = await AsyncStorage.getItem('settings');
      if (settingsJson) {
        const localSettings = { ...defaultSettings, ...JSON.parse(settingsJson) };
        setSettings(localSettings);
      }
    } catch (error) {
      
      showToast('error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      // Save to local storage
      await AsyncStorage.setItem('settings', JSON.stringify(newSettings));
    } catch (error) {
      
      throw error;
    }
  };

  const updateSettings = async (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    await saveSettings(newSettings);
    setSettings(newSettings);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setSettings,
        updateSettings,
        isLoading
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
} 