'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Bug, 
  Camera, 
  Monitor, 
  Smartphone, 
  Globe, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Upload,
  X
} from 'lucide-react'

interface BugReportData {
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'ui' | 'functionality' | 'performance' | 'security' | 'compatibility'
  reproductionSteps: string[]
  expectedBehavior: string
  actualBehavior: string
  environment: {
    browser: string
    browserVersion: string
    os: string
    device: string
    screenResolution: string
    url: string
  }
  frequency: 'always' | 'often' | 'sometimes' | 'rarely'
  workaround: string
  screenshots: File[]
  additionalInfo: string
  userImpact: string
  affectedFeatures: string[]
}

interface BugReportTemplateProps {
  onSubmit: (data: BugReportData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function BugReportTemplate({ onSubmit, onCancel, isSubmitting = false }: BugReportTemplateProps) {
  const [formData, setFormData] = useState<BugReportData>({
    title: '',
    description: '',
    severity: 'medium',
    category: 'functionality',
    reproductionSteps: [''],
    expectedBehavior: '',
    actualBehavior: '',
    environment: {
      browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
               navigator.userAgent.includes('Firefox') ? 'Firefox' :
               navigator.userAgent.includes('Safari') ? 'Safari' : 'Other',
      browserVersion: navigator.userAgent,
      os: navigator.platform,
      device: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
      screenResolution: `${screen.width}x${screen.height}`,
      url: typeof window !== 'undefined' ? window.location.href : ''
    },
    frequency: 'sometimes',
    workaround: '',
    screenshots: [],
    additionalInfo: '',
    userImpact: '',
    affectedFeatures: []
  })

  const severityLevels = [
    { value: 'low', label: 'Low', description: 'Minor issue, cosmetic problem', color: 'bg-gray-500' },
    { value: 'medium', label: 'Medium', description: 'Moderate impact on functionality', color: 'bg-blue-500' },
    { value: 'high', label: 'High', description: 'Significant impact, blocks important features', color: 'bg-orange-500' },
    { value: 'critical', label: 'Critical', description: 'System crash, data loss, security issue', color: 'bg-red-500' }
  ]

  const categories = [
    { value: 'ui', label: 'User Interface', icon: Monitor },
    { value: 'functionality', label: 'Functionality', icon: Bug },
    { value: 'performance', label: 'Performance', icon: Clock },
    { value: 'security', label: 'Security', icon: AlertTriangle },
    { value: 'compatibility', label: 'Compatibility', icon: Globe }
  ]

  const frequencyOptions = [
    { value: 'always', label: 'Always (100%)', description: 'Happens every time' },
    { value: 'often', label: 'Often (75%)', description: 'Happens most of the time' },
    { value: 'sometimes', label: 'Sometimes (50%)', description: 'Happens occasionally' },
    { value: 'rarely', label: 'Rarely (25%)', description: 'Happens infrequently' }
  ]

  const availableFeatures = [
    'Video Playback', 'Search', 'User Authentication', 'Comments', 'Ratings',
    'Watchlist', 'Profile Management', 'Navigation', 'Mobile Interface', 'Notifications'
  ]

  const addReproductionStep = () => {
    setFormData({
      ...formData,
      reproductionSteps: [...formData.reproductionSteps, '']
    })
  }

  const updateReproductionStep = (index: number, value: string) => {
    const newSteps = [...formData.reproductionSteps]
    newSteps[index] = value
    setFormData({ ...formData, reproductionSteps: newSteps })
  }

  const removeReproductionStep = (index: number) => {
    if (formData.reproductionSteps.length > 1) {
      const newSteps = formData.reproductionSteps.filter((_, i) => i !== index)
      setFormData({ ...formData, reproductionSteps: newSteps })
    }
  }

  const handleScreenshotUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setFormData({
      ...formData,
      screenshots: [...formData.screenshots, ...files].slice(0, 5) // Limit to 5 screenshots
    })
  }

  const removeScreenshot = (index: number) => {
    const newScreenshots = formData.screenshots.filter((_, i) => i !== index)
    setFormData({ ...formData, screenshots: newScreenshots })
  }

  const toggleAffectedFeature = (feature: string) => {
    const isSelected = formData.affectedFeatures.includes(feature)
    const newFeatures = isSelected
      ? formData.affectedFeatures.filter(f => f !== feature)
      : [...formData.affectedFeatures, feature]
    
    setFormData({ ...formData, affectedFeatures: newFeatures })
  }

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.title.trim() || !formData.description.trim() || !formData.actualBehavior.trim()) {
      return
    }

