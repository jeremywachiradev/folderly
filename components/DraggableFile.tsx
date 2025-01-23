import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { FileItem } from '@/lib/fileSystem';
import { getFileIcon, formatFileSize, formatDate } from '@/lib/utils';

interface DraggableFileProps {
  file: FileItem;
  isSelected: boolean;
  isSelectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onDragEnd: (destinationY: number) => void;
}

export default function DraggableFile({
  file,
  isSelected,
  isSelectionMode,
  onPress,
  onLongPress,
  onDragEnd,
}: DraggableFileProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      scale.value = withSpring(1.05);
      zIndex.value = 100;
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    },
    onEnd: (event) => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      zIndex.value = 1;
      runOnJS(onDragEnd)(event.absoluteY);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: zIndex.value,
  }));

  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  return (
    <PanGestureHandler onGestureEvent={gestureHandler} enabled={!isSelectionMode}>
      <AnimatedTouchable
        onPress={onPress}
        onLongPress={onLongPress}
        style={animatedStyle}
        className="bg-white dark:bg-zinc-800 rounded-lg p-4 mb-4 shadow-sm flex-row items-center"
      >
        {isSelectionMode && (
          <View className="mr-3">
            <Ionicons
              name={isSelected ? "checkbox" : "square-outline"}
              size={20}
              className="text-primary-500"
            />
          </View>
        )}

        {file.type.match(/^(jpg|jpeg|png|gif)$/i) ? (
          <Image
            source={{ uri: file.uri }}
            className="w-12 h-12 rounded"
            resizeMode="cover"
          />
        ) : (
          <View className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded justify-center items-center">
            <Ionicons
              name={getFileIcon(file.type)}
              size={24}
              className="text-primary-500"
            />
          </View>
        )}

        <View className="ml-4 flex-1">
          <Text className="text-base font-rubik-medium text-black-300 dark:text-white" numberOfLines={1}>
            {file.name}
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-xs font-rubik text-black-400 dark:text-zinc-400">
              {formatFileSize(file.size)}
            </Text>
            <Text className="text-xs font-rubik text-black-400 dark:text-zinc-400 mx-2">•</Text>
            <Text className="text-xs font-rubik text-black-400 dark:text-zinc-400">
              {formatDate(file.modificationTime)}
            </Text>
          </View>
        </View>

        {!isSelectionMode && (
          <Ionicons
            name="chevron-forward"
            size={20}
            className="text-black-400 dark:text-zinc-400"
          />
        )}
      </AnimatedTouchable>
    </PanGestureHandler>
  );
} 