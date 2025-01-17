import {
  Alert,
  Image,
  ImageSourcePropType,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { logout } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";

import { settings } from "@/constants/data";

interface SettingsItemProp {
  icon: React.ComponentType<any> | ImageSourcePropType; 
  iconName?: string; 
  title: string;
  onPress?: () => void;
  textStyle?: object; // Use object type for style
  showArrow?: boolean;
}

const SettingsItem = ({
  icon: Icon,
  iconName, 
  title,
  onPress,
  textStyle,
  showArrow = true,
}: SettingsItemProp) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex flex-row items-center justify-between py-3"
  >
    <View className="flex flex-row items-center gap-3">
      {typeof Icon === 'function' ? ( // Check if Icon is a function (component)
        <Icon name={iconName} size={24} color="black" /> 
      ) : (
        <Image source={Icon} style={{ width: 24, height: 24 }} /> // Ensure Image source is correctly used
      )}
      <Text style={{ fontSize: 16, fontFamily: 'Rubik-Medium', color: textStyle }}>
        {title}
      </Text>
    </View>

    {showArrow && (
      <MaterialIcons name="keyboard-arrow-right" size={24} color="black" />
    )}
  </TouchableOpacity>
);


const Profile = () => {
  const { user, refetch } = useGlobalContext();
  const { colors } = useTheme();

  const handleLogout = async () => {
    const result = await logout();
    if (result) {
      Alert.alert("Success", "Logged out successfully");
      refetch();
    } else {
      Alert.alert("Error", "Failed to logout");
    }
  };

  return (
    <SafeAreaView className="h-full" style={{ backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32 px-7"
      > 
      
      <View className="flex flex-row items-center justify-between mt-5">
         

      <Text className="text-xl font-rubik-bold" style={{ color: colors.onSurface }}>Profile</Text>
      <MaterialIcons name="notifications" size={24} color={colors.onSurface} />
    </View>

    <View className="flex flex-row justify-center mt-5">
      <View className="flex flex-col items-center relative mt-5">
        <Image
          source={{ uri: user?.avatar }}
          className="size-44 relative rounded-full"
        />
        <TouchableOpacity className="absolute bottom-11 right-2">
          <MaterialIcons name="edit" size={24} color={colors.onSurface} />
        </TouchableOpacity>

        <Text className="text-2xl font-rubik-bold mt-2" style={{ color: colors.onSurface }}>{user?.name}</Text>
      </View>
    </View>

        <View className="flex flex-col mt-10">
          <SettingsItem icon={MaterialCommunityIcons} iconName="cog-outline" title="My Configs" textStyle={{ color: colors.onSurface }} /> 
        </View>

        <View className="flex flex-col mt-5 border-t pt-5" style={{ borderColor: colors.primaryContainer }}>
          {settings.slice(2).map((item, index) => (
            <SettingsItem key={index} {...item} textStyle={{ color: colors.onSurface }} /> 
          ))}
        </View>

        <View className="flex flex-col border-t mt-5 pt-5" style={{ borderColor: colors.primaryContainer }}>
          <SettingsItem
            icon={MaterialIcons}
            iconName="logout"
            title="Logout"
            className="text-danger" 
            showArrow={false}
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
