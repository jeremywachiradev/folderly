import React from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '@/lib/theme-provider';
import { Text } from './Text';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'horizontal' | 'vertical' | 'icon';
  showText?: boolean;
}

export function Logo({ 
  size = 'md',
  variant = 'horizontal',
  showText = true,
}: LogoProps) {
  const { isDarkMode } = useTheme();

  const getLogoSize = (): number => {
    switch (size) {
      case 'sm':
        return 24;
      case 'lg':
        return 48;
      default:
        return 32;
    }
  };

  const getTextSize = (): 'h4' | 'h3' | 'h2' => {
    switch (size) {
      case 'sm':
        return 'h4';
      case 'lg':
        return 'h2';
      default:
        return 'h3';
    }
  };

  const logoSize = getLogoSize();

  return (
    <View 
      className={`
        flex items-center
        ${variant === 'horizontal' ? 'flex-row' : 'flex-col'}
        ${variant === 'horizontal' ? 'space-x-2' : 'space-y-2'}
      `}
    >
      <Image
        source={isDarkMode ? require('@/assets/images/logo-dark.png') : require('@/assets/images/logo-light.png')}
        style={{ width: logoSize, height: logoSize }}
        resizeMode="contain"
      />
      {showText && variant !== 'icon' && (
        <Text
          variant={getTextSize()}
          weight="bold"
          className="text-neutral-900 dark:text-white"
        >
          Folderly
        </Text>
      )}
    </View>
  );
} 