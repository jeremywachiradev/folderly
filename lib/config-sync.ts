import { ID, Query,Permission, Role  } from 'appwrite';
import { databases, config as appwriteConfig } from './appwrite';
import { Category } from './categoryManager';
import { showToast } from './notifications';

// Use the collection ID from environment variables
const USER_CATEGORIES_COLLECTION = process.env.EXPO_PUBLIC_APPWRITE_USER_CATEGORIES_COLLECTION_ID!;

export const initializeUserConfig = async (userId: string): Promise<void> => {
  // No initialization needed for the new structure
  console.log('User categories initialization complete for:', userId);
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

    // Get existing categories for user
    const existingDocs = await databases.listDocuments(
      appwriteConfig.databaseId,
      USER_CATEGORIES_COLLECTION,
      [Query.equal('userId', userId)]
    );

    console.log('Found existing documents:', existingDocs.documents.length);

    // Process each category with error handling
    for (const category of categories) {
      const categoryData = {
        userId,
        categoryId: category.id,
        name: category.name,
        color: category.color,
        directories: JSON.stringify(category.directories),
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      };

      try {
        const existingDoc = existingDocs.documents.find(doc => doc.categoryId === category.id);
        
        if (existingDoc) {
          console.log(`Updating category: ${category.id}`);
          await databases.updateDocument(
            appwriteConfig.databaseId,
            USER_CATEGORIES_COLLECTION,
            existingDoc.$id,
            categoryData
          );
        } else {
          console.log(`Creating new category: ${category.id}`);
          await databases.createDocument(
            appwriteConfig.databaseId,
            USER_CATEGORIES_COLLECTION,
            ID.unique(),
            categoryData,
            [ // Add permissions for the user
              Permission.read(Role.user(userId)),
              Permission.update(Role.user(userId)),
              Permission.delete(Role.user(userId))
            ]
          );
        }
      } catch (error) {
        console.error('Error processing category:', {
          categoryId: category.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new Error(`Failed to save category "${category.name}". Please try again.`);
      }
    }

    console.log('=== saveCategories completed successfully ===');
  } catch (error) {
    console.error('Error in saveCategories:', error);
    throw error;
  }
};

export const loadCategories = async (userId: string): Promise<Category[]> => {
  try {
    const docs = await databases.listDocuments(
      appwriteConfig.databaseId!,
      USER_CATEGORIES_COLLECTION,
      [Query.equal('userId', userId)]
    );

    return docs.documents.map(doc => ({
      id: doc.categoryId,
      name: doc.name,
      color: doc.color,
      directories: JSON.parse(doc.directories),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }));
  } catch (error) {
    console.error('Error loading categories:', error);
    showToast('error', 'Failed to load categories from cloud');
    throw error;
  }
};

export const deleteUserCategories = async (userId: string): Promise<void> => {
  try {
    const docs = await databases.listDocuments(
      appwriteConfig.databaseId!,
      USER_CATEGORIES_COLLECTION,
      [Query.equal('userId', userId)]
    );

    // Delete all categories for the user
    await Promise.all(
      docs.documents.map(doc =>
        databases.deleteDocument(
          appwriteConfig.databaseId!,
          USER_CATEGORIES_COLLECTION,
          doc.$id
        )
      )
    );
  } catch (error) {
    console.error('Error deleting user categories:', error);
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
    console.error('Error deleting categories:', error);
    showToast('error', 'Failed to delete categories from cloud');
    throw error;
  }
}; 