import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-provider';
import { Text } from './Text';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const { isDarkMode } = useTheme();

  const getVariantClasses = () => {
    if (disabled) {
      return 'bg-neutral-200 dark:bg-neutral-800';
    }

    switch (variant) {
      case 'primary':
        return 'bg-primary-600 active:bg-primary-700 dark:bg-primary-500 dark:active:bg-primary-600';
      case 'outline':
        return 'bg-transparent border border-neutral-300 dark:border-neutral-700 active:bg-neutral-100 dark:active:bg-neutral-800';
      case 'danger':
        return 'bg-error-600 active:bg-error-700 dark:bg-error-500 dark:active:bg-error-600';
      default:
        return '';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-4 py-2 rounded-lg';
      case 'lg':
        return 'px-6 py-4 rounded-xl';
      default:
        return 'px-5 py-3 rounded-lg';
    }
  };

  const getTextColor = () => {
    if (disabled) {
      return 'text-neutral-500 dark:text-neutral-400';
    }

    switch (variant) {
      case 'primary':
      case 'danger':
        return 'text-white';
      case 'outline':
        return 'text-neutral-900 dark:text-white';
      default:
        return '';
    }
  };

  const getIconColor = () => {
    if (disabled) {
      return isDarkMode ? '#64748b' : '#94a3b8';
    }

    switch (variant) {
      case 'primary':
      case 'danger':
        return '#ffffff';
      case 'outline':
        return isDarkMode ? '#f1f5f9' : '#0f172a';
      default:
        return '';
    }
  };

  return (
    <TouchableOpacity
      className={`
        flex-row items-center justify-center
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
          color={getIconColor()}
          style={{ marginRight: 8 }}
        />
      )}
      <Text
        variant={size === 'sm' ? 'body-sm' : 'body'}
        weight="semibold"
        className={getTextColor()}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
} 