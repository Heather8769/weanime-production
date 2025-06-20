/**
 * Content Moderation System for WeAnime
 * Handles automated and manual moderation of user-generated content
 */

import { errorCollector } from './error-collector'

export interface ModerationResult {
  isApproved: boolean
  confidence: number
  flags: ModerationFlag[]
  suggestedAction: 'approve' | 'review' | 'reject' | 'auto-moderate'
  moderatedContent?: string
}

export interface ModerationFlag {
  type: 'profanity' | 'spam' | 'spoiler' | 'inappropriate' | 'toxic' | 'personal-info' | 'copyright'
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  details: string
  position?: { start: number; end: number }
}

export interface ContentItem {
  id: string
  type: 'comment' | 'review' | 'profile' | 'forum-post'
  content: string
  userId: string
  userEmail?: string
  metadata?: {
    animeId?: number
    rating?: number
    spoiler?: boolean
    parentId?: string
  }
  createdAt: string
}

export interface ModerationAction {
  id: string
  contentId: string
  moderatorId?: string
  action: 'approved' | 'rejected' | 'edited' | 'flagged' | 'auto-moderated'
  reason: string
  originalContent?: string
  moderatedContent?: string
  timestamp: string
  isAutomated: boolean
}

class ContentModerationSystem {
  private static instance: ContentModerationSystem
  private profanityList: Set<string> = new Set()
  private spamPatterns: RegExp[] = []
  private spoilerKeywords: Set<string> = new Set()
  private toxicPatterns: RegExp[] = []
  private personalInfoPatterns: RegExp[] = []

  private constructor() {
    this.initializeModerationRules()
  }

  static getInstance(): ContentModerationSystem {
    if (!ContentModerationSystem.instance) {
      ContentModerationSystem.instance = new ContentModerationSystem()
    }
    return ContentModerationSystem.instance
  }

  private initializeModerationRules() {
    // Basic profanity list (expandable)
    this.profanityList = new Set([
      'damn', 'hell', 'crap', 'stupid', 'idiot', 'moron', 'dumb',
      // Add more as needed - this is a basic starter list
    ])

    // Spam detection patterns
    this.spamPatterns = [
      /(.)\1{4,}/g, // Repeated characters (aaaaa)
      /\b(free|click|buy|download|watch|stream)\s+(here|now|this)\b/gi,
      /\b(visit|check|go\s+to)\s+\w+\.(com|net|org|tv|me)\b/gi,
      /\b\d{10,}\b/g, // Long numbers (phone numbers)
      /[A-Z]{5,}/g, // Excessive caps
    ]

    // Spoiler detection keywords
    this.spoilerKeywords = new Set([
      'spoiler', 'dies', 'death', 'ending', 'finale', 'twist', 'reveal',
      'killed', 'betrays', 'secret', 'plot', 'surprise', 'shocking'
    ])

    // Toxic behavior patterns
    this.toxicPatterns = [
      /\b(kill\s+yourself|kys)\b/gi,
      /\b(you\s+suck|you\s+are\s+trash)\b/gi,
      /\b(hate\s+you|go\s+die)\b/gi,
      /\b(retard|autistic|cancer)\b/gi,
    ]

    // Personal information patterns
    this.personalInfoPatterns = [
      /\b\d{3}-\d{3}-\d{4}\b/g, // Phone numbers
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN format
    ]
  }

