'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Eye, 
  Clock,
  TrendingUp,
  Users,
  Flag,
  Bot,
  User
} from 'lucide-react'

interface PendingReview {
  id: string
  type: 'comment' | 'review' | 'profile' | 'forum-post'
  content: string
  userId: string
  userEmail?: string
  createdAt: string
  moderationResult: {
    confidence: number
    flags: Array<{
      type: string
      severity: string
      confidence: number
      details: string
    }>
    suggestedAction: string
  }
}

interface ModerationAction {
  id: string
  contentId: string
  moderatorId?: string
  action: string
  reason: string
  timestamp: string
  isAutomated: boolean
}

interface ModerationStats {
  total: {
    actions: number
    pending: number
    automated: number
    manual: number
  }
  last24h: {
    actions: number
    approved: number
    rejected: number
    flagged: number
  }
  byAction: {
    approved: number
    rejected: number
    flagged: number
    edited: number
  }
}

export function ModerationDashboard() {
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([])
  const [recentActions, setRecentActions] = useState<ModerationAction[]>([])
  const [stats, setStats] = useState<ModerationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null)
  const [moderating, setModerating] = useState<string | null>(null)

  useEffect(() => {
    loadModerationData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadModerationData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadModerationData = async () => {
    try {
      const response = await fetch('/api/moderation')
      if (response.ok) {
        const data = await response.json()
        setPendingReviews(data.pendingReviews || [])
        setRecentActions(data.recentActions || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to load moderation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleModerationAction = async (contentId: string, action: 'approve' | 'reject', reason: string) => {
    setModerating(contentId)
    try {
      const response = await fetch('/api/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          contentId,
          moderatorId: 'current-user', // Replace with actual user ID
          reason
        })
      })

      if (response.ok) {
        // Remove from pending reviews
        setPendingReviews(prev => prev.filter(r => r.id !== contentId))
        setSelectedReview(null)
        
        // Reload data to get updated stats
        loadModerationData()
      }
    } catch (error) {
      console.error(`Failed to ${action} content:`, error)
    } finally {
      setModerating(null)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getFlagTypeIcon = (type: string) => {
    switch (type) {
      case 'profanity': return '🤬'
      case 'spam': return '📧'
      case 'spoiler': return '⚠️'
      case 'toxic': return '☠️'
      case 'personal-info': return '🔒'
      case 'copyright': return '©️'
      default: return '🚩'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading moderation data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Shield className="h-6 w-6 mr-2" />
            Content Moderation
          </h2>
          <p className="text-muted-foreground">
            Monitor and moderate user-generated content
          </p>
        </div>
        <Button onClick={loadModerationData}>
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                Pending Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total.pending}</div>
              <p className="text-xs text-muted-foreground">
                Requires manual review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
                24h Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.last24h.actions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.last24h.approved} approved, {stats.last24h.rejected} rejected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Bot className="h-4 w-4 mr-2 text-green-500" />
                Automated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total.automated}</div>
              <p className="text-xs text-muted-foreground">
                Auto-moderated content
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <User className="h-4 w-4 mr-2 text-purple-500" />
                Manual Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total.manual}</div>
              <p className="text-xs text-muted-foreground">
                Human moderated
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending Reviews ({pendingReviews.length})</TabsTrigger>
          <TabsTrigger value="actions">Recent Actions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Reviews List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Content Awaiting Review</h3>
              
              {pendingReviews.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    No content pending review
                  </CardContent>
                </Card>
              ) : (
                pendingReviews.map((review) => (
                  <Card 
                    key={review.id}
                    className={`cursor-pointer transition-colors ${
                      selectedReview?.id === review.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedReview(review)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{review.type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {review.userEmail || 'Anonymous'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {review.moderationResult.flags.map((flag, index) => (
                            <span key={index} title={flag.details}>
                              {getFlagTypeIcon(flag.type)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm line-clamp-3 mb-2">
                        {review.content}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center space-x-2">
                          <span>Confidence: {(review.moderationResult.confidence * 100).toFixed(0)}%</span>
                          <Badge className={getSeverityColor(review.moderationResult.flags[0]?.severity || 'low')}>
                            {review.moderationResult.flags[0]?.severity || 'low'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Review Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Review Details</h3>
              
              {selectedReview ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Content Review</span>
                      <Badge variant="outline">{selectedReview.type}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Content</h4>
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        {selectedReview.content}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Moderation Flags</h4>
                      <div className="space-y-2">
                        {selectedReview.moderationResult.flags.map((flag, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div className="flex items-center space-x-2">
                              <span>{getFlagTypeIcon(flag.type)}</span>
                              <span className="text-sm font-medium">{flag.type}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getSeverityColor(flag.severity)}>
                                {flag.severity}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {(flag.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">User Information</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Email: {selectedReview.userEmail || 'Anonymous'}</div>
                        <div>User ID: {selectedReview.userId}</div>
                        <div>Created: {new Date(selectedReview.createdAt).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-4">
                      <Button
                        onClick={() => handleModerationAction(selectedReview.id, 'approve', 'Manual review - approved')}
                        disabled={moderating === selectedReview.id}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleModerationAction(selectedReview.id, 'reject', 'Manual review - rejected')}
                        disabled={moderating === selectedReview.id}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4" />
                    Select a review to see details
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Moderation Actions</h3>
          
          {recentActions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No recent actions
              </CardContent>
            </Card>
          ) : (
            recentActions.map((action) => (
              <Card key={action.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {action.isAutomated ? (
                        <Bot className="h-5 w-5 text-blue-500" />
                      ) : (
                        <User className="h-5 w-5 text-purple-500" />
                      )}
                      <div>
                        <div className="font-medium">
                          {action.action.charAt(0).toUpperCase() + action.action.slice(1)} Content
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {action.reason}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {new Date(action.timestamp).toLocaleString()}
                      </div>
                      <Badge variant={action.isAutomated ? 'secondary' : 'default'}>
                        {action.isAutomated ? 'Automated' : 'Manual'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Action Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.byAction).map(([action, count]) => {
                      const percentage = stats.total.actions > 0 ? (count / stats.total.actions) * 100 : 0
                      return (
                        <div key={action} className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{action}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-12">
                              {count}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>24h Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Actions</span>
                      <span className="text-2xl font-bold">{stats.last24h.actions}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Approved</span>
                        <span>{stats.last24h.approved}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-red-600">Rejected</span>
                        <span>{stats.last24h.rejected}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-yellow-600">Flagged</span>
                        <span>{stats.last24h.flagged}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
