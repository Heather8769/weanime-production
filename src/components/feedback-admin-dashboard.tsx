'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  TrendingUp,
  Users,
  Star,
  Filter
} from 'lucide-react'

interface FeedbackItem {
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
  }
  votes: {
    up: number
    down: number
  }
}

interface FeedbackStats {
  total: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  averageRating: number
}

export function FeedbackAdminDashboard() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    type: '',
    status: '',
    priority: ''
  })
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null)

  useEffect(() => {
    loadFeedback()
  }, [filter])

  const loadFeedback = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.type) params.append('type', filter.type)
      if (filter.status) params.append('status', filter.status)
      if (filter.priority) params.append('priority', filter.priority)
      params.append('limit', '100')

      const response = await fetch(`/api/feedback?${params}`)
      if (response.ok) {
        const data = await response.json()
        setFeedback(data.feedback || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to load feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateFeedbackStatus = async (feedbackId: string, newStatus: FeedbackItem['status']) => {
    try {
      const response = await fetch(`/api/feedback?id=${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        loadFeedback() // Reload data
        if (selectedFeedback?.id === feedbackId) {
          setSelectedFeedback({ ...selectedFeedback, status: newStatus })
        }
      }
    } catch (error) {
      console.error('Failed to update feedback status:', error)
    }
  }

  const getTypeIcon = (type: FeedbackItem['type']) => {
    switch (type) {
      case 'bug': return <Bug className="h-4 w-4 text-red-500" />
      case 'feature': return <Lightbulb className="h-4 w-4 text-blue-500" />
      case 'performance': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default: return <MessageSquare className="h-4 w-4 text-green-500" />
    }
  }

  const getPriorityColor = (priority: FeedbackItem['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: FeedbackItem['status']) => {
    switch (status) {
      case 'open': return <Clock className="h-4 w-4 text-blue-500" />
      case 'in-progress': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'closed': return <X className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading feedback...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feedback Management</h2>
          <p className="text-muted-foreground">
            Monitor and manage user feedback and bug reports
          </p>
        </div>
        <Button onClick={loadFeedback}>
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Total Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Bug className="h-4 w-4 mr-2 text-red-500" />
                Bug Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byType.bug || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                High Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.byPriority.high || 0) + (stats.byPriority.critical || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Star className="h-4 w-4 mr-2 text-yellow-400" />
                Avg Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                value={filter.type}
                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="">All Types</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="performance">Performance Issue</option>
                <option value="general">General Feedback</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Priority</label>
              <select
                value={filter.priority}
                onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Feedback Items ({feedback.length})</h3>
          
          {feedback.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No feedback items found.
              </CardContent>
            </Card>
          ) : (
            feedback.map((item) => (
              <Card 
                key={item.id} 
                className={`cursor-pointer transition-colors ${
                  selectedFeedback?.id === item.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedFeedback(item)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(item.type)}
                      <CardTitle className="text-base">{item.title}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getPriorityColor(item.priority)} text-white`}>
                        {item.priority}
                      </Badge>
                      {getStatusIcon(item.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {item.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-2">
                      {item.votes.up > 0 && (
                        <span className="text-green-600">👍 {item.votes.up}</span>
                      )}
                      {item.votes.down > 0 && (
                        <span className="text-red-600">👎 {item.votes.down}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Feedback Detail */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Feedback Details</h3>
          
          {selectedFeedback ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(selectedFeedback.type)}
                    <CardTitle>{selectedFeedback.title}</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getPriorityColor(selectedFeedback.priority)} text-white`}>
                      {selectedFeedback.priority}
                    </Badge>
                    {getStatusIcon(selectedFeedback.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedFeedback.description}</p>
                </div>

                {selectedFeedback.metadata?.reproductionSteps && selectedFeedback.metadata.reproductionSteps.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Reproduction Steps</h4>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      {selectedFeedback.metadata.reproductionSteps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {selectedFeedback.metadata?.expectedBehavior && (
                  <div>
                    <h4 className="font-medium mb-2">Expected Behavior</h4>
                    <p className="text-sm text-muted-foreground">{selectedFeedback.metadata.expectedBehavior}</p>
                  </div>
                )}

                {selectedFeedback.metadata?.actualBehavior && (
                  <div>
                    <h4 className="font-medium mb-2">Actual Behavior</h4>
                    <p className="text-sm text-muted-foreground">{selectedFeedback.metadata.actualBehavior}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Technical Details</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>URL: {selectedFeedback.metadata?.url || 'N/A'}</div>
                    <div>Device: {selectedFeedback.metadata?.deviceInfo || 'N/A'}</div>
                    <div>User: {selectedFeedback.userEmail || 'Anonymous'}</div>
                    <div>Created: {new Date(selectedFeedback.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Update Status</h4>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant={selectedFeedback.status === 'open' ? 'default' : 'outline'}
                      onClick={() => updateFeedbackStatus(selectedFeedback.id, 'open')}
                    >
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedFeedback.status === 'in-progress' ? 'default' : 'outline'}
                      onClick={() => updateFeedbackStatus(selectedFeedback.id, 'in-progress')}
                    >
                      In Progress
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedFeedback.status === 'resolved' ? 'default' : 'outline'}
                      onClick={() => updateFeedbackStatus(selectedFeedback.id, 'resolved')}
                    >
                      Resolved
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedFeedback.status === 'closed' ? 'default' : 'outline'}
                      onClick={() => updateFeedbackStatus(selectedFeedback.id, 'closed')}
                    >
                      Closed
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Select a feedback item to view details
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
