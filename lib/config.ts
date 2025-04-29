import Constants from 'expo-constants';

// Fallback values for environment variables
const FALLBACK_CONFIG = {
  EXPO_PUBLIC_APPWRITE_ENDPOINT: 'https://cloud.appwrite.io/v1',
  EXPO_PUBLIC_APPWRITE_PROJECT_ID: '6788eec10030d43b31c1',
  EXPO_PUBLIC_APPWRITE_DATABASE_ID: '67b661af00086f1eb426',
  EXPO_PUBLIC_APPWRITE_USER_CATEGORIES_COLLECTION_ID: '67b664ee000d9f64506f',
};

// Try to get values from process.env first, then from Constants.expoConfig.extra, then fallback
export const getConfig = () => {
  return {
    appwriteEndpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 
                      Constants.expoConfig?.extra?.appwriteEndpoint || 
                      FALLBACK_CONFIG.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    
    appwriteProjectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || 
                       Constants.expoConfig?.extra?.appwriteProjectId || 
                       FALLBACK_CONFIG.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    
    appwriteDatabaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || 
                       Constants.expoConfig?.extra?.appwriteDatabaseId || 
                       FALLBACK_CONFIG.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    
    appwriteUserCategoriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USER_CATEGORIES_COLLECTION_ID || 
                                       Constants.expoConfig?.extra?.appwriteUserCategoriesCollectionId || 
                                       FALLBACK_CONFIG.EXPO_PUBLIC_APPWRITE_USER_CATEGORIES_COLLECTION_ID,
  };
};

export default getConfig; 