    // Filter out empty reproduction steps
    const cleanedData = {
      ...formData,
      reproductionSteps: formData.reproductionSteps.filter(step => step.trim() !== '')
    }

    onSubmit(cleanedData)
  }

  const getSeverityConfig = (severity: string) => {
    return severityLevels.find(s => s.value === severity) || severityLevels[1]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Bug className="h-6 w-6 text-red-500" />
        <h3 className="text-xl font-semibold">Bug Report</h3>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Bug Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief, descriptive title of the bug"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the bug"
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Severity *</Label>
              <Select value={formData.severity} onValueChange={(value: any) => setFormData({ ...formData, severity: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {severityLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${level.color}`} />
                        <div>
                          <div className="font-medium">{level.label}</div>
                          <div className="text-xs text-muted-foreground">{level.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => {
                    const Icon = category.icon
                    return (
                      <SelectItem key={category.value} value={category.value}>
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <span>{category.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reproduction Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Reproduction Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.reproductionSteps.map((step, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
              <Input
                value={step}
                onChange={(e) => updateReproductionStep(index, e.target.value)}
                placeholder={`Step ${index + 1}`}
                className="flex-1"
              />
              {formData.reproductionSteps.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeReproductionStep(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          
          <Button variant="outline" onClick={addReproductionStep} className="w-full">
            Add Step
          </Button>
        </CardContent>
      </Card>

      {/* Expected vs Actual Behavior */}
      <Card>
        <CardHeader>
          <CardTitle>Behavior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="expected">Expected Behavior</Label>
            <Textarea
              id="expected"
              value={formData.expectedBehavior}
              onChange={(e) => setFormData({ ...formData, expectedBehavior: e.target.value })}
              placeholder="What should happen?"
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="actual">Actual Behavior *</Label>
            <Textarea
              id="actual"
              value={formData.actualBehavior}
              onChange={(e) => setFormData({ ...formData, actualBehavior: e.target.value })}
              placeholder="What actually happens?"
              rows={2}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Environment & Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>Environment & Frequency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Browser</Label>
              <Input
                value={formData.environment.browser}
                onChange={(e) => setFormData({
                  ...formData,
                  environment: { ...formData.environment, browser: e.target.value }
                })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Device Type</Label>
              <Select 
                value={formData.environment.device} 
                onValueChange={(value: string) => setFormData({
                  ...formData,
                  environment: { ...formData.environment, device: value }
                })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Desktop">Desktop</SelectItem>
                  <SelectItem value="Mobile">Mobile</SelectItem>
                  <SelectItem value="Tablet">Tablet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>How often does this occur?</Label>
            <Select value={formData.frequency} onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Affected Features */}
      <Card>
        <CardHeader>
          <CardTitle>Affected Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {availableFeatures.map((feature) => (
              <div key={feature} className="flex items-center space-x-2">
                <Checkbox
                  id={feature}
                  checked={formData.affectedFeatures.includes(feature)}
                  onCheckedChange={() => toggleAffectedFeature(feature)}
                />
                <Label htmlFor={feature} className="text-sm">{feature}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="workaround">Workaround (if any)</Label>
            <Textarea
              id="workaround"
              value={formData.workaround}
              onChange={(e) => setFormData({ ...formData, workaround: e.target.value })}
              placeholder="Any temporary solution or workaround you've found"
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="userImpact">User Impact</Label>
            <Textarea
              id="userImpact"
              value={formData.userImpact}
              onChange={(e) => setFormData({ ...formData, userImpact: e.target.value })}
              placeholder="How does this bug affect your experience?"
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="additionalInfo">Additional Information</Label>
            <Textarea
              id="additionalInfo"
              value={formData.additionalInfo}
              onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
              placeholder="Any other relevant information"
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Screenshots */}
          <div>
            <Label>Screenshots (Optional)</Label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleScreenshotUpload}
                  className="hidden"
                  id="screenshot-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('screenshot-upload')?.click()}
                  disabled={formData.screenshots.length >= 5}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Screenshots ({formData.screenshots.length}/5)
                </Button>
              </div>

              {formData.screenshots.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {formData.screenshots.map((file, index) => (
                    <div key={index} className="relative">
                      <div className="aspect-video bg-muted rounded border flex items-center justify-center">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0"
                        onClick={() => removeScreenshot(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !formData.title.trim() || !formData.description.trim() || !formData.actualBehavior.trim()}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            <>
              <Bug className="h-4 w-4 mr-2" />
              Submit Bug Report
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
