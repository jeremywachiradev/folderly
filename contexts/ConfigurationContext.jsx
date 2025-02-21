import { createContext, useContext, useEffect, useState } from "react";
import { databases } from "../lib/appwrite";
import { toast } from "../lib/toast";
import { useAuth } from '@/lib/auth-provider'; // Ensure this import is present

export const CONFIG_DATABASE_ID = "default"; // Replace with your database ID
export const CONFIG_COLLECTION_ID = "user_configurations"; // Replace with your collection ID

const ConfigurationContext = createContext();

export function useConfiguration() {
  return useContext(ConfigurationContext);
}

export function ConfigurationProvider(props) {
  const [config, setConfig] = useState(null);
  const { user } = useAuth(); // Get the current user

  async function fetchConfig(userId) {
    const response = await databases.listDocuments(
      CONFIG_DATABASE_ID,
      CONFIG_COLLECTION_ID,
      [Query.equal("userId", userId)]
    );
    if (response.documents.length > 0) {
      setConfig(response.documents[0]);
    } else {
      // Create a new config if it doesn't exist
      const newConfig = { userId, settings: {}, preferences: {} }; // Default settings
      await databases.createDocument(
        CONFIG_DATABASE_ID,
        CONFIG_COLLECTION_ID,
        ID.unique(),
        newConfig
      );
      setConfig(newConfig);
    }
  }

  async function updateConfig(updatedConfig) {
    await databases.updateDocument(
      CONFIG_DATABASE_ID,
      CONFIG_COLLECTION_ID,
      updatedConfig.$id,
      updatedConfig
    );
    setConfig(updatedConfig);
    toast('Configuration updated');
  }

  useEffect(() => {
    // Fetch config when user logs in
    if (user) {
      fetchConfig(user.$id);
    }
  }, [user]);

  return (
    <ConfigurationContext.Provider value={{ config, updateConfig }}>
      {props.children}
    </ConfigurationContext.Provider>
  );
}