  async moderateContent(content: ContentItem): Promise<ModerationResult> {
    try {
      const flags: ModerationFlag[] = []
      let confidence = 1.0
      let moderatedContent = content.content

      // Run all moderation checks
      flags.push(...this.checkProfanity(content.content))
      flags.push(...this.checkSpam(content.content))
      flags.push(...this.checkSpoilers(content.content))
      flags.push(...this.checkToxicity(content.content))
      flags.push(...this.checkPersonalInfo(content.content))
      flags.push(...this.checkCopyright(content.content))

      // Calculate overall confidence and determine action
      const highSeverityFlags = flags.filter(f => f.severity === 'high' || f.severity === 'critical')
      const mediumSeverityFlags = flags.filter(f => f.severity === 'medium')

      let suggestedAction: ModerationResult['suggestedAction'] = 'approve'
      let isApproved = true

      if (highSeverityFlags.length > 0) {
        suggestedAction = 'reject'
        isApproved = false
        confidence = 0.9
      } else if (mediumSeverityFlags.length >= 2) {
        suggestedAction = 'review'
        isApproved = false
        confidence = 0.7
      } else if (flags.length > 0) {
        suggestedAction = 'auto-moderate'
        moderatedContent = this.autoModerateContent(content.content, flags)
        confidence = 0.8
      }

      // Special handling for spoilers
      const spoilerFlags = flags.filter(f => f.type === 'spoiler')
      if (spoilerFlags.length > 0 && !content.metadata?.spoiler) {
        suggestedAction = 'review'
        isApproved = false
      }

      // Log moderation result
      errorCollector.info('ContentModeration', `Content moderated: ${suggestedAction}`, {
        contentId: content.id,
        contentType: content.type,
        flagCount: flags.length,
        confidence,
        userId: content.userId
      })

      return {
        isApproved,
        confidence,
        flags,
        suggestedAction,
        moderatedContent: moderatedContent !== content.content ? moderatedContent : undefined
      }

    } catch (error) {
      errorCollector.error('ContentModeration', 'Failed to moderate content', {
        contentId: content.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      // Fail safe - require manual review on error
      return {
        isApproved: false,
        confidence: 0,
        flags: [{
          type: 'inappropriate',
          severity: 'medium',
          confidence: 0.5,
          details: 'Moderation system error - requires manual review'
        }],
        suggestedAction: 'review'
      }
    }
  }

  private checkProfanity(content: string): ModerationFlag[] {
    const flags: ModerationFlag[] = []
    const words = content.toLowerCase().split(/\s+/)
    
    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '')
      if (this.profanityList.has(cleanWord)) {
        flags.push({
          type: 'profanity',
          severity: 'medium',
          confidence: 0.8,
          details: `Contains profanity: "${word}"`
        })
      }
    }

    return flags
  }

  private checkSpam(content: string): ModerationFlag[] {
    const flags: ModerationFlag[] = []

    for (const pattern of this.spamPatterns) {
      const matches = content.match(pattern)
      if (matches) {
        flags.push({
          type: 'spam',
          severity: 'high',
          confidence: 0.9,
          details: `Spam pattern detected: ${matches[0]}`
        })
      }
    }

    // Check for excessive repetition
    if (content.length > 50 && content.split(' ').length < 5) {
      flags.push({
        type: 'spam',
        severity: 'medium',
        confidence: 0.7,
        details: 'Excessive repetition detected'
      })
    }

    return flags
  }

  private checkSpoilers(content: string): ModerationFlag[] {
    const flags: ModerationFlag[] = []
    const lowerContent = content.toLowerCase()

    for (const keyword of this.spoilerKeywords) {
      if (lowerContent.includes(keyword)) {
        flags.push({
          type: 'spoiler',
          severity: 'medium',
          confidence: 0.6,
          details: `Potential spoiler keyword: "${keyword}"`
        })
      }
    }

    return flags
  }

  private checkToxicity(content: string): ModerationFlag[] {
    const flags: ModerationFlag[] = []

    for (const pattern of this.toxicPatterns) {
      const matches = content.match(pattern)
      if (matches) {
        flags.push({
          type: 'toxic',
          severity: 'critical',
          confidence: 0.95,
          details: `Toxic content detected: ${matches[0]}`
        })
      }
    }

    return flags
  }

