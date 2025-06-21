import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface VoteRequest {
  vote: 'up' | 'down'
  userId?: string
}

// In-memory storage for votes (use database in production)
const voteStorage: Record<string, Record<string, 'up' | 'down'>> = {}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const feedbackId = params.id
    const { vote, userId }: VoteRequest = await request.json()

    if (!feedbackId || !vote || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: feedbackId, vote, userId' },
        { status: 400 }
      )
    }

    if (!['up', 'down'].includes(vote)) {
      return NextResponse.json(
        { error: 'Vote must be "up" or "down"' },
        { status: 400 }
      )
    }

    // Initialize vote storage for this feedback if not exists
    if (!voteStorage[feedbackId]) {
      voteStorage[feedbackId] = {}
    }

    // Check if user already voted
    const previousVote = voteStorage[feedbackId][userId]
    
    // Update vote storage
    if (previousVote === vote) {
      // Remove vote if clicking the same vote again
      delete voteStorage[feedbackId][userId]
    } else {
      // Add or change vote
      voteStorage[feedbackId][userId] = vote
    }

    // Calculate new vote counts
    const votes = Object.values(voteStorage[feedbackId] || {})
    const upVotes = votes.filter(v => v === 'up').length
    const downVotes = votes.filter(v => v === 'down').length

    // Try to update in Supabase
    try {
      // First, try to get current feedback to update vote counts
      const { data: feedback, error: fetchError } = await supabase
        .from('feedback')
        .select('votes_up, votes_down')
        .eq('id', feedbackId)
        .single()

      if (!fetchError && feedback) {
        // Update vote counts in Supabase
        const { error: updateError } = await supabase
          .from('feedback')
          .update({
            votes_up: upVotes,
            votes_down: downVotes,
            updated_at: new Date().toISOString()
          })
          .eq('id', feedbackId)

        if (updateError) {
          console.warn('Failed to update votes in Supabase:', updateError)
        }

        // Store individual vote record
        const { error: voteError } = await supabase
          .from('feedback_votes')
          .upsert({
            feedback_id: feedbackId,
            user_id: userId,
            vote: previousVote === vote ? null : vote, // null means vote removed
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'feedback_id,user_id'
          })

        if (voteError) {
          console.warn('Failed to store vote record in Supabase:', voteError)
        }
      }
    } catch (supabaseError) {
      console.warn('Supabase not available for voting:', supabaseError)
    }

    // Log vote action
    console.log(`👍👎 Vote ${vote} ${previousVote === vote ? 'removed' : 'added'} for feedback ${feedbackId} by user ${userId}`)

    return NextResponse.json({
      success: true,
      message: previousVote === vote ? 'Vote removed' : `Vote ${vote} recorded`,
      votes: {
        up: upVotes,
        down: downVotes,
        userVote: voteStorage[feedbackId][userId] || null
      }
    })

  } catch (error) {
    console.error('Error processing vote:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process vote',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const feedbackId = params.id
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!feedbackId) {
      return NextResponse.json(
        { error: 'Feedback ID is required' },
        { status: 400 }
      )
    }

    let votes = { up: 0, down: 0, userVote: null as 'up' | 'down' | null }

    // Try to get from Supabase first
    try {
      const { data: feedback, error } = await supabase
        .from('feedback')
        .select('votes_up, votes_down')
        .eq('id', feedbackId)
        .single()

      if (!error && feedback) {
        votes.up = feedback.votes_up || 0
        votes.down = feedback.votes_down || 0

        // Get user's vote if userId provided
        if (userId) {
          const { data: userVote, error: voteError } = await supabase
            .from('feedback_votes')
            .select('vote')
            .eq('feedback_id', feedbackId)
            .eq('user_id', userId)
            .single()

          if (!voteError && userVote) {
            votes.userVote = userVote.vote
          }
        }
      }
    } catch (supabaseError) {
      console.warn('Supabase not available, using in-memory storage:', supabaseError)
      
      // Fallback to in-memory storage
      const feedbackVotes = voteStorage[feedbackId] || {}
      const voteValues = Object.values(feedbackVotes)
      
      votes.up = voteValues.filter(v => v === 'up').length
      votes.down = voteValues.filter(v => v === 'down').length
      
      if (userId) {
        votes.userVote = feedbackVotes[userId] || null
      }
    }

    return NextResponse.json({
      success: true,
      feedbackId,
      votes
    })

  } catch (error) {
    console.error('Error retrieving votes:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve votes',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
