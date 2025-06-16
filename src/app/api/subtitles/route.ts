import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const episodeId = searchParams.get('episodeId')
    
    if (!episodeId) {
      return NextResponse.json(
        { success: false, error: 'Episode ID is required' },
        { status: 400 }
      )
    }

    // Return empty subtitles for now - real implementation would fetch from Crunchyroll
    return NextResponse.json({
      success: true,
      subtitles: [],
      episodeId
    })
  } catch (error) {
    console.error('Subtitles API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subtitles' },
      { status: 500 }
    )
  }
}