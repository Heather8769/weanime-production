import { NextRequest, NextResponse } from 'next/server'
import { getEnvConfig } from '@/lib/env-validation'

// Simple Crunchyroll credentials test endpoint
export async function GET(request: NextRequest) {
  try {
    const config = getEnvConfig()
    
    // Check if Crunchyroll is enabled and credentials are available
    const crunchyrollConfig = config.streaming.crunchyroll
    
    if (!crunchyrollConfig.enabled) {
      return NextResponse.json({
        success: false,
        error: 'Crunchyroll integration is disabled',
        config: {
          enabled: false,
          hasEmail: false,
          hasPassword: false
        }
      })
    }

    const hasEmail = !!crunchyrollConfig.email
    const hasPassword = !!crunchyrollConfig.password
    const hasCredentials = hasEmail && hasPassword

    // Test basic connectivity (without actually logging in)
    let connectivityTest = false
    try {
      const testResponse = await fetch('https://www.crunchyroll.com', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      })
      connectivityTest = testResponse.ok
    } catch (error) {
      console.warn('Crunchyroll connectivity test failed:', error)
    }

    return NextResponse.json({
      success: true,
      config: {
        enabled: crunchyrollConfig.enabled,
        hasEmail,
        hasPassword,
        hasCredentials,
        locale: crunchyrollConfig.locale,
        bridgeUrl: crunchyrollConfig.bridgeUrl
      },
      connectivity: {
        canReachCrunchyroll: connectivityTest
      },
      status: hasCredentials ? 'ready' : 'missing-credentials',
      message: hasCredentials 
        ? 'Crunchyroll integration is configured and ready'
        : 'Crunchyroll integration is enabled but missing credentials',
      nextSteps: hasCredentials 
        ? [
          'Install Rust toolchain: curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh',
          'Build Crunchyroll bridge: cd crunchyroll-bridge && cargo build',
          'Start bridge service: cd crunchyroll-bridge && cargo run -- login',
          'Test real content integration'
        ]
        : [
          'Add CRUNCHYROLL_EMAIL to .env.local',
          'Add CRUNCHYROLL_PASSWORD to .env.local',
          'Set FEATURE_CRUNCHYROLL_ENABLED=true'
        ]
    })

  } catch (error) {
    console.error('Crunchyroll test error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to test Crunchyroll configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
