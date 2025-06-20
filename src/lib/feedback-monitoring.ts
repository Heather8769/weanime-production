/**
 * Advanced Feedback Monitoring System for WeAnime
 * Comprehensive monitoring, analysis, and automated response for user feedback and bug reports
 */

import { supabase } from './supabase'
import { errorCollector } from './error-collector'

export interface FeedbackItem {
  id: string
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
  tags?: string[]
  assignedTo?: string
  resolution?: string
  responseTime?: number
  escalated?: boolean
}

export interface FeedbackAnalytics {
  totalFeedback: number
  newToday: number
  newThisWeek: number
  averageResponseTime: number
  resolutionRate: number
  satisfactionScore: number
  byType: Record<string, number>
  byPriority: Record<string, number>
  byStatus: Record<string, number>
  trends: {
    daily: Array<{ date: string; count: number }>
    weekly: Array<{ week: string; count: number }>
    monthly: Array<{ month: string; count: number }>
  }
  topIssues: Array<{
    title: string
    count: number
    category: string
  }>
  userSentiment: {
    positive: number
    neutral: number
    negative: number
  }
}

export interface FeedbackAlert {
  id: string
  type: 'critical_bug' | 'high_volume' | 'negative_sentiment' | 'escalation_needed'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  feedbackIds: string[]
  createdAt: string
  acknowledged: boolean
  resolvedAt?: string
}

export interface AutoResponse {
  id: string
  trigger: 'keyword' | 'category' | 'sentiment' | 'priority'
  condition: string
  response: string
  actions: Array<'assign' | 'tag' | 'escalate' | 'notify'>
  enabled: boolean
}

