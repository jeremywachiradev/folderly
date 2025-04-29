import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { Appearance } from 'react-native';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

interface GlobalContextType {
  theme: typeof MD3LightTheme | typeof MD3DarkTheme;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider = ({ children }: GlobalProviderProps) => {
  const [theme, setTheme] = useState(Appearance.getColorScheme() === 'dark' ? MD3DarkTheme : MD3LightTheme);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setTheme(colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme);
    });

    // Cleanup subscription on unmount
    return () => {
      if (subscription?.remove) {
        subscription.remove();
      }
    };
  }, []);

  return (
    <GlobalContext.Provider
      value={{
        theme,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = (): GlobalContextType => {
  const context = useContext(GlobalContext);
  if (!context)
    throw new Error("useGlobalContext must be used within a GlobalProvider");

  return context;
};

export default GlobalProvider;
