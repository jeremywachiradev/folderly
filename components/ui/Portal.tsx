import React from 'react';
import { View } from 'react-native';
import { Portal as RNPPortal } from '@gorhom/portal';

interface PortalProps {
  children: React.ReactNode;
}

export function Portal({ children }: PortalProps) {
  return (
    <RNPPortal>
      {children}
    </RNPPortal>
  );
} 