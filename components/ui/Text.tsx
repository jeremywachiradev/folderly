import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'body-sm' | 'caption';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  children: React.ReactNode;
}

export function Text({
  variant = 'body',
  weight = 'regular',
  color,
  children,
  className = '',
  ...props
}: TextProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'h1':
        return 'text-4xl leading-tight';
      case 'h2':
        return 'text-3xl leading-tight';
      case 'h3':
        return 'text-2xl leading-snug';
      case 'h4':
        return 'text-xl leading-snug';
      case 'body-sm':
        return 'text-sm leading-normal';
      case 'caption':
        return 'text-xs leading-normal';
      default:
        return 'text-base leading-relaxed';
    }
  };

  const getWeightClasses = () => {
    switch (weight) {
      case 'medium':
        return 'font-rubik-medium';
      case 'semibold':
        return 'font-rubik-semibold';
      case 'bold':
        return 'font-rubik-bold';
      case 'extrabold':
        return 'font-rubik-extrabold';
      default:
        return 'font-rubik';
    }
  };

  const getColorClasses = () => {
    if (!color) return 'text-neutral-900 dark:text-neutral-100';

    switch (color) {
      case 'primary':
        return 'text-primary-700 dark:text-primary-300';
      case 'secondary':
        return 'text-accent-700 dark:text-accent-300';
      case 'success':
        return 'text-success-700 dark:text-success-300';
      case 'error':
        return 'text-error-700 dark:text-error-300';
      case 'warning':
        return 'text-warning-700 dark:text-warning-300';
      default:
        return '';
    }
  };

  return (
    <RNText
      className={`
        ${getVariantClasses()}
        ${getWeightClasses()}
        ${getColorClasses()}
        ${className}
      `}
      {...props}
    >
      {children}
    </RNText>
  );
} 