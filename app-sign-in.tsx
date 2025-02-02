import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-provider';

const SignIn: React.FC = () => {
  const router = useRouter();
  const { user, isGuest, isLoading, handleOAuthCallback } = useAuth();
  const [userId, setUserId] = React.useState('');
  const [secret, setSecret] = React.useState('');
  const [hasNavigated, setHasNavigated] = React.useState(false);

  // Handle navigation after authentication
  useEffect(() => {
    if (!isLoading && (user || isGuest) && !hasNavigated) {
      console.log('Navigating to home screen...');
      setHasNavigated(true);
      router.replace('/(root)/(tabs)');
    }
  }, [user, isGuest, isLoading, hasNavigated]);

  // Handle the OAuth callback
  useEffect(() => {
    if (!isLoading && userId && secret) {
      console.log('Received OAuth callback params:', { userId, secret });
      handleOAuthCallback({ userId, secret }).then(() => {
        console.log('OAuth callback handled successfully');
      }).catch((error) => {
        console.error('Error handling OAuth callback:', error);
        alert('Failed to complete sign in. Please try again.');
      });
    }
  }, [userId, secret, isLoading]);

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default SignIn; 