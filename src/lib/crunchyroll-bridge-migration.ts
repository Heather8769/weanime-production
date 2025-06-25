// Migration helper to identify and update vulnerable Crunchyroll bridge usage

import { promises as fs } from 'fs'
import path from 'path'

interface MigrationReport {
  totalFiles: number
  filesWithIssues: number
  issues: Array<{
    file: string
    line: number
    issue: string
    suggestion: string
  }>
  migrationSteps: string[]
}

/**
 * Scan for vulnerable Crunchyroll bridge usage patterns
 */
export async function scanForVulnerableUsage(baseDir: string = './src'): Promise<MigrationReport> {
  const report: MigrationReport = {
    totalFiles: 0,
    filesWithIssues: 0,
    issues: [],
    migrationSteps: []
  }

  try {
    const files = await findTSFiles(baseDir)
    report.totalFiles = files.length

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8')
      const lines = content.split('\n')
      
      let hasIssues = false

      lines.forEach((line, index) => {
        const lineNumber = index + 1
        
        // Check for vulnerable imports
        if (line.includes('crunchyroll-bridge') && !line.includes('crunchyroll-bridge-secure') && !line.includes('crunchyroll-bridge-client')) {
          report.issues.push({
            file,
            line: lineNumber,
            issue: 'Using vulnerable crunchyroll-bridge import',
            suggestion: 'Replace with: import { SecureCrunchyrollBridge } from "./crunchyroll-bridge-secure"'
          })
          hasIssues = true
        }

        // Check for spawn usage
        if (line.includes('spawn(') && line.includes('curl')) {
          report.issues.push({
            file,
            line: lineNumber,
            issue: 'Direct spawn("curl") usage detected',
            suggestion: 'Replace with fetch API or SecureCrunchyrollBridge'
          })
          hasIssues = true
        }

        // Check for CrunchyrollBridge class instantiation
        if (line.includes('new CrunchyrollBridge(') && !line.includes('SecureCrunchyrollBridge')) {
          report.issues.push({
            file,
            line: lineNumber,
            issue: 'Instantiating vulnerable CrunchyrollBridge class',
            suggestion: 'Replace with: new SecureCrunchyrollBridge()'
          })
          hasIssues = true
        }

        // Check for executeBridgeCommand usage
        if (line.includes('executeBridgeCommand')) {
          report.issues.push({
            file,
            line: lineNumber,
            issue: 'Using deprecated executeBridgeCommand method',
            suggestion: 'Use SecureCrunchyrollBridge methods directly'
          })
          hasIssues = true
        }
      })

      if (hasIssues) {
        report.filesWithIssues++
      }
    }

    // Generate migration steps
    report.migrationSteps = generateMigrationSteps(report)

  } catch (error) {
    console.error('Error scanning for vulnerable usage:', error)
  }

  return report
}

async function findTSFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const subFiles = await findTSFiles(fullPath)
        files.push(...subFiles)
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dir}:`, error)
  }
  
  return files
}

function generateMigrationSteps(report: MigrationReport): string[] {
  const steps = [
    'SECURITY MIGRATION REQUIRED',
    '===========================',
    '',
    '1. Update imports:',
    '   - Replace: import CrunchyrollBridge from "./crunchyroll-bridge"',
    '   - With: import { SecureCrunchyrollBridge } from "./crunchyroll-bridge-secure"',
    '',
    '2. Update instantiation:',
    '   - Replace: new CrunchyrollBridge()',
    '   - With: new SecureCrunchyrollBridge()',
    '',
    '3. Remove direct spawn("curl") usage',
    '   - Replace with fetch API or SecureCrunchyrollBridge methods',
    '',
    '4. Update method calls:',
    '   - All methods maintain the same interface',
    '   - Remove any direct executeBridgeCommand() calls',
    '',
    '5. Test thoroughly:',
    '   - Verify all Crunchyroll functionality still works',
    '   - Check for timeout and error handling improvements',
    '',
    `Files requiring updates: ${report.filesWithIssues}`,
    `Total security issues found: ${report.issues.length}`
  ]

  if (report.issues.length === 0) {
    steps.push('', '✅ No vulnerable usage patterns detected!')
  }

  return steps
}

/**
 * Generate a detailed migration report
 */
export function formatMigrationReport(report: MigrationReport): string {
  let output = '\n🔒 CRUNCHYROLL BRIDGE SECURITY MIGRATION REPORT\n'
  output += '=' .repeat(60) + '\n\n'
  
  output += `📊 SCAN RESULTS:\n`
  output += `   📁 Total files scanned: ${report.totalFiles}\n`
  output += `   ⚠️  Files with security issues: ${report.filesWithIssues}\n`
  output += `   🚨 Total security issues: ${report.issues.length}\n\n`
  
  if (report.issues.length > 0) {
    output += `🚨 SECURITY ISSUES FOUND:\n`
    output += '-'.repeat(40) + '\n'
    
    report.issues.forEach((issue, index) => {
      output += `${index + 1}. ${issue.file}:${issue.line}\n`
      output += `   Issue: ${issue.issue}\n`
      output += `   Fix: ${issue.suggestion}\n\n`
    })
    
    output += `📋 MIGRATION STEPS:\n`
    output += '-'.repeat(20) + '\n'
    report.migrationSteps.forEach(step => {
      output += `${step}\n`
    })
  } else {
    output += `✅ NO SECURITY ISSUES FOUND!\n`
    output += `All files are using secure implementations.\n`
  }
  
  return output
}

/**
 * Auto-fix simple migration patterns
 */
export async function autoMigrate(filePath: string): Promise<boolean> {
  try {
    let content = await fs.readFile(filePath, 'utf-8')
    let modified = false
    
    // Replace vulnerable imports
    const oldImport = /import\s+.*crunchyroll-bridge(?!-secure)(?!-client)['"]/g
    if (oldImport.test(content)) {
      content = content.replace(
        /import\s+CrunchyrollBridge\s+from\s+['"](\.\/)?crunchyroll-bridge['"]/g,
        'import { SecureCrunchyrollBridge } from "./crunchyroll-bridge-secure"'
      )
      modified = true
    }
    
    // Replace class instantiation
    content = content.replace(
      /new\s+CrunchyrollBridge\(/g,
      'new SecureCrunchyrollBridge('
    )
    
    // Replace variable names for consistency
    content = content.replace(
      /CrunchyrollBridge(?!\w)/g,
      'SecureCrunchyrollBridge'
    )
    
    if (modified) {
      await fs.writeFile(filePath, content, 'utf-8')
      return true
    }
    
    return false
  } catch (error) {
    console.error(`Failed to auto-migrate ${filePath}:`, error)
    return false
  }
}