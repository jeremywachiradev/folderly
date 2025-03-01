import { ID, Query,Permission, Role  } from 'appwrite';
import { databases, config as appwriteConfig } from './appwrite';
import { Category } from './categoryManager';
import { showToast } from './notifications';
import { pathToSafUri } from './androidDirectories';

// Use the collection ID from environment variables
const USER_CATEGORIES_COLLECTION = process.env.EXPO_PUBLIC_APPWRITE_USER_CATEGORIES_COLLECTION_ID!;

export const initializeUserConfig = async (userId: string): Promise<void> => {
  try {
    // Validate that the user exists and has proper permissions
    if (!userId) {
      throw new Error('Invalid user ID');
    }
    
  } catch (error) {
    
    throw error;
  }
};

export const saveCategories = async (userId: string, categories: Category[]): Promise<void> => {
  try {
    console.log('=== Starting saveCategories ===', {
      userId,
      databaseId: appwriteConfig.databaseId,
      collectionId: USER_CATEGORIES_COLLECTION,
      categoriesCount: categories.length
    });
    
    if (!appwriteConfig.databaseId || !USER_CATEGORIES_COLLECTION) {
      throw new Error('Invalid Appwrite configuration');
    }

    if (!userId) {
      throw new Error('Invalid user ID');
    }

    // Get existing categories for user
    const existingDocs = await databases.listDocuments(
      appwriteConfig.databaseId,
      USER_CATEGORIES_COLLECTION,
      [Query.equal('userId', userId)]
    );

    

    // Delete all existing categories for this user first
    for (const doc of existingDocs.documents) {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        USER_CATEGORIES_COLLECTION,
        doc.$id
      );
    }

    // Process each category with error handling
    for (const category of categories) {
      // Handle directories to stay within the character limit
      const simplifiedDirectories = category.directories.map(dir => ({
        name: dir.name,
        path: dir.path,
        uri: dir.uri
      }));
      
      const directoriesString = JSON.stringify(simplifiedDirectories);
      
      // Check if the string is too long
      if (directoriesString.length > 2000) {
        // Skip directories that are too long
        continue;
      }
      
      const categoryData = {
        userId,
        categoryId: category.id,
        name: category.name,
        color: category.color,
        directories: directoriesString,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        isChecked: category.isChecked ?? true // Default to true if not specified
      };

      try {
        // Create new document with proper permissions
        const permissions = [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId))
        ];
        
        await databases.createDocument(
          appwriteConfig.databaseId,
          USER_CATEGORIES_COLLECTION,
          ID.unique(),
          categoryData,
          permissions
        );
      } catch (error) {
        console.error('Error processing category:', {
          categoryId: category.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
      }
    }

    
  } catch (error) {
    
    
    throw error;
  }
};

const createDefaultCategories = async (userId: string): Promise<Category[]> => {
  const defaultCategories: Category[] = [
    {
      id: `telegram_${Date.now()}`,
      name: 'Telegram Media',
      color: '#0088cc',
      directories: [
        {
          name: 'Telegram Images',
          path: '/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Images',
          uri: pathToSafUri('/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Images'),
          type: 'default',
          validated: true
        },
        {
          name: 'Telegram Video',
          path: '/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Video',
          uri: pathToSafUri('/storage/emulated/0/Android/media/org.telegram.messenger/Telegram/Telegram Video'),
          type: 'default',
          validated: true
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isChecked: true
    },
    {
      id: `whatsapp_${Date.now()}`,
      name: 'WhatsApp Status',
      color: '#25D366',
      directories: [
        {
          name: 'WhatsApp Statuses',
          path: '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses',
          uri: pathToSafUri('/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/.Statuses'),
          type: 'default',
          validated: true
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isChecked: true
    }
  ];

  // Save the default categories to the cloud
  await saveCategories(userId, defaultCategories);
  return defaultCategories;
};

export const loadCategories = async (userId: string): Promise<Category[]> => {
  try {
    if (!userId) {
      throw new Error('Invalid user ID');
    }

    if (!appwriteConfig.databaseId || !USER_CATEGORIES_COLLECTION) {
      throw new Error('Invalid Appwrite configuration');
    }

    const docs = await databases.listDocuments(
      appwriteConfig.databaseId,
      USER_CATEGORIES_COLLECTION,
      [Query.equal('userId', userId)]
    );

    // If no categories exist for this user, create default ones
    if (docs.documents.length === 0) {
      
      const defaultCats = await createDefaultCategories(userId);
      await saveCategories(userId, defaultCats);
      return defaultCats;
    }

    return docs.documents.map(doc => ({
      id: doc.categoryId,
      name: doc.name,
      color: doc.color,
      directories: JSON.parse(doc.directories),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      isChecked: doc.isChecked ?? true // Default to true if not specified
    }));
  } catch (error) {
    
    showToast('error', 'Failed to load categories from cloud');
    throw error;
  }
};

export const deleteUserCategories = async (userId: string): Promise<void> => {
  try {
    if (!userId) {
      throw new Error('Invalid user ID');
    }

    if (!appwriteConfig.databaseId || !USER_CATEGORIES_COLLECTION) {
      throw new Error('Invalid Appwrite configuration');
    }

    const docs = await databases.listDocuments(
      appwriteConfig.databaseId,
      USER_CATEGORIES_COLLECTION,
      [Query.equal('userId', userId)]
    );

    // Delete all categories for the user
    await Promise.all(
      docs.documents.map(doc =>
        databases.deleteDocument(
          appwriteConfig.databaseId,
          USER_CATEGORIES_COLLECTION,
          doc.$id
        )
      )
    );

    
  } catch (error) {
    
    showToast('error', 'Failed to delete categories from cloud');
    throw error;
  }
};

export const deleteCategories = async (userId: string, categoryIds: string[]): Promise<void> => {
  try {
    const docs = await databases.listDocuments(
      appwriteConfig.databaseId!,
      USER_CATEGORIES_COLLECTION,
      [Query.equal('userId', userId)]
    );

    // Find and delete the specified categories
    const categoriesToDelete = docs.documents.filter(doc => 
      categoryIds.includes(doc.categoryId)
    );

    await Promise.all(
      categoriesToDelete.map(doc =>
        databases.deleteDocument(
          appwriteConfig.databaseId!,
          USER_CATEGORIES_COLLECTION,
          doc.$id
        )
      )
    );
  } catch (error) {
    
    showToast('error', 'Failed to delete categories from cloud');
    throw error;
  }
}; 