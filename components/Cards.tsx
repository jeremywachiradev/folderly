// components/Cards.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Asset, MediaType } from 'expo-media-library';
import { useTheme } from 'react-native-paper';

interface CardProps {
  item: Asset;
  onPress: (uri: string) => void;
  isFolder?: boolean; // Make isFolder optional
}

const Card: React.FC<CardProps> = ({ item, onPress, isFolder = false }) => { // Provide default value for isFolder
  const theme = useTheme();
  return (
    <Pressable style={styles.card} onPress={() => onPress(item.uri)} android_ripple={{ color: theme.colors.primary['100'] }}>
      <Image
        style={styles.thumbnail}
        source={{ uri: item.uri }}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.colors.text }]}>{item.filename}</Text>
        {isFolder && <Text style={[styles.folderTag, { color: theme.colors.primary['300'] }]}>Folder</Text>}
      </View>
    </Pressable>
  );
};

export default Card;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 150,
  },
  info: {
    padding: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',

  },
  folderTag: {
    marginTop: 4,
    fontSize: 14,

  },
});
