import React from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from '@/components/ui';
import { Header } from '@/components/ui';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-neutral-900">
      <Header
        title="Terms and Policies"
        showBack
        onBackPress={() => router.back()}
      />
      <ScrollView className="flex-1 p-6">
        <Text variant="h2" weight="bold" className="text-white mb-6">
          Terms of Service
        </Text>

        <View className="space-y-6">
          <Section
            title="1. Acceptance of Terms"
            content="By accessing and using Folderly, you agree to be bound by these Terms of Service and all applicable laws and regulations."
          />

          <Section
            title="2. Privacy Policy"
            content="Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information."
          />

          <Section
            title="3. User Accounts"
            content="You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account."
          />

          <Section
            title="4. File Management"
            content="While we strive to ensure the safety of your files, you are responsible for maintaining backups of your important data. We are not liable for any data loss."
          />

          <Section
            title="5. Acceptable Use"
            content="You agree not to use Folderly for any unlawful purpose or in any way that could damage, disable, or impair the service."
          />

          <Section
            title="6. Modifications"
            content="We reserve the right to modify these terms at any time. Continued use of Folderly after changes constitutes acceptance of the modified terms."
          />

          <Section
            title="7. Termination"
            content="We reserve the right to terminate or suspend access to Folderly at our sole discretion, without prior notice or liability."
          />

          <Section
            title="8. Contact"
            content="If you have any questions about these Terms, please contact us."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <View className="space-y-2">
      <Text variant="h4" weight="semibold" className="text-white">
        {title}
      </Text>
      <Text variant="body" className="text-neutral-300">
        {content}
      </Text>
    </View>
  );
} 