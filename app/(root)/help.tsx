import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme-provider';
import { Text, Card } from '@/components/ui';

type FAQItem = {
  question: string;
  answer: string;
};

export default function HelpScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [expandedFAQs, setExpandedFAQs] = useState<Set<number>>(new Set());

  const toggleFAQ = (index: number) => {
    const newExpanded = new Set(expandedFAQs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFAQs(newExpanded);
  };

  const faqItems: FAQItem[] = [
    {
      question: "What is Folderly?",
      answer: "Folderly is a file management app that helps you organize and access your media files from different apps like Telegram and WhatsApp. It allows you to create categories for different types of files and access them all in one place."
    },
    {
      question: "How do categories work?",
      answer: "Categories are collections of directories that you want to manage together. For example, the 'Telegram Media' category includes directories where Telegram stores images and videos. You can create custom categories for any directories you want to manage."
    },
    {
      question: "Why can't I see my files?",
      answer: "There could be several reasons:\n\n1. The directory path might be incorrect or might have changed due to app updates.\n\n2. The directory might be empty.\n\n3. You might not have granted the necessary permissions.\n\n4. The app that creates these files (like Telegram or WhatsApp) might store files differently on your device.\n\nTry using the 'Restore Default Categories' option in Settings to reset to the standard directories, or create a custom category with the correct path."
    },
    {
      question: "How do I add a custom directory?",
      answer: "Tap the '+' button on the home screen to create a new category. Give it a name and color, then tap 'Add Directory' to select the directories you want to include in this category."
    },
    {
      question: "Why does the app need storage permissions?",
      answer: "Folderly needs access to your device storage to read files from different directories and to save files to your chosen save directory. Without these permissions, the app won't be able to function properly."
    },
    {
      question: "How do I save files to my device?",
      answer: "Select one or more files, then tap the 'Save' button. If you haven't set a save directory yet, you'll be prompted to choose one. Files will be copied to this directory."
    },
    {
      question: "Can I restore the default categories if I delete them?",
      answer: "Yes! Go to Settings and tap 'Restore Default Categories'. This will recreate the default Telegram Media and WhatsApp Status categories."
    },
    {
      question: "Why are some directories not accessible?",
      answer: "Android's storage access restrictions may prevent access to certain directories. If you're having trouble accessing files, try granting additional permissions in your device settings or use the Storage Access Framework to select directories manually."
    }
  ];

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={isDarkMode ? '#ffffff' : '#000000'}
            />
          </TouchableOpacity>
          <Text variant="h4" weight="medium" className="text-neutral-900 dark:text-white">
            Help & FAQ
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1 p-4">
          {/* App Description */}
          <Card variant="elevated" className="mb-6">
            <View className="p-6">
              <Text variant="h4" weight="medium" className="mb-4 text-neutral-900 dark:text-white">
                About Folderly
              </Text>
              
              <Text className="text-neutral-700 dark:text-neutral-300 mb-4">
                Folderly helps you organize and access your media files from different apps in one place. 
                Create categories for your Telegram media, WhatsApp statuses, or any other directories you want to manage.
              </Text>
              
              <Text className="text-neutral-700 dark:text-neutral-300">
                For the best experience, make sure you've granted the necessary storage permissions and that the directories you're trying to access exist on your device.
              </Text>
            </View>
          </Card>

          {/* FAQ Section */}
          <Text variant="h4" weight="medium" className="mb-4 text-neutral-900 dark:text-white px-2">
            Frequently Asked Questions
          </Text>

          {faqItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              onPress={() => toggleFAQ(index)}
              className="mb-4"
            >
              <Card variant="elevated">
                <View className="p-4">
                  <View className="flex-row justify-between items-center">
                    <Text 
                      variant="body" 
                      weight="medium" 
                      className="flex-1 text-neutral-900 dark:text-white"
                    >
                      {item.question}
                    </Text>
                    <Ionicons 
                      name={expandedFAQs.has(index) ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={isDarkMode ? "#ffffff" : "#000000"} 
                    />
                  </View>
                  
                  {expandedFAQs.has(index) && (
                    <Text className="mt-4 text-neutral-700 dark:text-neutral-300">
                      {item.answer}
                    </Text>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))}

          {/* Troubleshooting Tips */}
          <Card variant="elevated" className="mt-2 mb-6">
            <View className="p-6">
              <Text variant="h4" weight="medium" className="mb-4 text-neutral-900 dark:text-white">
                Troubleshooting Tips
              </Text>
              
              <View className="space-y-4">
                <Text className="text-neutral-700 dark:text-neutral-300">
                  • If you can't see files, check if the directory exists and contains files.
                </Text>
                <Text className="text-neutral-700 dark:text-neutral-300">
                  • Make sure you've granted all necessary permissions.
                </Text>
                <Text className="text-neutral-700 dark:text-neutral-300">
                  • Try restarting the app if you encounter any issues.
                </Text>
                <Text className="text-neutral-700 dark:text-neutral-300">
                  • Use the "Restore Default Categories" option in Settings if you're unsure about the correct paths.
                </Text>
                <Text className="text-neutral-700 dark:text-neutral-300">
                  • Different device manufacturers may store app data in different locations. You might need to create custom categories with the correct paths for your device.
                </Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
} 