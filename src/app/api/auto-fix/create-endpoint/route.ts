import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'


// Required for static export
export const dynamic = 'force-static'
export async function POST(request: NextRequest) {
  try {
    const { endpoint, type } = await request.json()

    if (!endpoint || !type) {
      return NextResponse.json(
        { error: 'Missing endpoint or type parameter' },
        { status: 400 }
      )
    }

    // Generate endpoint code based on type
    const endpointCode = generateEndpointCode(endpoint, type)
    
    // Determine file path
    const filePath = getEndpointFilePath(endpoint)
    
    // Create directory if it doesn't exist
    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'))
    await mkdir(dirPath, { recursive: true })
    
    // Write the endpoint file
    await writeFile(filePath, endpointCode)

    return NextResponse.json({
      success: true,
      message: `Created endpoint: ${endpoint}`,
      filePath,
      code: endpointCode
    })

  } catch (error) {
    console.error('Failed to create endpoint:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create endpoint',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function generateEndpointCode(endpoint: string, type: string): string {
  const imports = `import { NextRequest, NextResponse } from 'next/server'`
  
  switch (type) {
    case 'streaming-test':
      return `${imports}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      streaming: {
        available: true,
        services: ['crunchyroll'],
        test: 'passed'
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    return NextResponse.json({
      status: 'success',
      message: 'Streaming test completed',
      data: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}`

    case 'generic':
    default:
      return `${imports}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    return NextResponse.json({
      status: 'success',
      endpoint: '${endpoint}',
      method: 'GET',
      timestamp: new Date().toISOString(),
      params: Object.fromEntries(searchParams.entries())
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    return NextResponse.json({
      status: 'success',
      endpoint: '${endpoint}',
      method: 'POST',
      timestamp: new Date().toISOString(),
      data: body
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}`
  }
}

function getEndpointFilePath(endpoint: string): string {
  // Convert /api/path/to/endpoint to src/app/api/path/to/endpoint/route.ts
  const pathParts = endpoint.split('/').filter(part => part !== '' && part !== 'api')
  const filePath = join(process.cwd(), 'src', 'app', 'api', ...pathParts, 'route.ts')
  return filePath
}
