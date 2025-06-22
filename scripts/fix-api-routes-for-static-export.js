#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');

function findRouteFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item === 'route.ts' || item === 'route.js') {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function addStaticExportToFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already has dynamic export
    if (content.includes('export const dynamic')) {
      console.log(`✅ Already configured: ${filePath}`);
      return;
    }
    
    // Find the first import statement
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Find where to insert (after imports, before first export)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ') || lines[i].startsWith('//') || lines[i].trim() === '') {
        insertIndex = i + 1;
      } else {
        break;
      }
    }
    
    // Insert the dynamic export
    lines.splice(insertIndex, 0, '', '// Required for static export', 'export const dynamic = \'force-static\'');
    
    const newContent = lines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    console.log(`🔧 Fixed: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

function main() {
  console.log('🚀 Fixing API routes for static export...');
  
  if (!fs.existsSync(API_DIR)) {
    console.error('❌ API directory not found:', API_DIR);
    process.exit(1);
  }
  
  const routeFiles = findRouteFiles(API_DIR);
  console.log(`📁 Found ${routeFiles.length} route files`);
  
  for (const file of routeFiles) {
    addStaticExportToFile(file);
  }
  
  console.log('✅ All API routes fixed for static export!');
}

main();
