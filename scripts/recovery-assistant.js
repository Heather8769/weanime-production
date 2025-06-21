#!/usr/bin/env node

/**
 * Recovery Assistant Tool
 * Automatically attempts to fix missing component issues by generating
 * stub modules with proper TypeScript interfaces and basic functionality.
 */

const fs = require('fs')
const path = require('path')
const ImportValidator = require('./import-validator')

class RecoveryAssistant {
  constructor() {
    this.projectRoot = process.cwd()
    this.srcDir = path.join(this.projectRoot, 'src')
    this.generatedStubs = []
    this.recoveryLog = []
    
    // Component templates
    this.templates = {
      component: this.getComponentTemplate(),
      hook: this.getHookTemplate(),
      utility: this.getUtilityTemplate(),
      type: this.getTypeTemplate()
    }
  }

  /**
   * Main recovery function
   */
  async recover() {
    console.log('🔧 Starting automatic recovery process...')
    
    try {
      // First, run import validation to find issues
      const validator = new ImportValidator()
      await validator.validate()
      
      if (validator.issues.length === 0) {
        console.log('✅ No issues found - recovery not needed!')
        return true
      }
      
      // Filter for missing module issues
      const missingModules = validator.issues.filter(issue => 
        issue.title.includes('Missing') && 
        (issue.title.includes('file import') || issue.title.includes('module import'))
      )
      
      if (missingModules.length === 0) {
        console.log('ℹ️ No missing modules found - other types of issues detected')
        return false
      }
      
      console.log(`🎯 Found ${missingModules.length} missing modules to recover`)
      
      // Generate stubs for missing modules
      for (const issue of missingModules) {
        await this.generateStub(issue)
      }
      
      this.generateRecoveryReport()
      return true
      
    } catch (error) {
      console.error('❌ Recovery failed:', error.message)
      return false
    }
  }

  /**
   * Generate stub for missing module
   */
  async generateStub(issue) {
    const { description } = issue
    
    // Extract module path from description
    const moduleMatch = description.match(/Expected: (.+)$/)
    if (!moduleMatch) {
      console.warn(`⚠️ Could not extract module path from: ${description}`)
      return
    }
    
    const expectedPath = moduleMatch[1]
    const relativePath = path.relative(this.projectRoot, expectedPath)
    
    // Determine module type and generate appropriate stub
    const moduleType = this.determineModuleType(expectedPath)
    const stubContent = this.generateStubContent(expectedPath, moduleType)
    
    try {
      // Ensure directory exists
      const dir = path.dirname(expectedPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      
      // Write stub file
      fs.writeFileSync(expectedPath, stubContent)
      
      this.generatedStubs.push({
        path: relativePath,
        type: moduleType,
        timestamp: new Date().toISOString()
      })
      
      this.logRecovery('success', relativePath, `Generated ${moduleType} stub`, stubContent.split('\n').length)
      console.log(`✅ Generated ${moduleType} stub: ${relativePath}`)
      
    } catch (error) {
      this.logRecovery('error', relativePath, `Failed to generate stub: ${error.message}`)
      console.error(`❌ Failed to generate stub for ${relativePath}:`, error.message)
    }
  }

  /**
   * Determine module type based on path and naming conventions
   */
  determineModuleType(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath))
    const dirName = path.basename(path.dirname(filePath))
    
    // Component patterns
    if (filePath.includes('/components/') || fileName.includes('Dashboard') || fileName.includes('Component')) {
      return 'component'
    }
    
    // Hook patterns
    if (fileName.startsWith('use') || filePath.includes('/hooks/')) {
      return 'hook'
    }
    
    // Type definition patterns
    if (fileName.includes('types') || fileName.includes('interface') || filePath.includes('/types/')) {
      return 'type'
    }
    
