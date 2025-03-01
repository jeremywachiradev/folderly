const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Regular expressions to match console statements
const consoleRegex = /console\.(log|error|warn)\((.*?)\);?/g;

// Function to recursively process all TypeScript and JavaScript files
function processFiles(directory) {
  const files = fs.readdirSync(directory, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(directory, file.name);
    
    if (file.isDirectory()) {
      // Skip node_modules and .git directories
      if (file.name !== 'node_modules' && file.name !== '.git') {
        processFiles(fullPath);
      }
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
      try {
        let content = fs.readFileSync(fullPath, 'utf8');
        const originalContent = content;
        
        // Replace console statements
        content = content.replace(consoleRegex, '');
        
        // If content was modified, write it back
        if (content !== originalContent) {
          fs.writeFileSync(fullPath, content, 'utf8');
          
        }
      } catch (error) {
        
      }
    }
  }
}

// Starting point - current working directory
const rootDir = process.cwd();

processFiles(rootDir);
 