#!/usr/bin/env node

/**
 * Deployment Script with Automatic Recovery
 * Combines import validation and recovery assistance to ensure
 * robust deployments that automatically fix missing component issues.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const ImportValidator = require('./import-validator')
const RecoveryAssistant = require('./recovery-assistant')

class DeploymentManager {
  constructor() {
    this.projectRoot = process.cwd()
    this.maxRecoveryAttempts = 3
    this.deploymentLog = []
  }

  /**
   * Main deployment function with recovery
   */
  async deploy() {
    console.log('🚀 Starting deployment with automatic recovery...')
    this.logAction('info', 'Deployment started')
    
    try {
      // Step 1: Pre-deployment validation
      console.log('\n📋 Step 1: Pre-deployment validation')
      const preValidationSuccess = await this.runPreValidation()
      
      if (!preValidationSuccess) {
        console.log('\n🔧 Step 2: Attempting automatic recovery')
        const recoverySuccess = await this.attemptRecovery()
        
        if (!recoverySuccess) {
          throw new Error('Recovery failed - manual intervention required')
        }
        
        // Re-validate after recovery
        console.log('\n🔍 Step 3: Post-recovery validation')
        const postValidationSuccess = await this.runPreValidation()
        
        if (!postValidationSuccess) {
          throw new Error('Validation still failing after recovery')
        }
      }
      
      // Step 4: Build the project
      console.log('\n🏗️ Step 4: Building project')
      await this.buildProject()
      
      // Step 5: Final validation
      console.log('\n✅ Step 5: Final deployment validation')
      await this.runFinalValidation()
      
      console.log('\n🎉 Deployment completed successfully!')
      this.logAction('success', 'Deployment completed successfully')
      
      // Generate deployment report
      this.generateDeploymentReport()
      
      return true
      
    } catch (error) {
      console.error(`\n❌ Deployment failed: ${error.message}`)
      this.logAction('error', `Deployment failed: ${error.message}`)
      this.generateDeploymentReport()
      return false
    }
  }

  /**
   * Run pre-deployment validation
   */
  async runPreValidation() {
    this.logAction('info', 'Running pre-deployment validation')
    
    try {
      const validator = new ImportValidator()
      const success = await validator.validate()
      
      if (success) {
        console.log('✅ Pre-deployment validation passed')
        this.logAction('success', 'Pre-deployment validation passed')
      } else {
        console.log('❌ Pre-deployment validation failed')
        this.logAction('warning', `Pre-deployment validation failed - ${validator.issues.length} issues found`)
      }
      
      return success
    } catch (error) {
      this.logAction('error', `Pre-deployment validation error: ${error.message}`)
      return false
    }
  }

  /**
   * Attempt automatic recovery
   */
  async attemptRecovery() {
    this.logAction('info', 'Starting automatic recovery')
    
    for (let attempt = 1; attempt <= this.maxRecoveryAttempts; attempt++) {
      console.log(`\n🔧 Recovery attempt ${attempt}/${this.maxRecoveryAttempts}`)
      
      try {
        const assistant = new RecoveryAssistant()
        const success = await assistant.recover()
        
        if (success) {
          console.log(`✅ Recovery attempt ${attempt} succeeded`)
          this.logAction('success', `Recovery attempt ${attempt} succeeded`)
          return true
        } else {
          console.log(`⚠️ Recovery attempt ${attempt} had no effect`)
          this.logAction('warning', `Recovery attempt ${attempt} had no effect`)
        }
      } catch (error) {
        console.log(`❌ Recovery attempt ${attempt} failed: ${error.message}`)
        this.logAction('error', `Recovery attempt ${attempt} failed: ${error.message}`)
      }
      
      // Wait before next attempt
      if (attempt < this.maxRecoveryAttempts) {
        console.log('⏳ Waiting before next attempt...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    this.logAction('error', 'All recovery attempts failed')
    return false
  }

  /**
   * Build the project
   */
  async buildProject() {
    this.logAction('info', 'Starting project build')
    
    try {
      console.log('📦 Installing dependencies...')
      execSync('npm ci', { stdio: 'inherit', cwd: this.projectRoot })
      
      console.log('🏗️ Building project...')
      execSync('npm run build', { stdio: 'inherit', cwd: this.projectRoot })
      
      console.log('✅ Build completed successfully')
      this.logAction('success', 'Project build completed successfully')
      
    } catch (error) {
      const errorMessage = `Build failed: ${error.message}`
      this.logAction('error', errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * Run final validation
   */
  async runFinalValidation() {
    this.logAction('info', 'Running final validation')
    
    try {
      // Check if build output exists
      const buildDir = path.join(this.projectRoot, '.next')
      if (!fs.existsSync(buildDir)) {
        throw new Error('Build output directory not found')
      }
      
      // Run TypeScript check
      console.log('🔍 Running TypeScript check...')
      execSync('npx tsc --noEmit', { stdio: 'inherit', cwd: this.projectRoot })
      
      // Run final import validation
      console.log('🔍 Running final import validation...')
      const validator = new ImportValidator()
      const success = await validator.validate()
      
      if (!success) {
        throw new Error('Final import validation failed')
      }
      
      console.log('✅ Final validation passed')
      this.logAction('success', 'Final validation passed')
      
    } catch (error) {
      const errorMessage = `Final validation failed: ${error.message}`
      this.logAction('error', errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * Log deployment action
   */
  logAction(level, message) {
    this.deploymentLog.push({
      level,
      message,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Generate deployment report
   */
  generateDeploymentReport() {
    const reportPath = path.join(this.projectRoot, 'deployment-report.json')
    const report = {
      timestamp: new Date().toISOString(),
      success: this.deploymentLog.some(log => log.message.includes('completed successfully')),
      summary: {
        totalActions: this.deploymentLog.length,
        errors: this.deploymentLog.filter(log => log.level === 'error').length,
        warnings: this.deploymentLog.filter(log => log.level === 'warning').length,
        successes: this.deploymentLog.filter(log => log.level === 'success').length
      },
      log: this.deploymentLog
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Deployment report saved to: ${reportPath}`)
  }

  /**
   * Integration with error monitoring
   */
  async sendToErrorMonitoring(error) {
    try {
      // Send deployment error to monitoring system
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          component: 'deployment',
          message: error.message,
          context: 'deployment-script',
          timestamp: new Date().toISOString(),
          metadata: {
            deploymentLog: this.deploymentLog
          }
        })
      })
    } catch (e) {
      console.warn('Failed to send error to monitoring:', e.message)
    }
  }
}

// Add to package.json scripts integration
function updatePackageJsonScripts() {
  const packageJsonPath = path.join(process.cwd(), 'package.json')
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    
    // Add new scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      'validate-imports': 'node scripts/import-validator.js',
      'recover-missing': 'node scripts/recovery-assistant.js',
      'deploy-safe': 'node scripts/deploy-with-recovery.js',
      'prebuild': 'node scripts/import-validator.js'
    }
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
    console.log('✅ Updated package.json with new scripts')
    
  } catch (error) {
    console.warn('⚠️ Could not update package.json:', error.message)
  }
}

// Run deployment if called directly
if (require.main === module) {
  const manager = new DeploymentManager()
  
  // Update package.json scripts
  updatePackageJsonScripts()
  
  manager.deploy().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('❌ Deployment script failed:', error)
    process.exit(1)
  })
}

module.exports = DeploymentManager
