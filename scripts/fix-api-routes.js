#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing API routes - Removing force-static configuration...\n');

// Function to recursively find all route files
function findRouteFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findRouteFiles(fullPath, files);
    } else if (item === 'route.ts' || item === 'route.js') {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Find all route files in the API directory
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');
const routeFiles = findRouteFiles(apiDir);

console.log(`Found ${routeFiles.length} API route files to fix.\n`);

let fixedCount = 0;
let errorCount = 0;

routeFiles.forEach((filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Remove force-static export and related comments
    content = content.replace(/\/\/ Required for static export\s*\n/g, '');
    content = content.replace(/export const dynamic = ['"]force-static['"]\s*\n/g, '');
    
    // Also remove any standalone force-static lines
    content = content.replace(/^export const dynamic = ['"]force-static['"]\s*$/gm, '');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
      fixedCount++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   - Fixed: ${fixedCount} files`);
console.log(`   - Errors: ${errorCount} files`);
console.log(`   - Skipped: ${routeFiles.length - fixedCount - errorCount} files (no changes needed)`);

if (errorCount === 0) {
  console.log('\n✨ All API routes have been successfully fixed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some files had errors. Please check the output above.');
  process.exit(1);
}