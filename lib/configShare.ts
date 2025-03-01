import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Category } from './categoryManager';
import { showDialog, showToast } from './notifications';

interface FolderlyConfig {
  version: string;
  categories: Category[];
  settings: {
    theme: 'light' | 'dark' | 'system';
    defaultView: 'list' | 'grid';
    sortBy: 'name' | 'date' | 'size';
    sortOrder: 'asc' | 'desc';
  };
  timestamp: number;
}

interface ConfigMigration {
  from: string;
  to: string;
  migrate: (config: any) => FolderlyConfig;
}

const CONFIG_VERSION = '1.1.0';

// Migration definitions for different versions
const migrations: ConfigMigration[] = [
  {
    from: '1.0.0',
    to: '1.1.0',
    migrate: (oldConfig: any): FolderlyConfig => {
      // Add new fields and convert old format to new
      return {
        ...oldConfig,
        version: '1.1.0',
        settings: {
          ...oldConfig.settings,
          defaultView: oldConfig.settings.defaultView || 'list',
          sortBy: oldConfig.settings.sortBy || 'name',
          sortOrder: oldConfig.settings.sortOrder || 'asc',
        },
        categories: oldConfig.categories.map((cat: any) => ({
          ...cat,
          updatedAt: cat.updatedAt || cat.createdAt || Date.now(),
        })),
      };
    },
  },
];

const validateConfig = (config: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check required top-level fields
  if (!config.version) errors.push('Missing version');
  if (!Array.isArray(config.categories)) errors.push('Invalid categories format');
  if (!config.settings) errors.push('Missing settings');
  if (!config.timestamp) errors.push('Missing timestamp');

  // Validate settings
  if (config.settings) {
    const validThemes = ['light', 'dark', 'system'];
    const validViews = ['list', 'grid'];
    const validSortBy = ['name', 'date', 'size'];
    const validSortOrder = ['asc', 'desc'];

    if (!validThemes.includes(config.settings.theme)) {
      errors.push('Invalid theme setting');
    }
    if (!validViews.includes(config.settings.defaultView)) {
      errors.push('Invalid defaultView setting');
    }
    if (!validSortBy.includes(config.settings.sortBy)) {
      errors.push('Invalid sortBy setting');
    }
    if (!validSortOrder.includes(config.settings.sortOrder)) {
      errors.push('Invalid sortOrder setting');
    }
  }

  // Validate categories
  if (Array.isArray(config.categories)) {
    config.categories.forEach((category: any, index: number) => {
      if (!category.id) errors.push(`Category ${index}: Missing id`);
      if (!category.name) errors.push(`Category ${index}: Missing name`);
      if (!Array.isArray(category.directories)) {
        errors.push(`Category ${index}: Invalid directories format`);
      }
      if (!category.color) errors.push(`Category ${index}: Missing color`);
      if (!category.createdAt) errors.push(`Category ${index}: Missing createdAt`);
      if (!category.updatedAt) errors.push(`Category ${index}: Missing updatedAt`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const migrateConfig = (config: any): FolderlyConfig => {
  let currentConfig = { ...config };
  const currentVersion = currentConfig.version;

  if (currentVersion === CONFIG_VERSION) {
    return currentConfig as FolderlyConfig;
  }

  // Find all migrations that need to be applied
  const requiredMigrations = migrations
    .filter(migration => {
      const fromVersion = parseInt(migration.from.replace(/\./g, ''));
      const currentVer = parseInt(currentVersion.replace(/\./g, ''));
      return fromVersion >= currentVer;
    })
    .sort((a, b) => {
      const aVersion = parseInt(a.from.replace(/\./g, ''));
      const bVersion = parseInt(b.from.replace(/\./g, ''));
      return aVersion - bVersion;
    });

  // Apply migrations in sequence
  for (const migration of requiredMigrations) {
    try {
      currentConfig = migration.migrate(currentConfig);
    } catch (error) {
      
      throw new Error(`Failed to migrate configuration from version ${migration.from}`);
    }
  }

  return currentConfig as FolderlyConfig;
};

export const exportConfig = async (
  categories: Category[],
  settings: FolderlyConfig['settings']
): Promise<void> => {
  try {
    const config: FolderlyConfig = {
      version: CONFIG_VERSION,
      categories,
      settings,
      timestamp: Date.now()
    };

    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    const configJson = JSON.stringify(config, null, 2);
    const fileName = `folderly_config_${new Date().toISOString().split('T')[0]}.json`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, configJson);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Export Folderly Configuration'
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    
    showToast('error', error instanceof Error ? error.message : 'Failed to export configuration');
  }
};

export const importConfig = async (): Promise<FolderlyConfig | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true
    });

    if (!result.canceled && result.assets?.[0]) {
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      let config: any;
      
      try {
        config = JSON.parse(content);
      } catch (error) {
        throw new Error('Invalid JSON format');
      }

      // Basic structure validation
      if (!config || typeof config !== 'object') {
        throw new Error('Invalid configuration format');
      }

      // Version check and migration
      if (!config.version) {
        throw new Error('Configuration version not found');
      }

      // Migrate if necessary
      if (config.version !== CONFIG_VERSION) {
        try {
          config = migrateConfig(config);
        } catch (error) {
          throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Validate final config
      const validation = validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      return config;
    }
    return null;
  } catch (error) {
    
    showToast('error', error instanceof Error
      ? error.message
      : 'Failed to import configuration. Please make sure the file is a valid Folderly configuration.');
    return null;
  }
}; 