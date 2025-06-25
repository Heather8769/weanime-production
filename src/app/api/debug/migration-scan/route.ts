import { NextRequest, NextResponse } from 'next/server'
import { scanForVulnerableUsage, formatMigrationReport } from '@/lib/crunchyroll-bridge-migration'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting Crunchyroll Bridge Security Migration Scan...')
    
    const report = await scanForVulnerableUsage('./src')
    const formattedReport = formatMigrationReport(report)
    
    console.log(formattedReport)
    
    const hasVulnerabilities = report.issues.length > 0
    
    return NextResponse.json({
      success: true,
      migration: {
        timestamp: new Date().toISOString(),
        summary: {
          totalFiles: report.totalFiles,
          filesWithIssues: report.filesWithIssues,
          totalIssues: report.issues.length,
          hasVulnerabilities
        },
        issues: report.issues,
        migrationSteps: report.migrationSteps,
        formattedReport,
        urgency: hasVulnerabilities ? 'HIGH' : 'LOW',
        status: hasVulnerabilities ? 'MIGRATION_REQUIRED' : 'SECURE',
        recommendations: hasVulnerabilities ? [
          'URGENT: Update all vulnerable imports to use SecureCrunchyrollBridge',
          'Replace spawn("curl") usage with fetch API',
          'Test all Crunchyroll functionality after migration',
          'Remove deprecated executeBridgeCommand usage',
          'Validate input sanitization in all bridge calls'
        ] : [
          '✅ All files are using secure implementations',
          'No immediate migration required',
          'Continue monitoring for new vulnerable patterns'
        ]
      }
    })
    
  } catch (error) {
    console.error('❌ Migration scan failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to run migration scan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, filePath } = await request.json()
    
    if (action === 'auto-migrate' && filePath) {
      const { autoMigrate } = await import('@/lib/crunchyroll-bridge-migration')
      const success = await autoMigrate(filePath)
      
      return NextResponse.json({
        success,
        message: success 
          ? `Successfully auto-migrated ${filePath}` 
          : `Could not auto-migrate ${filePath} - manual review required`
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action or missing filePath'
    }, { status: 400 })
    
  } catch (error) {
    console.error('❌ Auto-migration failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to run auto-migration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}