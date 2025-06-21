#!/usr/bin/env node

/**
 * Import Validation Script
 * Scans the entire codebase to detect and report unresolved imports,
 * missing modules, and broken dependencies.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class ImportValidator {
  constructor() {
    this.projectRoot = process.cwd()
    this.srcDir = path.join(this.projectRoot, 'src')
    this.issues = []
    this.scannedFiles = 0
    this.totalImports = 0
    this.validImports = 0
    this.invalidImports = 0
    
    // File extensions to scan
    this.extensions = ['.ts', '.tsx', '.js', '.jsx']
    
    // Directories to ignore
    this.ignoreDirs = ['node_modules', '.next', '.git', 'dist', 'build']
    
    // Built-in modules and external packages to ignore
    this.builtInModules = new Set([
      'react', 'react-dom', 'next', 'lucide-react', '@supabase/supabase-js',
      'framer-motion', 'zustand', '@tanstack/react-query', 'zod', 'clsx',
      '@radix-ui/react-slot', '@radix-ui/react-tabs', '@radix-ui/react-dropdown-menu',
      'class-variance-authority', 'tailwind-merge', '@radix-ui/react-select',
      '@radix-ui/react-checkbox', '@radix-ui/react-switch', '@radix-ui/react-slider',
      '@radix-ui/react-label', '@radix-ui/react-progress', '@radix-ui/react-textarea'
    ])
  }

  /**
   * Main validation function
   */
  async validate() {
    console.log('🔍 Starting import validation...')
    console.log(`📁 Scanning directory: ${this.srcDir}`)
    
    try {
      await this.scanDirectory(this.srcDir)
      this.generateReport()
      return this.issues.length === 0
    } catch (error) {
      console.error('❌ Validation failed:', error.message)
      return false
    }
  }

  /**
   * Recursively scan directory for TypeScript/JavaScript files
   */
  async scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory()) {
        if (!this.ignoreDirs.includes(entry.name)) {
          await this.scanDirectory(fullPath)
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name)
        if (this.extensions.includes(ext)) {
          await this.validateFile(fullPath)
        }
      }
    }
  }

  /**
   * Validate imports in a single file
   */
  async validateFile(filePath) {
    this.scannedFiles++
    const relativePath = path.relative(this.projectRoot, filePath)
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const imports = this.extractImports(content)
      
      for (const importInfo of imports) {
        this.totalImports++
        await this.validateImport(filePath, importInfo, relativePath)
      }
    } catch (error) {
      this.addIssue('error', relativePath, 'File read error', error.message)
    }
  }

  /**
   * Extract import statements from file content
   */
  extractImports(content) {
    const imports = []
    
    // Match ES6 imports: import ... from '...'
    const es6ImportRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g
    
    // Match dynamic imports: import('...')
    const dynamicImportRegex = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
    
    // Match require statements: require('...')
    const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
    
    let match
    
    // Extract ES6 imports
    while ((match = es6ImportRegex.exec(content)) !== null) {
      imports.push({
        type: 'es6',
        module: match[1],
        line: this.getLineNumber(content, match.index)
      })
    }
    
    // Extract dynamic imports
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      imports.push({
        type: 'dynamic',
        module: match[1],
        line: this.getLineNumber(content, match.index)
      })
    }
    
    // Extract require statements
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push({
        type: 'require',
        module: match[1],
        line: this.getLineNumber(content, match.index)
      })
    }
    
    return imports
  }

  /**
   * Get line number for a given character index
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length
  }

  /**
   * Validate a single import
   */
  async validateImport(filePath, importInfo, relativePath) {
    const { module, line, type } = importInfo
    
    // Skip built-in modules and external packages
    if (this.isExternalModule(module)) {
      this.validImports++
      return
    }
    
    // Resolve relative imports
    if (module.startsWith('.')) {
      const resolvedPath = this.resolveRelativeImport(filePath, module)
      if (!this.fileExists(resolvedPath)) {
        this.addIssue('error', relativePath, `Missing file import`, 
          `Cannot resolve '${module}' at line ${line}. Expected: ${resolvedPath}`)
        this.invalidImports++
        return
      }
    }
    
    // Resolve absolute imports (using @ alias)
    else if (module.startsWith('@/')) {
      const resolvedPath = this.resolveAbsoluteImport(module)
      if (!this.fileExists(resolvedPath)) {
        this.addIssue('error', relativePath, `Missing module import`, 
          `Cannot resolve '${module}' at line ${line}. Expected: ${resolvedPath}`)
        this.invalidImports++
        return
      }
    }
    
    this.validImports++
  }

  /**
   * Check if module is external (npm package or built-in)
   */
  isExternalModule(module) {
    // Built-in Node.js modules
    if (!module.startsWith('.') && !module.startsWith('@/')) {
      return true
    }
    
    // Check against known external packages
    const packageName = module.split('/')[0]
    return this.builtInModules.has(packageName) || this.builtInModules.has(module)
  }

  /**
   * Resolve relative import path
   */
  resolveRelativeImport(fromFile, module) {
    const fromDir = path.dirname(fromFile)
    const resolved = path.resolve(fromDir, module)
    
    // Try different extensions
    for (const ext of this.extensions) {
      if (fs.existsSync(resolved + ext)) {
        return resolved + ext
      }
    }
    
    // Try index files
    for (const ext of this.extensions) {
      const indexPath = path.join(resolved, 'index' + ext)
      if (fs.existsSync(indexPath)) {
        return indexPath
      }
    }
    
    return resolved
  }

  /**
   * Resolve absolute import path (@ alias)
   */
  resolveAbsoluteImport(module) {
    const relativePath = module.replace('@/', '')
    const resolved = path.join(this.srcDir, relativePath)
    
    // Try different extensions
    for (const ext of this.extensions) {
      if (fs.existsSync(resolved + ext)) {
        return resolved + ext
      }
    }
    
    // Try index files
    for (const ext of this.extensions) {
      const indexPath = path.join(resolved, 'index' + ext)
      if (fs.existsSync(indexPath)) {
        return indexPath
      }
    }
    
    return resolved
  }

  /**
   * Check if file exists with any valid extension
   */
  fileExists(basePath) {
    // Check exact path
    if (fs.existsSync(basePath)) {
      return true
    }
    
    // Check with extensions
    for (const ext of this.extensions) {
      if (fs.existsSync(basePath + ext)) {
        return true
      }
    }
    
    // Check index files
    for (const ext of this.extensions) {
      const indexPath = path.join(basePath, 'index' + ext)
      if (fs.existsSync(indexPath)) {
        return true
      }
    }
    
    return false
  }

  /**
   * Add an issue to the report
   */
  addIssue(severity, file, title, description) {
    this.issues.push({
      severity,
      file,
      title,
      description,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Generate validation report
   */
  generateReport() {
    console.log('\n📊 Import Validation Report')
    console.log('=' .repeat(50))
    console.log(`📁 Files scanned: ${this.scannedFiles}`)
    console.log(`📦 Total imports: ${this.totalImports}`)
    console.log(`✅ Valid imports: ${this.validImports}`)
    console.log(`❌ Invalid imports: ${this.invalidImports}`)
    console.log(`🚨 Issues found: ${this.issues.length}`)
    
    if (this.issues.length > 0) {
      console.log('\n🔍 Detailed Issues:')
      console.log('-'.repeat(50))
      
      this.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.severity.toUpperCase()}: ${issue.title}`)
        console.log(`   File: ${issue.file}`)
        console.log(`   Description: ${issue.description}`)
      })
      
      // Save detailed report to file
      this.saveReportToFile()
    } else {
      console.log('\n🎉 All imports are valid!')
    }
  }

  /**
   * Save detailed report to file
   */
  saveReportToFile() {
    const reportPath = path.join(this.projectRoot, 'import-validation-report.json')
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        filesScanned: this.scannedFiles,
        totalImports: this.totalImports,
        validImports: this.validImports,
        invalidImports: this.invalidImports,
        issuesFound: this.issues.length
      },
      issues: this.issues
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Detailed report saved to: ${reportPath}`)
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ImportValidator()
  validator.validate().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('❌ Validation failed:', error)
    process.exit(1)
  })
}

module.exports = ImportValidator
