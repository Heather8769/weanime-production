import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { contentModerator } from '@/lib/content-moderation'


interface FeedbackItem {
  id?: string
  type: 'bug' | 'feature' | 'general' | 'performance'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in-progress' | 'resolved' | 'closed'
  rating?: number
  userId?: string
  userEmail?: string
  createdAt: string
  updatedAt: string
  metadata?: {
    url?: string
    userAgent?: string
    deviceInfo?: string
    reproductionSteps?: string[]
    expectedBehavior?: string
    actualBehavior?: string
    screenshots?: string[]
  }
  votes: {
    up: number
    down: number
    userVote?: 'up' | 'down'
  }
}

// In-memory storage for development (use Supabase in production)
let feedbackStorage: FeedbackItem[] = []

export async function POST(request: NextRequest) {
  try {
    const feedbackData: Partial<FeedbackItem> = await request.json()
    
    // Validate required fields
    if (!feedbackData.title || !feedbackData.description || !feedbackData.type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, type' },
        { status: 400 }
      )
    }

    // Moderate content before storing
    const moderationResult = await contentModerator.moderateContent({
      id: `temp_${Date.now()}`,
      type: 'comment', // Treat feedback as comment for moderation
      content: `${feedbackData.title}\n\n${feedbackData.description}`,
      userId: feedbackData.userId || 'anonymous',
      userEmail: feedbackData.userEmail,
      createdAt: new Date().toISOString()
    })

    // Handle moderation result
    if (!moderationResult.isApproved && moderationResult.suggestedAction === 'reject') {
      return NextResponse.json(
        {
          error: 'Content violates community guidelines',
          details: moderationResult.flags.map(f => f.details),
          moderationFlags: moderationResult.flags
        },
        { status: 400 }
      )
    }

    // Create feedback item with moderated content
    const feedback: FeedbackItem = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: feedbackData.type,
      title: moderationResult.moderatedContent ?
        moderationResult.moderatedContent.split('\n\n')[0] : feedbackData.title,
      description: moderationResult.moderatedContent ?
        moderationResult.moderatedContent.split('\n\n')[1] || feedbackData.description : feedbackData.description,
      priority: feedbackData.priority || 'medium',
      status: 'open',
      rating: feedbackData.rating,
      userId: feedbackData.userId,
      userEmail: feedbackData.userEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: feedbackData.metadata,
      votes: { up: 0, down: 0 }
    }

    // Store in memory (replace with Supabase in production)
    feedbackStorage.push(feedback)

    // Try to store in Supabase if available
    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          id: feedback.id,
          type: feedback.type,
          title: feedback.title,
          description: feedback.description,
          priority: feedback.priority,
          status: feedback.status,
          rating: feedback.rating,
          user_id: feedback.userId,
          user_email: feedback.userEmail,
          metadata: feedback.metadata,
          votes_up: 0,
          votes_down: 0,
          created_at: feedback.createdAt,
          updated_at: feedback.updatedAt
        })

      if (error) {
        console.warn('Failed to store feedback in Supabase:', error)
      }
    } catch (supabaseError) {
      console.warn('Supabase not available, using in-memory storage:', supabaseError)
    }

    // Store moderation metadata
    if (moderationResult.flags.length > 0) {
      feedback.metadata = {
        ...feedback.metadata,
        moderationData: JSON.stringify({
          flags: moderationResult.flags,
          confidence: moderationResult.confidence,
          action: moderationResult.suggestedAction
        })
      } as any
    }

    // Log feedback submission for monitoring
    console.log(`📝 New ${feedback.type} feedback submitted:`, {
      id: feedback.id,
      title: feedback.title,
      priority: feedback.priority,
      userId: feedback.userId,
      moderated: moderationResult.moderatedContent !== undefined
    })

    // Send notification for high/critical priority items
    if (feedback.priority === 'high' || feedback.priority === 'critical') {
      console.warn(`🚨 ${feedback.priority.toUpperCase()} priority feedback received:`, {
        id: feedback.id,
        title: feedback.title,
        type: feedback.type
      })
      
      // Here you would send notifications to your team
      // await sendSlackNotification(feedback)
      // await sendEmailNotification(feedback)
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback.id,
        type: feedback.type,
        title: feedback.title,
        status: feedback.status,
        priority: feedback.priority
      }
    })

  } catch (error) {
    console.error('Error submitting feedback:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to submit feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')

    let feedback: FeedbackItem[] = []

    // Try to get from Supabase first
    try {
      let query = supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (type) query = query.eq('type', type)
      if (status) query = query.eq('status', status)
      if (priority) query = query.eq('priority', priority)
      if (userId) query = query.eq('user_id', userId)

      const { data, error } = await query

      if (!error && data) {
        feedback = data.map(item => ({
          id: item.id,
          type: item.type,
          title: item.title,
          description: item.description,
          priority: item.priority,
          status: item.status,
          rating: item.rating,
          userId: item.user_id,
          userEmail: item.user_email,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          metadata: item.metadata,
          votes: {
            up: item.votes_up || 0,
            down: item.votes_down || 0
          }
        }))
      }
    } catch (supabaseError) {
      console.warn('Supabase not available, using in-memory storage:', supabaseError)
    }

    // Fallback to in-memory storage
    if (feedback.length === 0) {
      feedback = [...feedbackStorage]
      
      // Apply filters
      if (type) feedback = feedback.filter(item => item.type === type)
      if (status) feedback = feedback.filter(item => item.status === status)
      if (priority) feedback = feedback.filter(item => item.priority === priority)
      if (userId) feedback = feedback.filter(item => item.userId === userId)
      
      // Sort by creation date (newest first)
      feedback.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      // Limit results
      feedback = feedback.slice(0, limit)
    }

    // Calculate statistics
    const stats = {
      total: feedback.length,
      byType: {
        bug: feedback.filter(f => f.type === 'bug').length,
        feature: feedback.filter(f => f.type === 'feature').length,
        general: feedback.filter(f => f.type === 'general').length,
        performance: feedback.filter(f => f.type === 'performance').length
      },
      byStatus: {
        open: feedback.filter(f => f.status === 'open').length,
        'in-progress': feedback.filter(f => f.status === 'in-progress').length,
        resolved: feedback.filter(f => f.status === 'resolved').length,
        closed: feedback.filter(f => f.status === 'closed').length
      },
      byPriority: {
        low: feedback.filter(f => f.priority === 'low').length,
        medium: feedback.filter(f => f.priority === 'medium').length,
        high: feedback.filter(f => f.priority === 'high').length,
        critical: feedback.filter(f => f.priority === 'critical').length
      },
      averageRating: feedback.filter(f => f.rating).reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.filter(f => f.rating).length || 0
    }

    return NextResponse.json({
      success: true,
      feedback,
      stats,
      totalCount: feedback.length,
      filters: { type, status, priority, userId, limit },
      generatedAt: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Error retrieving feedback:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feedbackId = searchParams.get('id')
    const updates = await request.json()

    if (!feedbackId) {
      return NextResponse.json(
        { error: 'Feedback ID is required' },
        { status: 400 }
      )
    }

    // Update in memory storage
    const feedbackIndex = feedbackStorage.findIndex(f => f.id === feedbackId)
    if (feedbackIndex >= 0) {
      feedbackStorage[feedbackIndex] = {
        ...feedbackStorage[feedbackIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      }
    }

    // Update in Supabase if available
    try {
      const { error } = await supabase
        .from('feedback')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', feedbackId)

      if (error) {
        console.warn('Failed to update feedback in Supabase:', error)
      }
    } catch (supabaseError) {
      console.warn('Supabase not available for update:', supabaseError)
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback updated successfully'
    })

  } catch (error) {
    console.error('Error updating feedback:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to update feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