  private checkPersonalInfo(content: string): ModerationFlag[] {
    const flags: ModerationFlag[] = []

    for (const pattern of this.personalInfoPatterns) {
      const matches = content.match(pattern)
      if (matches) {
        flags.push({
          type: 'personal-info',
          severity: 'high',
          confidence: 0.9,
          details: `Personal information detected: ${matches[0].replace(/./g, '*')}`
        })
      }
    }

    return flags
  }

  private checkCopyright(content: string): ModerationFlag[] {
    const flags: ModerationFlag[] = []
    const copyrightPatterns = [
      /copyright\s+\d{4}/gi,
      /all\s+rights\s+reserved/gi,
      /\(c\)\s*\d{4}/gi,
      /©\s*\d{4}/gi
    ]

    for (const pattern of copyrightPatterns) {
      const matches = content.match(pattern)
      if (matches) {
        flags.push({
          type: 'copyright',
          severity: 'medium',
          confidence: 0.7,
          details: `Copyright notice detected: ${matches[0]}`
        })
      }
    }

    return flags
  }

  private autoModerateContent(content: string, flags: ModerationFlag[]): string {
    let moderated = content

    // Auto-censor profanity
    const profanityFlags = flags.filter(f => f.type === 'profanity')
    for (const flag of profanityFlags) {
      if (flag.position) {
        const before = moderated.substring(0, flag.position.start)
        const after = moderated.substring(flag.position.end)
        const censored = '*'.repeat(flag.position.end - flag.position.start)
        moderated = before + censored + after
      }
    }

    // Remove personal information
    for (const pattern of this.personalInfoPatterns) {
      moderated = moderated.replace(pattern, '[REDACTED]')
    }

    return moderated
  }

  // Batch moderation for multiple items
  async moderateBatch(contents: ContentItem[]): Promise<Map<string, ModerationResult>> {
    const results = new Map<string, ModerationResult>()
    
    for (const content of contents) {
      const result = await this.moderateContent(content)
      results.set(content.id, result)
    }

    return results
  }

  // Get moderation statistics
  getModerationStats(results: ModerationResult[]): {
    approved: number
    rejected: number
    needsReview: number
    autoModerated: number
    flagsByType: Record<string, number>
    averageConfidence: number
  } {
    const stats = {
      approved: 0,
      rejected: 0,
      needsReview: 0,
      autoModerated: 0,
      flagsByType: {} as Record<string, number>,
      averageConfidence: 0
    }

    let totalConfidence = 0

    for (const result of results) {
      totalConfidence += result.confidence

      switch (result.suggestedAction) {
        case 'approve':
          stats.approved++
          break
        case 'reject':
          stats.rejected++
          break
        case 'review':
          stats.needsReview++
          break
        case 'auto-moderate':
          stats.autoModerated++
          break
      }

      for (const flag of result.flags) {
        stats.flagsByType[flag.type] = (stats.flagsByType[flag.type] || 0) + 1
      }
    }

    stats.averageConfidence = results.length > 0 ? totalConfidence / results.length : 0

    return stats
  }
}

// Export singleton instance
export const contentModerator = ContentModerationSystem.getInstance()

// Convenience functions
export async function moderateComment(comment: {
  id: string
  content: string
  userId: string
  animeId: number
  spoiler?: boolean
}): Promise<ModerationResult> {
  return contentModerator.moderateContent({
    id: comment.id,
    type: 'comment',
    content: comment.content,
    userId: comment.userId,
    metadata: {
      animeId: comment.animeId,
      spoiler: comment.spoiler
    },
    createdAt: new Date().toISOString()
  })
}

export async function moderateReview(review: {
  id: string
  content: string
  userId: string
  animeId: number
  rating: number
}): Promise<ModerationResult> {
  return contentModerator.moderateContent({
    id: review.id,
    type: 'review',
    content: review.content,
    userId: review.userId,
    metadata: {
      animeId: review.animeId,
      rating: review.rating
    },
    createdAt: new Date().toISOString()
  })
}
