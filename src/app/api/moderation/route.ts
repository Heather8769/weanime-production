import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { contentModerator, ModerationResult, ContentItem, ModerationAction } from '@/lib/content-moderation'

// In-memory storage for moderation actions (use database in production)

// Required for static export
export const dynamic = 'force-static'
const moderationActions: ModerationAction[] = []
const pendingReviews: Map<string, ContentItem & { moderationResult: ModerationResult }> = new Map()

export async function POST(request: NextRequest) {
  try {
    const { action, contentId, content, moderatorId, reason } = await request.json()

    switch (action) {
      case 'moderate':
        return await moderateContent(content)
      
      case 'review':
        return await reviewContent(contentId, moderatorId, reason)
      
      case 'approve':
        return await approveContent(contentId, moderatorId, reason)
      
      case 'reject':
        return await rejectContent(contentId, moderatorId, reason)
      
      case 'batch-moderate':
        return await batchModerate(content) // content is array of ContentItem
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: moderate, review, approve, reject, batch-moderate' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in moderation API:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process moderation request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function moderateContent(content: ContentItem): Promise<NextResponse> {
  const moderationResult = await contentModerator.moderateContent(content)
  
  // Store for review if needed
  if (moderationResult.suggestedAction === 'review') {
    pendingReviews.set(content.id, { ...content, moderationResult })
  }

  // Log moderation action
  const action: ModerationAction = {
    id: `mod_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    contentId: content.id,
    action: moderationResult.isApproved ? 'approved' : 'flagged',
    reason: `Automated moderation: ${moderationResult.suggestedAction}`,
    originalContent: content.content,
    moderatedContent: moderationResult.moderatedContent,
    timestamp: new Date().toISOString(),
    isAutomated: true
  }

  moderationActions.push(action)

  // Try to store in Supabase
  try {
    await supabase
      .from('moderation_actions')
      .insert({
        id: action.id,
        content_id: action.contentId,
        moderator_id: action.moderatorId,
        action: action.action,
        reason: action.reason,
        original_content: action.originalContent,
        moderated_content: action.moderatedContent,
        is_automated: action.isAutomated,
        created_at: action.timestamp
      })
  } catch (supabaseError) {
    console.warn('Failed to store moderation action in Supabase:', supabaseError)
  }

  return NextResponse.json({
    success: true,
    moderationResult,
    action: action.action,
    requiresReview: moderationResult.suggestedAction === 'review'
  })
}

async function batchModerate(contents: ContentItem[]): Promise<NextResponse> {
  const results = await contentModerator.moderateBatch(contents)
  const stats = contentModerator.getModerationStats(Array.from(results.values()))
  
  // Store pending reviews
  for (const [contentId, result] of results) {
    if (result.suggestedAction === 'review') {
      const content = contents.find(c => c.id === contentId)
      if (content) {
        pendingReviews.set(contentId, { ...content, moderationResult: result })
      }
    }
  }

  return NextResponse.json({
    success: true,
    results: Object.fromEntries(results),
    stats,
    pendingReviews: Array.from(pendingReviews.keys())
  })
}

async function reviewContent(contentId: string, moderatorId: string, reason: string): Promise<NextResponse> {
  const pendingItem = pendingReviews.get(contentId)
  
  if (!pendingItem) {
    return NextResponse.json(
      { error: 'Content not found in pending reviews' },
      { status: 404 }
    )
  }

  const action: ModerationAction = {
    id: `mod_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    contentId,
    moderatorId,
    action: 'flagged',
    reason: `Manual review: ${reason}`,
    originalContent: pendingItem.content,
    timestamp: new Date().toISOString(),
    isAutomated: false
  }

  moderationActions.push(action)

  return NextResponse.json({
    success: true,
    message: 'Content flagged for review',
    action: action.action
  })
}

async function approveContent(contentId: string, moderatorId: string, reason: string): Promise<NextResponse> {
  const action: ModerationAction = {
    id: `mod_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    contentId,
    moderatorId,
    action: 'approved',
    reason: `Manual approval: ${reason}`,
    timestamp: new Date().toISOString(),
    isAutomated: false
  }

  moderationActions.push(action)
  pendingReviews.delete(contentId)

  // Update content status in database
  try {
    await supabase
      .from('comments')
      .update({ moderation_status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', contentId)
  } catch (error) {
    console.warn('Failed to update content status:', error)
  }

  return NextResponse.json({
    success: true,
    message: 'Content approved',
    action: action.action
  })
}

async function rejectContent(contentId: string, moderatorId: string, reason: string): Promise<NextResponse> {
  const action: ModerationAction = {
    id: `mod_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    contentId,
    moderatorId,
    action: 'rejected',
    reason: `Manual rejection: ${reason}`,
    timestamp: new Date().toISOString(),
    isAutomated: false
  }

  moderationActions.push(action)
  pendingReviews.delete(contentId)

  // Update content status in database
  try {
    await supabase
      .from('comments')
      .update({ moderation_status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', contentId)
  } catch (error) {
    console.warn('Failed to update content status:', error)
  }

  return NextResponse.json({
    success: true,
    message: 'Content rejected',
    action: action.action
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'pending', 'actions', 'stats'
    const limit = parseInt(searchParams.get('limit') || '50')
    const moderatorId = searchParams.get('moderatorId')

    switch (type) {
      case 'pending':
        return getPendingReviews(limit)
      
      case 'actions':
        return getModerationActions(limit, moderatorId || undefined)
      
      case 'stats':
        return getModerationStats()
      
      default:
        return NextResponse.json({
          success: true,
          pendingReviews: Array.from(pendingReviews.values()).slice(0, limit),
          recentActions: moderationActions.slice(-limit),
          stats: {
            totalActions: moderationActions.length,
            pendingReviews: pendingReviews.size,
            automatedActions: moderationActions.filter(a => a.isAutomated).length,
            manualActions: moderationActions.filter(a => !a.isAutomated).length
          }
        })
    }

  } catch (error) {
    console.error('Error retrieving moderation data:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve moderation data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getPendingReviews(limit: number): Promise<NextResponse> {
  const pending = Array.from(pendingReviews.values()).slice(0, limit)
  
  return NextResponse.json({
    success: true,
    pendingReviews: pending,
    totalPending: pendingReviews.size
  })
}

async function getModerationActions(limit: number, moderatorId?: string): Promise<NextResponse> {
  let actions = [...moderationActions]
  
  if (moderatorId) {
    actions = actions.filter(a => a.moderatorId === moderatorId)
  }
  
  actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  actions = actions.slice(0, limit)
  
  return NextResponse.json({
    success: true,
    actions,
    totalActions: moderationActions.length
  })
}

async function getModerationStats(): Promise<NextResponse> {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const recent24h = moderationActions.filter(a => new Date(a.timestamp) >= last24h)
  const recent7d = moderationActions.filter(a => new Date(a.timestamp) >= last7d)

  const stats = {
    total: {
      actions: moderationActions.length,
      pending: pendingReviews.size,
      automated: moderationActions.filter(a => a.isAutomated).length,
      manual: moderationActions.filter(a => !a.isAutomated).length
    },
    last24h: {
      actions: recent24h.length,
      approved: recent24h.filter(a => a.action === 'approved').length,
      rejected: recent24h.filter(a => a.action === 'rejected').length,
      flagged: recent24h.filter(a => a.action === 'flagged').length
    },
    last7d: {
      actions: recent7d.length,
      approved: recent7d.filter(a => a.action === 'approved').length,
      rejected: recent7d.filter(a => a.action === 'rejected').length,
      flagged: recent7d.filter(a => a.action === 'flagged').length
    },
    byAction: {
      approved: moderationActions.filter(a => a.action === 'approved').length,
      rejected: moderationActions.filter(a => a.action === 'rejected').length,
      flagged: moderationActions.filter(a => a.action === 'flagged').length,
      edited: moderationActions.filter(a => a.action === 'edited').length
    }
  }

  return NextResponse.json({
    success: true,
    stats,
    generatedAt: new Date().toISOString()
  })
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
