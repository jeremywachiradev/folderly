import { Client, Account, Databases, Storage, Avatars } from 'react-native-appwrite';



const client = new Client();

export const config = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
  propertiesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
  agentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_COLLECTION_ID,
  reviewsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID,
  galleriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_COLLECTION_ID,
  bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
};

// Remove logging for production builds
// console.log('Environment variables check:', {
//   hasEndpoint: !!process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
//   hasProjectId: !!process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
//   hasDatabaseId: !!process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
//   hasUserCategoriesCollectionId: !!process.env.EXPO_PUBLIC_APPWRITE_USER_CATEGORIES_COLLECTION_ID,
// });

// Validate required configuration
if (!config.endpoint || !config.projectId || !config.databaseId) {
  console.error('Missing required Appwrite configuration:', {
    hasEndpoint: !!config.endpoint,
    hasProjectId: !!config.projectId,
    hasDatabaseId: !!config.databaseId
  });
  throw new Error('Missing required Appwrite configuration');
}

// For production builds, don't log configuration details
// console.log('Appwrite configuration loaded:', {
//   endpoint: config.endpoint,
//   projectId: config.projectId,
//   databaseId: config.databaseId
// });

try {
  
  client
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);
  
} catch (error) {
  
  throw error;
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);

// Verify database instance
try {
  
  if (!databases) {
    throw new Error('Database instance not created');
  }
  
} catch (error) {
  
  throw error;
}



export { client };

// Type for the configuration to ensure type safety
export type AppwriteConfig = typeof config; 