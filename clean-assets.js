const fs = require('fs');
const path = require('path');

// List of asset files that are used in the application (based on our search)
const usedAssets = [
  // App configuration images (don't remove these)
  ['assets', 'icon.png'],
  ['assets', 'splash.png'],
  ['assets', 'adaptive-icon.png'],
  ['assets', 'favicon.png'], // Used in web
  
  // Images used in the app
  ['assets', 'images', 'logo-dark.png'],
  ['assets', 'images', 'logo-light.png'],
  ['assets', 'images', 'splash.png'],
  ['assets', 'images', 'onboarding.png'],
  ['assets', 'icons', 'google.png'],
  
  // Fonts
  ['assets', 'fonts', 'Rubik-Light.ttf'],
  ['assets', 'fonts', 'Rubik-Regular.ttf'],
  ['assets', 'fonts', 'Rubik-Medium.ttf'],
  ['assets', 'fonts', 'Rubik-SemiBold.ttf'],
  ['assets', 'fonts', 'Rubik-Bold.ttf'],
  ['assets', 'fonts', 'Rubik-ExtraBold.ttf'],
];

// Convert to proper paths
const normalizedUsedAssets = usedAssets.map(parts => {
  return path.join(...parts);
});

// Function to check for unused assets
function findUnusedAssets(directory, baseDir = '') {
  const unused = [];
  const files = fs.readdirSync(directory, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(directory, file.name);
    
    if (file.isDirectory()) {
      // Process subdirectories
      const subDir = path.join(baseDir, file.name);
      unused.push(...findUnusedAssets(fullPath, subDir));
    } else {
      // Create the relative path
      const relativePath = path.join(baseDir, file.name);
      
      // Check if this file is used
      const isUsed = normalizedUsedAssets.some(usedAsset => {
        // Compare normalized paths
        return path.normalize(usedAsset) === path.normalize(relativePath);
      });
      
      if (!isUsed) {
        unused.push(fullPath);
      } else {
        console.log(`Keeping used asset: ${relativePath}`);
      }
    }
  }
  
  return unused;
}

// Function to delete unused assets - SIMULATION MODE
function deleteUnusedAssets(assetsDir) {
  console.log('Looking for unused assets...');
  const unusedAssets = findUnusedAssets(assetsDir, '');
  
  if (unusedAssets.length === 0) {
    console.log('No unused assets found.');
    return;
  }
  
  console.log(`\nFound ${unusedAssets.length} unused assets:`);
  unusedAssets.forEach(asset => console.log(`- ${asset}`));
  
  console.log('\nSIMULATION MODE: These files would be deleted. To actually delete them, change SIMULATION to false.');
  
  const SIMULATION = true; // Set to false to actually delete files
  
  if (!SIMULATION) {
    console.log('\nDeleting unused assets...');
    unusedAssets.forEach(asset => {
      try {
        fs.unlinkSync(asset);
        console.log(`Deleted: ${asset}`);
      } catch (error) {
        console.error(`Error deleting ${asset}:`, error);
      }
    });
    console.log('Unused assets cleanup complete!');
  }
}

// Starting point - assets directory
const assetsDir = path.join(process.cwd(), 'assets');
console.log(`Starting to analyze unused assets in: ${assetsDir}`);
deleteUnusedAssets(assetsDir); 