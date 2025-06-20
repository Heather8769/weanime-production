'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  Star, 
  Send, 
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import { errorCollector } from '@/lib/error-collector'

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
    screenshots?: string[]
  }
  votes: {
    up: number
    down: number
    userVote?: 'up' | 'down'
  }
}

interface FeedbackFormData {
  type: FeedbackItem['type']
  title: string
  description: string
  priority: FeedbackItem['priority']
  rating?: number
  reproductionSteps: string
  expectedBehavior: string
  actualBehavior: string
}

export function FeedbackSystem() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'submit' | 'view'>('submit')
  const [formData, setFormData] = useState<FeedbackFormData>({
    type: 'general',
    title: '',
    description: '',
    priority: 'medium',
    rating: undefined,
    reproductionSteps: '',
    expectedBehavior: '',
    actualBehavior: ''
  })

  const feedbackTypes = [
    { value: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500' },
    { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-blue-500' },
    { value: 'performance', label: 'Performance Issue', icon: AlertTriangle, color: 'text-yellow-500' },
    { value: 'general', label: 'General Feedback', icon: MessageSquare, color: 'text-green-500' }
  ]

  const priorityLevels = [
    { value: 'low', label: 'Low', color: 'bg-gray-500' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
    { value: 'high', label: 'High', color: 'bg-orange-500' },
    { value: 'critical', label: 'Critical', color: 'bg-red-500' }
  ]

  useEffect(() => {
    if (isOpen && activeTab === 'view') {
      loadFeedback()
    }
  }, [isOpen, activeTab])

  const loadFeedback = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/feedback')
      if (response.ok) {
        const data = await response.json()
        setFeedbackList(data.feedback || [])
      }
    } catch (error) {
      console.error('Failed to load feedback:', error)
      errorCollector.error('FeedbackSystem', 'Failed to load feedback', { error })
    } finally {
      setLoading(false)
    }
  }

  const submitFeedback = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      return
    }

    setSubmitting(true)
    try {
      const feedbackData: Partial<FeedbackItem> = {
        ...formData,
        userId: user?.id,
        userEmail: user?.email,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          deviceInfo: `${navigator.platform} - ${screen.width}x${screen.height}`,
          reproductionSteps: formData.reproductionSteps ? formData.reproductionSteps.split('\n').filter(Boolean) : [],
          expectedBehavior: formData.expectedBehavior,
          actualBehavior: formData.actualBehavior
        },
        votes: { up: 0, down: 0 }
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
      })

      if (response.ok) {
        // Reset form
        setFormData({
          type: 'general',
          title: '',
          description: '',
          priority: 'medium',
          rating: undefined,
          reproductionSteps: '',
          expectedBehavior: '',
          actualBehavior: ''
        })
        
        // Log successful submission
        errorCollector.info('FeedbackSystem', 'Feedback submitted successfully', {
          type: formData.type,
          priority: formData.priority
        })
        
        // Switch to view tab to show submitted feedback
        setActiveTab('view')
        loadFeedback()
      } else {
        throw new Error('Failed to submit feedback')
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      errorCollector.error('FeedbackSystem', 'Failed to submit feedback', { error })
    } finally {
      setSubmitting(false)
    }
  }

  const voteFeedback = async (feedbackId: string, vote: 'up' | 'down') => {
    try {
      const response = await fetch(`/api/feedback/${feedbackId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote, userId: user?.id })
      })

      if (response.ok) {
        loadFeedback() // Reload to get updated votes
      }
    } catch (error) {
      console.error('Failed to vote on feedback:', error)
    }
  }

  const getTypeIcon = (type: FeedbackItem['type']) => {
    const typeConfig = feedbackTypes.find(t => t.value === type)
    const Icon = typeConfig?.icon || MessageSquare
    return <Icon className={`h-4 w-4 ${typeConfig?.color || 'text-gray-500'}`} />
  }

  const getPriorityBadge = (priority: FeedbackItem['priority']) => {
    const config = priorityLevels.find(p => p.value === priority)
    return (
      <Badge className={`${config?.color || 'bg-gray-500'} text-white`}>
        {config?.label || priority}
      </Badge>
    )
  }

  const getStatusIcon = (status: FeedbackItem['status']) => {
    switch (status) {
      case 'open': return <Clock className="h-4 w-4 text-blue-500" />
      case 'in-progress': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'closed': return <X className="h-4 w-4 text-gray-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <>
      {/* Feedback Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageSquare className="h-6 w-6" />
      </motion.button>

      {/* Feedback Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold">Feedback & Support</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Tabs */}
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab('submit')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'submit'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Submit Feedback
                </button>
                <button
                  onClick={() => setActiveTab('view')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'view'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  View Feedback
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {activeTab === 'submit' ? (
                  <div className="space-y-6">
                    {/* Feedback Type */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Feedback Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {feedbackTypes.map((type) => {
                          const Icon = type.icon
                          return (
                            <button
                              key={type.value}
                              onClick={() => setFormData({ ...formData, type: type.value as FeedbackItem['type'] })}
                              className={`p-3 rounded-lg border text-left transition-colors ${
                                formData.type === type.value
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <Icon className={`h-4 w-4 ${type.color}`} />
                                <span className="text-sm font-medium">{type.label}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Brief description of the issue or suggestion"
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Detailed description of the issue or suggestion"
                        rows={4}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as FeedbackItem['priority'] })}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {priorityLevels.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Bug-specific fields */}
                    {formData.type === 'bug' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Steps to Reproduce</label>
                          <textarea
                            value={formData.reproductionSteps}
                            onChange={(e) => setFormData({ ...formData, reproductionSteps: e.target.value })}
                            placeholder="1. Go to...\n2. Click on...\n3. See error"
                            rows={3}
                            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Expected Behavior</label>
                            <textarea
                              value={formData.expectedBehavior}
                              onChange={(e) => setFormData({ ...formData, expectedBehavior: e.target.value })}
                              placeholder="What should happen?"
                              rows={2}
                              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Actual Behavior</label>
                            <textarea
                              value={formData.actualBehavior}
                              onChange={(e) => setFormData({ ...formData, actualBehavior: e.target.value })}
                              placeholder="What actually happens?"
                              rows={2}
                              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Rating for general feedback */}
                    {formData.type === 'general' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Overall Rating (Optional)</label>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setFormData({ ...formData, rating: star })}
                              className="p-1"
                            >
                              <Star
                                className={`h-6 w-6 ${
                                  formData.rating && star <= formData.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      onClick={submitFeedback}
                      disabled={submitting || !formData.title.trim() || !formData.description.trim()}
                      className="w-full"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Feedback
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : feedbackList.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No feedback submitted yet.
                      </div>
                    ) : (
                      feedbackList.map((feedback) => (
                        <Card key={feedback.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                {getTypeIcon(feedback.type)}
                                <CardTitle className="text-lg">{feedback.title}</CardTitle>
                              </div>
                              <div className="flex items-center space-x-2">
                                {getPriorityBadge(feedback.priority)}
                                {getStatusIcon(feedback.status)}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground mb-4">{feedback.description}</p>
                            
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                              
                              {user && (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => voteFeedback(feedback.id, 'up')}
                                    className={`flex items-center space-x-1 px-2 py-1 rounded ${
                                      feedback.votes.userVote === 'up' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'
                                    }`}
                                  >
                                    <ThumbsUp className="h-3 w-3" />
                                    <span>{feedback.votes.up}</span>
                                  </button>
                                  
                                  <button
                                    onClick={() => voteFeedback(feedback.id, 'down')}
                                    className={`flex items-center space-x-1 px-2 py-1 rounded ${
                                      feedback.votes.userVote === 'down' ? 'bg-red-100 text-red-700' : 'hover:bg-gray-100'
                                    }`}
                                  >
                                    <ThumbsDown className="h-3 w-3" />
                                    <span>{feedback.votes.down}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