    // Default to utility
    return 'utility'
  }

  /**
   * Generate stub content based on module type
   */
  generateStubContent(filePath, moduleType) {
    const fileName = path.basename(filePath, path.extname(filePath))
    const componentName = this.toPascalCase(fileName.replace(/[-_]/g, ' '))
    
    switch (moduleType) {
      case 'component':
        return this.templates.component
          .replace(/{{COMPONENT_NAME}}/g, componentName)
          .replace(/{{FILE_NAME}}/g, fileName)
      
      case 'hook':
        return this.templates.hook
          .replace(/{{HOOK_NAME}}/g, fileName)
          .replace(/{{COMPONENT_NAME}}/g, componentName)
      
      case 'type':
        return this.templates.type
          .replace(/{{TYPE_NAME}}/g, componentName)
          .replace(/{{FILE_NAME}}/g, fileName)
      
      default:
        return this.templates.utility
          .replace(/{{FUNCTION_NAME}}/g, fileName)
          .replace(/{{COMPONENT_NAME}}/g, componentName)
    }
  }

  /**
   * Convert string to PascalCase
   */
  toPascalCase(str) {
    return str.replace(/\w+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).replace(/\s/g, '')
  }

  /**
   * Log recovery action
   */
  logRecovery(status, file, message, details = null) {
    this.recoveryLog.push({
      status,
      file,
      message,
      details,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Generate recovery report
   */
  generateRecoveryReport() {
    console.log('\n🔧 Recovery Assistant Report')
    console.log('=' .repeat(50))
    console.log(`🎯 Stubs generated: ${this.generatedStubs.length}`)
    
    if (this.generatedStubs.length > 0) {
      console.log('\n📝 Generated Stubs:')
      console.log('-'.repeat(50))
      
      this.generatedStubs.forEach((stub, index) => {
        console.log(`${index + 1}. ${stub.type.toUpperCase()}: ${stub.path}`)
      })
      
      console.log('\n⚠️ IMPORTANT: These are placeholder stubs!')
      console.log('Replace them with proper implementations as soon as possible.')
      
      // Save recovery report
      this.saveRecoveryReport()
    }
  }

  /**
   * Save recovery report to file
   */
  saveRecoveryReport() {
    const reportPath = path.join(this.projectRoot, 'recovery-report.json')
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        stubsGenerated: this.generatedStubs.length,
        recoveryActions: this.recoveryLog.length
      },
      generatedStubs: this.generatedStubs,
      recoveryLog: this.recoveryLog
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Recovery report saved to: ${reportPath}`)
  }

  /**
   * Component template
   */
  getComponentTemplate() {
    return `'use client'

/**
 * AUTO-GENERATED STUB: {{COMPONENT_NAME}}
 * This is a placeholder component generated by the Recovery Assistant.
 * Replace this with a proper implementation.
 * 
 * Generated: ${new Date().toISOString()}
 */

import React from 'react'

interface {{COMPONENT_NAME}}Props {
  // Add your props here
  className?: string
  children?: React.ReactNode
}

export function {{COMPONENT_NAME}}({ className, children, ...props }: {{COMPONENT_NAME}}Props) {
  return (
    <div className={className} {...props}>
      <div className="p-4 border-2 border-dashed border-yellow-400 bg-yellow-50 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800">
          🚧 Placeholder Component: {{COMPONENT_NAME}}
        </h3>
        <p className="text-sm text-yellow-700 mt-2">
          This is an auto-generated stub. Replace with proper implementation.
        </p>
        {children}
      </div>
    </div>
  )
}

export default {{COMPONENT_NAME}}
`
  }

  /**
   * Hook template
   */
  getHookTemplate() {
    return `/**
 * AUTO-GENERATED STUB: {{HOOK_NAME}}
 * This is a placeholder hook generated by the Recovery Assistant.
 * Replace this with a proper implementation.
 * 
 * Generated: ${new Date().toISOString()}
 */

import { useState, useEffect } from 'react'

export function {{HOOK_NAME}}() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    console.warn('🚧 Using placeholder hook: {{HOOK_NAME}}')
    console.warn('Replace this with proper implementation')
  }, [])

  return {
    data,
    loading,
    error,
    // Add your hook methods here
  }
}

export default {{HOOK_NAME}}
`
  }

  /**
   * Utility template
   */
  getUtilityTemplate() {
    return `/**
 * AUTO-GENERATED STUB: {{FUNCTION_NAME}}
 * This is a placeholder utility generated by the Recovery Assistant.
 * Replace this with a proper implementation.
 * 
 * Generated: ${new Date().toISOString()}
 */

export interface {{COMPONENT_NAME}}Options {
  // Add your options here
}

export function {{FUNCTION_NAME}}(options?: {{COMPONENT_NAME}}Options) {
  console.warn('🚧 Using placeholder utility: {{FUNCTION_NAME}}')
  console.warn('Replace this with proper implementation')
  
  // Add your implementation here
  return null
}

export default {{FUNCTION_NAME}}
`
  }

  /**
   * Type template
   */
  getTypeTemplate() {
    return `/**
 * AUTO-GENERATED STUB: {{TYPE_NAME}} Types
 * This is a placeholder type definition generated by the Recovery Assistant.
 * Replace this with proper type definitions.
 * 
 * Generated: ${new Date().toISOString()}
 */

export interface {{TYPE_NAME}} {
  id: string
  // Add your properties here
}

export type {{TYPE_NAME}}Status = 'pending' | 'active' | 'inactive'

export interface {{TYPE_NAME}}Options {
  // Add your options here
}

// Add more types as needed
`
  }
}

// Run recovery if called directly
if (require.main === module) {
  const assistant = new RecoveryAssistant()
  assistant.recover().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('❌ Recovery failed:', error)
    process.exit(1)
  })
}

module.exports = RecoveryAssistant
