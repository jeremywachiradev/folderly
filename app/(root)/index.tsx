import { Redirect } from 'expo-router';

export default function RootIndex() {
  // Redirect to the tabs screen
  return <Redirect href="/(tabs)" />;
} 