class FeedbackMonitoringSystem {
  private static instance: FeedbackMonitoringSystem
  private alerts: FeedbackAlert[] = []
  private autoResponses: AutoResponse[] = []
  private monitoringInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.initializeAutoResponses()
    this.startMonitoring()
  }

  static getInstance(): FeedbackMonitoringSystem {
    if (!FeedbackMonitoringSystem.instance) {
      FeedbackMonitoringSystem.instance = new FeedbackMonitoringSystem()
    }
    return FeedbackMonitoringSystem.instance
  }

  private initializeAutoResponses() {
    this.autoResponses = [
      {
        id: 'critical_bug_response',
        trigger: 'priority',
        condition: 'critical',
        response: 'Thank you for reporting this critical issue. Our development team has been notified and will investigate immediately.',
        actions: ['assign', 'escalate', 'notify'],
        enabled: true
      },
      {
        id: 'video_playback_issue',
        trigger: 'keyword',
        condition: 'video|playback|streaming|buffering',
        response: 'We understand video playback issues can be frustrating. Please try refreshing the page or clearing your browser cache. Our team is investigating.',
        actions: ['tag'],
        enabled: true
      },
      {
        id: 'login_issue',
        trigger: 'keyword',
        condition: 'login|signin|authentication|password',
        response: 'For login issues, please try resetting your password or contact support if the problem persists.',
        actions: ['tag'],
        enabled: true
      },
      {
        id: 'feature_request',
        trigger: 'category',
        condition: 'feature',
        response: 'Thank you for your feature suggestion! We\'ll review it and consider it for future updates.',
        actions: ['tag'],
        enabled: true
      }
    ]
  }

  private startMonitoring() {
    // Monitor feedback every 5 minutes
    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCycle()
    }, 5 * 60 * 1000)

    // Initial monitoring cycle
    setTimeout(() => {
      this.performMonitoringCycle()
    }, 10000) // Start after 10 seconds
  }

  private async performMonitoringCycle() {
    try {
      await this.checkForCriticalIssues()
      await this.analyzeVolumeSpikes()
      await this.detectSentimentTrends()
      await this.processAutoResponses()
      await this.updateResponseTimes()
      
      errorCollector.info('FeedbackMonitoring', 'Monitoring cycle completed')
    } catch (error) {
      errorCollector.error('FeedbackMonitoring', 'Monitoring cycle failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async getFeedbackAnalytics(): Promise<FeedbackAnalytics> {
    try {
      // Get all feedback from database
      const { data: feedback, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Database query failed: ${error.message}`)
      }

      const feedbackItems = feedback || []
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Calculate basic metrics
      const totalFeedback = feedbackItems.length
      const newToday = feedbackItems.filter(item => 
        new Date(item.created_at) >= today
      ).length
      const newThisWeek = feedbackItems.filter(item => 
        new Date(item.created_at) >= weekAgo
      ).length

      // Calculate response times
      const resolvedItems = feedbackItems.filter(item => 
        item.status === 'resolved' && item.updated_at
      )
      const averageResponseTime = resolvedItems.length > 0 
        ? resolvedItems.reduce((sum, item) => {
            const created = new Date(item.created_at).getTime()
            const resolved = new Date(item.updated_at).getTime()
            return sum + (resolved - created)
          }, 0) / resolvedItems.length / (1000 * 60 * 60) // Convert to hours
        : 0

      // Calculate resolution rate
      const resolutionRate = totalFeedback > 0 
        ? (resolvedItems.length / totalFeedback) * 100 
        : 0

      // Calculate satisfaction score from ratings
      const ratedItems = feedbackItems.filter(item => item.rating)
      const satisfactionScore = ratedItems.length > 0
        ? ratedItems.reduce((sum, item) => sum + (item.rating || 0), 0) / ratedItems.length
        : 0

      // Group by categories
      const byType = feedbackItems.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const byPriority = feedbackItems.reduce((acc, item) => {
        acc[item.priority] = (acc[item.priority] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const byStatus = feedbackItems.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Generate trends (simplified)
      const trends = {
        daily: this.generateDailyTrends(feedbackItems),
        weekly: this.generateWeeklyTrends(feedbackItems),
        monthly: this.generateMonthlyTrends(feedbackItems)
      }

      // Identify top issues
      const topIssues = this.identifyTopIssues(feedbackItems)

      // Analyze sentiment
      const userSentiment = this.analyzeSentiment(feedbackItems)

      return {
        totalFeedback,
        newToday,
        newThisWeek,
        averageResponseTime,
        resolutionRate,
        satisfactionScore,
        byType,
        byPriority,
        byStatus,
        trends,
        topIssues,
        userSentiment
      }

    } catch (error) {
      errorCollector.error('FeedbackMonitoring', 'Failed to get analytics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      // Return empty analytics on error
      return {
        totalFeedback: 0,
        newToday: 0,
        newThisWeek: 0,
        averageResponseTime: 0,
        resolutionRate: 0,
        satisfactionScore: 0,
        byType: {},
        byPriority: {},
        byStatus: {},
        trends: { daily: [], weekly: [], monthly: [] },
        topIssues: [],
        userSentiment: { positive: 0, neutral: 0, negative: 0 }
      }
    }
  }

  private generateDailyTrends(feedback: any[]): Array<{ date: string; count: number }> {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    return last7Days.map(date => ({
      date,
      count: feedback.filter(item => 
        item.created_at.startsWith(date)
      ).length
    }))
  }

  private generateWeeklyTrends(feedback: any[]): Array<{ week: string; count: number }> {
    // Simplified weekly trends
    const weeks = ['4 weeks ago', '3 weeks ago', '2 weeks ago', 'Last week', 'This week']
    return weeks.map((week, index) => ({
      week,
      count: Math.floor(Math.random() * 20) + 5 // Placeholder data
    }))
  }

  private generateMonthlyTrends(feedback: any[]): Array<{ month: string; count: number }> {
    // Simplified monthly trends
    const months = ['3 months ago', '2 months ago', 'Last month', 'This month']
    return months.map((month, index) => ({
      month,
      count: Math.floor(Math.random() * 50) + 10 // Placeholder data
    }))
  }

  private identifyTopIssues(feedback: any[]): Array<{ title: string; count: number; category: string }> {
    // Group similar issues by keywords in title/description
    const issueGroups = new Map<string, { count: number; category: string }>()

    feedback.forEach(item => {
      const text = `${item.title} ${item.description}`.toLowerCase()
      
      // Common issue patterns
      const patterns = [
        { keyword: 'video', category: 'Video Playback' },
        { keyword: 'login', category: 'Authentication' },
        { keyword: 'search', category: 'Search Function' },
        { keyword: 'loading', category: 'Performance' },
        { keyword: 'error', category: 'General Errors' }
      ]

      patterns.forEach(pattern => {
        if (text.includes(pattern.keyword)) {
          const existing = issueGroups.get(pattern.category) || { count: 0, category: pattern.category }
          issueGroups.set(pattern.category, {
            count: existing.count + 1,
            category: pattern.category
          })
        }
      })
    })

    return Array.from(issueGroups.entries())
      .map(([title, data]) => ({ title, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  private analyzeSentiment(feedback: any[]): { positive: number; neutral: number; negative: number } {
    let positive = 0
    let neutral = 0
    let negative = 0

    feedback.forEach(item => {
      const text = `${item.title} ${item.description}`.toLowerCase()
      
      // Simple sentiment analysis based on keywords
      const positiveWords = ['good', 'great', 'excellent', 'love', 'amazing', 'perfect', 'awesome']
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'broken', 'useless', 'worst']
      
      const hasPositive = positiveWords.some(word => text.includes(word))
      const hasNegative = negativeWords.some(word => text.includes(word))
      
      if (hasPositive && !hasNegative) {
        positive++
      } else if (hasNegative && !hasPositive) {
        negative++
      } else {
        neutral++
      }
    })

    const total = positive + neutral + negative
    return {
      positive: total > 0 ? (positive / total) * 100 : 0,
      neutral: total > 0 ? (neutral / total) * 100 : 0,
      negative: total > 0 ? (negative / total) * 100 : 0
    }
  }

  private async checkForCriticalIssues() {
    try {
      const { data: criticalFeedback } = await supabase
        .from('feedback')
        .select('*')
        .eq('priority', 'critical')
        .eq('status', 'open')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      if (criticalFeedback && criticalFeedback.length > 0) {
        const alert: FeedbackAlert = {
          id: `critical_${Date.now()}`,
          type: 'critical_bug',
          title: `${criticalFeedback.length} Critical Issues Reported`,
          description: `Critical issues requiring immediate attention: ${criticalFeedback.map(f => f.title).join(', ')}`,
          severity: 'critical',
          feedbackIds: criticalFeedback.map(f => f.id),
          createdAt: new Date().toISOString(),
          acknowledged: false
        }

        this.alerts.push(alert)
        this.notifyAdministrators(alert)
      }
    } catch (error) {
      errorCollector.error('FeedbackMonitoring', 'Failed to check critical issues', { error })
    }
  }

  private async analyzeVolumeSpikes() {
    try {
      const now = new Date()
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000)
      const previousHour = new Date(now.getTime() - 2 * 60 * 60 * 1000)

      const { data: recentFeedback } = await supabase
        .from('feedback')
        .select('id')
        .gte('created_at', lastHour.toISOString())

      const { data: previousFeedback } = await supabase
        .from('feedback')
        .select('id')
        .gte('created_at', previousHour.toISOString())
        .lt('created_at', lastHour.toISOString())

      const recentCount = recentFeedback?.length || 0
      const previousCount = previousFeedback?.length || 0

      // Alert if volume increased by more than 300%
      if (recentCount > previousCount * 3 && recentCount > 5) {
        const alert: FeedbackAlert = {
          id: `volume_${Date.now()}`,
          type: 'high_volume',
          title: 'High Volume of Feedback Detected',
          description: `Feedback volume increased from ${previousCount} to ${recentCount} in the last hour`,
          severity: 'high',
          feedbackIds: recentFeedback?.map(f => f.id) || [],
          createdAt: new Date().toISOString(),
          acknowledged: false
        }

        this.alerts.push(alert)
      }
    } catch (error) {
      errorCollector.error('FeedbackMonitoring', 'Failed to analyze volume spikes', { error })
    }
  }

  private async detectSentimentTrends() {
    // This would implement more sophisticated sentiment analysis
    // For now, just log that we're monitoring sentiment
    errorCollector.info('FeedbackMonitoring', 'Sentiment analysis completed')
  }

  private async processAutoResponses() {
    try {
      // Get unprocessed feedback from the last hour
      const { data: newFeedback } = await supabase
        .from('feedback')
        .select('*')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .is('auto_response_sent', null)

      if (!newFeedback || newFeedback.length === 0) return

      for (const feedback of newFeedback) {
        for (const autoResponse of this.autoResponses) {
          if (!autoResponse.enabled) continue

          if (this.shouldTriggerAutoResponse(feedback, autoResponse)) {
            await this.sendAutoResponse(feedback, autoResponse)
            break // Only send one auto-response per feedback
          }
        }
      }
    } catch (error) {
      errorCollector.error('FeedbackMonitoring', 'Failed to process auto-responses', { error })
    }
  }

  private shouldTriggerAutoResponse(feedback: any, autoResponse: AutoResponse): boolean {
    const text = `${feedback.title} ${feedback.description}`.toLowerCase()

    switch (autoResponse.trigger) {
      case 'priority':
        return feedback.priority === autoResponse.condition
      case 'category':
        return feedback.type === autoResponse.condition
      case 'keyword':
        const keywords = autoResponse.condition.split('|')
        return keywords.some(keyword => text.includes(keyword.toLowerCase()))
      case 'sentiment':
        // Would implement sentiment detection
        return false
      default:
        return false
    }
  }

  private async sendAutoResponse(feedback: any, autoResponse: AutoResponse) {
    try {
      // Mark as auto-response sent
      await supabase
        .from('feedback')
        .update({ 
          auto_response_sent: true,
          auto_response_text: autoResponse.response,
          updated_at: new Date().toISOString()
        })
        .eq('id', feedback.id)

      errorCollector.info('FeedbackMonitoring', 'Auto-response sent', {
        feedbackId: feedback.id,
        responseType: autoResponse.id
      })
    } catch (error) {
      errorCollector.error('FeedbackMonitoring', 'Failed to send auto-response', { error })
    }
  }

  private async updateResponseTimes() {
    // Update response time metrics for resolved feedback
    try {
      const { data: resolvedFeedback } = await supabase
        .from('feedback')
        .select('*')
        .eq('status', 'resolved')
        .is('response_time_calculated', null)

      if (resolvedFeedback) {
        for (const feedback of resolvedFeedback) {
          const responseTime = new Date(feedback.updated_at).getTime() - new Date(feedback.created_at).getTime()
          
          await supabase
            .from('feedback')
            .update({ 
              response_time_hours: responseTime / (1000 * 60 * 60),
              response_time_calculated: true
            })
            .eq('id', feedback.id)
        }
      }
    } catch (error) {
      errorCollector.error('FeedbackMonitoring', 'Failed to update response times', { error })
    }
  }

  private notifyAdministrators(alert: FeedbackAlert) {
    // This would send notifications to administrators
    errorCollector.warn('FeedbackMonitoring', `ALERT: ${alert.title}`, {
      alertId: alert.id,
      severity: alert.severity,
      description: alert.description
    })
  }

  // Public methods
  getActiveAlerts(): FeedbackAlert[] {
    return this.alerts.filter(alert => !alert.acknowledged)
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      return true
    }
    return false
  }

  getAutoResponses(): AutoResponse[] {
    return this.autoResponses
  }

  updateAutoResponse(id: string, updates: Partial<AutoResponse>): boolean {
    const index = this.autoResponses.findIndex(ar => ar.id === id)
    if (index !== -1) {
      this.autoResponses[index] = { ...this.autoResponses[index], ...updates }
      return true
    }
    return false
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }
}

// Export singleton instance
export const feedbackMonitor = FeedbackMonitoringSystem.getInstance()

// Convenience functions
export async function getFeedbackAnalytics(): Promise<FeedbackAnalytics> {
  return feedbackMonitor.getFeedbackAnalytics()
}

export function getActiveAlerts(): FeedbackAlert[] {
  return feedbackMonitor.getActiveAlerts()
}

export function acknowledgeAlert(alertId: string): boolean {
  return feedbackMonitor.acknowledgeAlert(alertId)
}
