import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

interface ErrorEntry {
  timestamp: string
  level: 'ERROR' | 'WARN' | 'INFO'
  component: string
  message: string
  stack?: string
  url?: string
  userAgent?: string
  metadata?: Record<string, any>
}

const ERROR_LOG_DIR = path.join(process.cwd(), 'logs')
const ERROR_LOG_FILE = path.join(ERROR_LOG_DIR, 'errors.json')

// Ensure logs directory exists
async function ensureLogDir() {
  if (!existsSync(ERROR_LOG_DIR)) {
    await mkdir(ERROR_LOG_DIR, { recursive: true })
  }
}

// Read existing errors
async function readErrors(): Promise<ErrorEntry[]> {
  try {
    if (!existsSync(ERROR_LOG_FILE)) {
      return []
    }
    const data = await readFile(ERROR_LOG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to read error log:', error)
    return []
  }
}

// Write errors to file
async function writeErrors(errors: ErrorEntry[]) {
  try {
    await ensureLogDir()
    await writeFile(ERROR_LOG_FILE, JSON.stringify(errors, null, 2))
  } catch (error) {
    console.error('Failed to write error log:', error)
  }
}

// POST: Log a new error
export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json()
    
    const errorEntry: ErrorEntry = {
      timestamp: new Date().toISOString(),
      level: errorData.level || 'ERROR',
      component: errorData.component || 'Unknown',
      message: errorData.message || 'No message provided',
      stack: errorData.stack,
      url: errorData.url || request.headers.get('referer'),
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: errorData.metadata
    }

    // Read existing errors
    const errors = await readErrors()
    
    // Add new error
    errors.unshift(errorEntry) // Add to beginning
    
    // Keep only last 1000 errors
    if (errors.length > 1000) {
      errors.splice(1000)
    }
    
    // Write back to file
    await writeErrors(errors)
    
    console.error(`[${errorEntry.level}] ${errorEntry.component}: ${errorEntry.message}`)
    
    return NextResponse.json({ success: true, logged: errorEntry.timestamp })
  } catch (error) {
    console.error('Error logging system failed:', error)
    return NextResponse.json(
      { error: 'Failed to log error' },
      { status: 500 }
    )
  }
}

// GET: Retrieve errors with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')
    const component = searchParams.get('component')
    const limit = parseInt(searchParams.get('limit') || '100')
    const since = searchParams.get('since') // ISO timestamp
    
    let errors = await readErrors()
    
    // Apply filters
    if (level) {
      errors = errors.filter(e => e.level === level.toUpperCase())
    }
    
    if (component) {
      errors = errors.filter(e => e.component.toLowerCase().includes(component.toLowerCase()))
    }
    
    if (since) {
      const sinceDate = new Date(since)
      errors = errors.filter(e => new Date(e.timestamp) > sinceDate)
    }
    
    // Apply limit
    errors = errors.slice(0, limit)
    
    // Get summary statistics
    const allErrors = await readErrors()
    const summary = {
      total: allErrors.length,
      byLevel: {
        ERROR: allErrors.filter(e => e.level === 'ERROR').length,
        WARN: allErrors.filter(e => e.level === 'WARN').length,
        INFO: allErrors.filter(e => e.level === 'INFO').length
      },
      byComponent: allErrors.reduce((acc, error) => {
        acc[error.component] = (acc[error.component] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      lastHour: allErrors.filter(e => 
        new Date(e.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
      ).length
    }
    
    return NextResponse.json({
      errors,
      summary,
      filters: { level, component, limit, since }
    })
  } catch (error) {
    console.error('Failed to retrieve errors:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve errors' },
      { status: 500 }
    )
  }
}

// DELETE: Clear error logs
export async function DELETE() {
  try {
    await writeErrors([])
    return NextResponse.json({ success: true, message: 'Error logs cleared' })
  } catch (error) {
    console.error('Failed to clear error logs:', error)
    return NextResponse.json(
      { error: 'Failed to clear error logs' },
      { status: 500 }
    )
  }
}
