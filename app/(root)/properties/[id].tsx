import React from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

const Property = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const windowHeight = Dimensions.get("window").height;

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="relative w-full" style={{ height: windowHeight / 2 }}>
          <View
            className="z-50 absolute inset-x-7"
            style={{
              top: Platform.OS === "ios" ? 70 : 20,
            }}
          >
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-white/90 rounded-full w-11 h-11 items-center justify-center"
              >
                <Ionicons name="arrow-back" size={24} color="#191D31" />
              </TouchableOpacity>

              <View className="flex-row items-center space-x-4">
                <TouchableOpacity
                  className="bg-white/90 rounded-full w-11 h-11 items-center justify-center"
                >
                  <Ionicons name="heart-outline" size={24} color="#191D31" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-white/90 rounded-full w-11 h-11 items-center justify-center"
                >
                  <Ionicons name="share-outline" size={24} color="#191D31" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View className="p-5">
          <Text className="text-2xl font-bold text-gray-900">
            Property ID: {id}
          </Text>
          <Text className="mt-2 text-gray-600">
            This is a placeholder for the property details view.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default Property;
