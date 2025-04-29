import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '@/lib/theme-provider';

interface CardProps extends ViewProps {
  variant?: 'elevated' | 'filled' | 'outlined';
  children: React.ReactNode;
}

export function Card({
  variant = 'elevated',
  children,
  className = '',
  style,
  ...props
}: CardProps) {
  const { isDarkMode } = useTheme();

  const getVariantClasses = () => {
    switch (variant) {
      case 'elevated':
        return `bg-white dark:bg-neutral-800 shadow-lg ${
          isDarkMode ? 'shadow-neutral-900/50' : 'shadow-neutral-200/50'
        } rounded-xl`;
      case 'filled':
        return 'bg-neutral-100 dark:bg-neutral-800 rounded-xl';
      case 'outlined':
        return 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl';
      default:
        return '';
    }
  };

  return (
    <View
      className={`
        ${getVariantClasses()}
        ${className}
      `}
      style={[
        variant === 'elevated' && {
          shadowColor: isDarkMode ? '#000000' : '#64748b',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDarkMode ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 4,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
} 