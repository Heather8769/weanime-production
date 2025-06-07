import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const performanceMetric = await request.json()
    
    // Validate the performance metric
    if (!performanceMetric.name || typeof performanceMetric.value !== 'number') {
      return NextResponse.json(
        { error: 'Metric name and value are required' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = createClient()

    // Store performance metric in database (optional)
    const { error } = await supabase
      .from('performance_metrics')
      .insert({
        name: performanceMetric.name,
        value: performanceMetric.value,
        timestamp: performanceMetric.timestamp || Date.now(),
        url: performanceMetric.url,
        user_id: performanceMetric.userId,
        additional_data: performanceMetric.additionalData,
        created_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Failed to store performance metric in database:', error)
      // Don't fail the request if database storage fails
    }

    // In production, you might want to send to analytics service
    if (process.env.NODE_ENV === 'production') {
      await sendToAnalyticsService(performanceMetric)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in performance analytics endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function sendToAnalyticsService(metric: any) {
  // Implementation for analytics service
  // This could be Google Analytics, Mixpanel, Amplitude, etc.
  
  if (process.env.NEXT_PUBLIC_ANALYTICS_ID) {
    // Send to Google Analytics
    try {
      // This would use gtag or Google Analytics 4
      console.log('Would send to Google Analytics:', metric)
    } catch (error) {
      console.error('Failed to send to Google Analytics:', error)
    }
  }

  if (process.env.MIXPANEL_TOKEN) {
    // Send to Mixpanel
    try {
      console.log('Would send to Mixpanel:', metric)
    } catch (error) {
      console.error('Failed to send to Mixpanel:', error)
    }
  }
}
