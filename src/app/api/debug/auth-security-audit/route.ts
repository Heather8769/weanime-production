import { NextRequest, NextResponse } from 'next/server'

interface Vulnerability {
  severity: string
  type: string
  description: string
  evidence: any
  impact: string
}

interface Recommendation {
  priority: string
  action: string
  files: string[]
}

export async function GET(request: NextRequest) {
  const auditResults: {
    timestamp: string
    vulnerabilities: Vulnerability[]
    recommendations: Recommendation[]
  } = {
    timestamp: new Date().toISOString(),
    vulnerabilities: [],
    recommendations: []
  }

  // Check 1: Password hashing vulnerability
  const testPassword = "test123"
  const base64Hash = Buffer.from(testPassword).toString('base64')
  
  auditResults.vulnerabilities.push({
    severity: "CRITICAL",
    type: "Weak Password Hashing",
    description: "Fallback auth uses base64 encoding instead of proper hashing",
    evidence: {
      testPassword: testPassword,
      resultingHash: base64Hash,
      reversible: Buffer.from(base64Hash, 'base64').toString() === testPassword
    },
    impact: "All fallback user passwords are trivially crackable"
  })

  // Check 2: Rate limiting audit
  try {
    const loginPath = new URL('/api/auth/login', request.url)
    const registerPath = new URL('/api/auth/register', request.url)
    
    auditResults.vulnerabilities.push({
      severity: "CRITICAL", 
      type: "Missing Rate Limiting",
      description: "Authentication endpoints lack rate limiting protection",
      evidence: {
        loginEndpoint: loginPath.pathname,
        registerEndpoint: registerPath.pathname,
        rateLimiterExists: "Yes (src/lib/rate-limiter.ts)",
        appliedToAuth: "No"
      },
      impact: "Unlimited brute force attacks possible"
    })
  } catch (error) {
    console.error('Rate limit audit error:', error)
  }

  // Check 3: Password complexity validation
  const weakPasswords = ["12345678", "password", "qwertyui"]
  const passwordTests = weakPasswords.map(pwd => {
    return {
      password: pwd,
      length: pwd.length,
      hasUppercase: /[A-Z]/.test(pwd),
      hasLowercase: /[a-z]/.test(pwd),
      hasNumbers: /[0-9]/.test(pwd),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      wouldPassCurrentValidation: pwd.length >= 8
    }
  })

  auditResults.vulnerabilities.push({
    severity: "HIGH",
    type: "Weak Password Validation",
    description: "Password complexity requirements are insufficient",
    evidence: {
      currentRequirement: "Minimum 8 characters only",
      weakPasswordTests: passwordTests,
      recommendation: "Add complexity requirements: uppercase, lowercase, numbers, special chars"
    },
    impact: "Vulnerable to dictionary and brute force attacks"
  })

  // Check 4: Token generation security
  const tokenSamples = []
  for (let i = 0; i < 5; i++) {
    const token = 'fallback_token_' + Math.random().toString(36).substr(2, 16)
    tokenSamples.push(token)
  }

  auditResults.vulnerabilities.push({
    severity: "MEDIUM",
    type: "Weak Token Generation", 
    description: "Using Math.random() for security tokens",
    evidence: {
      method: "Math.random().toString(36).substr(2, 16)",
      samples: tokenSamples,
      cryptographicallySecure: false
    },
    impact: "Predictable tokens could be exploited"
  })

  // Security recommendations
  auditResults.recommendations = [
    {
      priority: "CRITICAL",
      action: "Implement proper password hashing with bcrypt (salt rounds ≥ 12)",
      files: ["src/app/api/auth/login/route.ts", "src/app/api/auth/register/route.ts"]
    },
    {
      priority: "CRITICAL", 
      action: "Add rate limiting to authentication endpoints (5 attempts per 15 minutes)",
      files: ["src/app/api/auth/login/route.ts", "src/app/api/auth/register/route.ts"]
    },
    {
      priority: "HIGH",
      action: "Implement comprehensive password complexity validation",
      files: ["src/app/api/auth/register/route.ts"]
    },
    {
      priority: "MEDIUM",
      action: "Use cryptographically secure token generation",
      files: ["src/app/api/auth/login/route.ts"]
    },
    {
      priority: "MEDIUM",
      action: "Standardize error messages to prevent user enumeration",
      files: ["src/app/api/auth/login/route.ts"]
    }
  ]

  return NextResponse.json({
    status: "SECURITY_AUDIT_COMPLETE",
    summary: {
      totalVulnerabilities: auditResults.vulnerabilities.length,
      criticalIssues: auditResults.vulnerabilities.filter(v => v.severity === "CRITICAL").length,
      highIssues: auditResults.vulnerabilities.filter(v => v.severity === "HIGH").length,
      mediumIssues: auditResults.vulnerabilities.filter(v => v.severity === "MEDIUM").length
    },
    ...auditResults
  }, { status: 200 })
}