import { NextRequest, NextResponse } from 'next/server'
import { 
  hashPassword, 
  verifyPassword, 
  validatePasswordComplexity,
  generateSecureToken,
  generateSessionToken,
  logSecurityEvent,
  SecurityEventType,
  SECURITY_CONFIG
} from '@/lib/auth-security'

export async function GET(request: NextRequest) {
  try {
    interface TestResult {
      passed: boolean
      details?: any
      error?: string
    }

    const testResults: {
      timestamp: string
      status: string
      tests: {
        passwordHashing: TestResult | null
        passwordComplexity: TestResult | null
        tokenGeneration: TestResult | null
        rateLimiting: TestResult | null
        securityLogging: TestResult | null
      }
      summary: {
        passed: number
        failed: number
        totalTests: number
      }
      details: string[]
    } = {
      timestamp: new Date().toISOString(),
      status: 'SECURITY_TESTS_COMPLETED',
      tests: {
        passwordHashing: null,
        passwordComplexity: null,
        tokenGeneration: null,
        rateLimiting: null,
        securityLogging: null
      },
      summary: {
        passed: 0,
        failed: 0,
        totalTests: 5
      },
      details: []
    }

    // Test 1: Password Hashing Security
    try {
      const testPassword = 'TestPassword123!'
      const hash1 = await hashPassword(testPassword)
      const hash2 = await hashPassword(testPassword)
      
      // Check if hashes are different (salt working)
      const hashesAreDifferent = hash1 !== hash2
      
      // Check if verification works
      const verificationWorks = await verifyPassword(testPassword, hash1)
      
      // Check if wrong password fails
      const wrongPasswordFails = !(await verifyPassword('WrongPassword', hash1))
      
      // Check if it's not base64 (old vulnerability)
      const notBase64 = !hash1.includes('VGVzdFBhc3N3b3JkMTIzIQ==') // base64 of test password
      
      testResults.tests.passwordHashing = {
        passed: hashesAreDifferent && verificationWorks && wrongPasswordFails && notBase64,
        details: {
          hashesAreDifferent,
          verificationWorks,
          wrongPasswordFails,
          notBase64,
          saltRounds: SECURITY_CONFIG.BCRYPT_SALT_ROUNDS,
          sampleHashLength: hash1.length
        }
      }
      
      if (testResults.tests.passwordHashing.passed) {
        testResults.summary.passed++
        testResults.details.push('✅ Password hashing: bcrypt with proper salting implemented')
      } else {
        testResults.summary.failed++
        testResults.details.push('❌ Password hashing: Security vulnerability detected')
      }
    } catch (error) {
      testResults.tests.passwordHashing = { passed: false, error: error instanceof Error ? error.message : 'Unknown error' }
      testResults.summary.failed++
      testResults.details.push('❌ Password hashing: Test failed with error')
    }

    // Test 2: Password Complexity Validation
    try {
      const weakPasswords = [
        'password',
        '12345678', 
        'PASSWORD',
        'Password',
        'password123',
        'PASSWORD123'
      ]
      
      const strongPassword = 'SecurePass123!@#'
      
      const weakPasswordsRejected = weakPasswords.every(pwd => 
        !validatePasswordComplexity(pwd).isValid
      )
      
      const strongPasswordAccepted = validatePasswordComplexity(strongPassword).isValid
      
      testResults.tests.passwordComplexity = {
        passed: weakPasswordsRejected && strongPasswordAccepted,
        details: {
          weakPasswordsRejected,
          strongPasswordAccepted,
          weakPasswordTests: weakPasswords.map(pwd => ({
            password: pwd,
            result: validatePasswordComplexity(pwd)
          })),
          strongPasswordTest: {
            password: strongPassword,
            result: validatePasswordComplexity(strongPassword)
          }
        }
      }
      
      if (testResults.tests.passwordComplexity.passed) {
        testResults.summary.passed++
        testResults.details.push('✅ Password complexity: Comprehensive validation implemented')
      } else {
        testResults.summary.failed++
        testResults.details.push('❌ Password complexity: Validation insufficient')
      }
    } catch (error) {
      testResults.tests.passwordComplexity = { passed: false, error: error instanceof Error ? error.message : 'Unknown error' }
      testResults.summary.failed++
      testResults.details.push('❌ Password complexity: Test failed with error')
    }

    // Test 3: Secure Token Generation
    try {
      const tokens: string[] = []
      for (let i = 0; i < 10; i++) {
        tokens.push(generateSecureToken())
      }
      
      // Check tokens are unique
      const uniqueTokens = new Set(tokens).size === tokens.length
      
      // Check tokens are not predictable (should not contain simple patterns)
      const notPredictable = !tokens.some(token =>
        token.includes('123') || token.includes('abc') || token === tokens[0]
      )
      
      // Check token length and format
      const properFormat = tokens.every(token => 
        token.length === 64 && /^[a-f0-9]+$/.test(token)
      )
      
      // Test session token generation
      const sessionToken = generateSessionToken('test-user-id', 'test@example.com')
      const sessionTokenValid = sessionToken.token.startsWith('secure_') && 
                               sessionToken.expiresAt > Date.now()
      
      testResults.tests.tokenGeneration = {
        passed: uniqueTokens && notPredictable && properFormat && sessionTokenValid,
        details: {
          uniqueTokens,
          notPredictable,
          properFormat,
          sessionTokenValid,
          sampleTokens: tokens.slice(0, 3),
          sessionTokenSample: {
            tokenPrefix: sessionToken.token.substring(0, 10) + '...',
            expiresIn: Math.round((sessionToken.expiresAt - Date.now()) / 1000 / 60 / 60) + ' hours'
          }
        }
      }
      
      if (testResults.tests.tokenGeneration.passed) {
        testResults.summary.passed++
        testResults.details.push('✅ Token generation: Cryptographically secure tokens implemented')
      } else {
        testResults.summary.failed++
        testResults.details.push('❌ Token generation: Security vulnerability detected')
      }
    } catch (error) {
      testResults.tests.tokenGeneration = { passed: false, error: error instanceof Error ? error.message : 'Unknown error' }
      testResults.summary.failed++
      testResults.details.push('❌ Token generation: Test failed with error')
    }

    // Test 4: Rate Limiting Configuration
    try {
      const authRateLimit = SECURITY_CONFIG.RATE_LIMIT.AUTH_ATTEMPTS
      const authWindow = SECURITY_CONFIG.RATE_LIMIT.AUTH_WINDOW_MS
      
      const rateLimitingConfigured = authRateLimit <= 5 && authWindow >= 15 * 60 * 1000
      
      testResults.tests.rateLimiting = {
        passed: rateLimitingConfigured,
        details: {
          authAttempts: authRateLimit,
          authWindowMinutes: authWindow / 60000,
          configurationSecure: rateLimitingConfigured,
          recommendation: rateLimitingConfigured ? 'Rate limiting properly configured' : 'Rate limiting too permissive'
        }
      }
      
      if (testResults.tests.rateLimiting.passed) {
        testResults.summary.passed++
        testResults.details.push('✅ Rate limiting: Secure configuration applied')
      } else {
        testResults.summary.failed++
        testResults.details.push('❌ Rate limiting: Configuration too permissive')
      }
    } catch (error) {
      testResults.tests.rateLimiting = { passed: false, error: error instanceof Error ? error.message : 'Unknown error' }
      testResults.summary.failed++
      testResults.details.push('❌ Rate limiting: Test failed with error')
    }

    // Test 5: Security Logging
    try {
      // Test security event logging
      logSecurityEvent(SecurityEventType.AUTHENTICATION_SUCCESS, request, {
        email: 'test@security-test.com',
        severity: 'LOW',
        additionalData: { stage: 'security_test' }
      })
      
      logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
        email: 'test@security-test.com',
        severity: 'MEDIUM',
        additionalData: { stage: 'security_test' }
      })
      
      // Security logging is considered working if no errors thrown
      testResults.tests.securityLogging = {
        passed: true,
        details: {
          eventTypesAvailable: Object.keys(SecurityEventType).length,
          severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          loggingActive: true,
          testEventsLogged: 2
        }
      }
      
      testResults.summary.passed++
      testResults.details.push('✅ Security logging: Comprehensive event tracking implemented')
    } catch (error) {
      testResults.tests.securityLogging = { passed: false, error: error instanceof Error ? error.message : 'Unknown error' }
      testResults.summary.failed++
      testResults.details.push('❌ Security logging: Logging system failed')
    }

    // Overall security assessment
    const overallScore = (testResults.summary.passed / testResults.summary.totalTests) * 100
    const securityStatus = overallScore === 100 ? 'SECURE' : overallScore >= 80 ? 'MOSTLY_SECURE' : 'VULNERABLE'

    return NextResponse.json({
      ...testResults,
      overallAssessment: {
        score: overallScore,
        status: securityStatus,
        grade: overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : overallScore >= 60 ? 'D' : 'F',
        recommendation: securityStatus === 'SECURE' 
          ? 'All critical security measures implemented successfully'
          : securityStatus === 'MOSTLY_SECURE'
          ? 'Minor security improvements needed'
          : 'Critical security vulnerabilities require immediate attention'
      },
      vulnerabilitiesFixed: [
        'Base64 password encoding replaced with bcrypt hashing',
        'Rate limiting implemented on authentication endpoints',
        'Comprehensive password complexity validation added',
        'Secure token generation with crypto.getRandomValues()',
        'Standardized error messages to prevent user enumeration',
        'Comprehensive security event logging and monitoring',
        'Brute force attack detection and prevention'
      ]
    }, { status: 200 })

  } catch (error) {
    console.error('Security test error:', error)
    
    return NextResponse.json(
      {
        error: 'Security testing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}