import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Heart, Brain, Lightbulb, Settings } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'

interface AIPreferences {
  aiSensitivity: 'supportive' | 'neutral' | 'direct'
  allowHumor: boolean
  autoDeescalate: boolean
  showPatternExplanations: boolean
}

interface AIPreferencesSettingsProps {
  onPreferencesChange?: (preferences: AIPreferences) => void
  className?: string
}

const SENSITIVITY_OPTIONS = [
  {
    value: 'supportive' as const,
    label: 'Supportive & Gentle',
    description: 'AI uses empathetic language and assumes positive intent',
    icon: Heart,
    color: 'text-pink-500'
  },
  {
    value: 'neutral' as const,
    label: 'Professional & Clear',
    description: 'AI uses clear, professional language without emotional overtones',
    icon: Brain,
    color: 'text-blue-500'
  },
  {
    value: 'direct' as const,
    label: 'Direct & Witty',
    description: 'AI uses straightforward language with dry humor when appropriate',
    icon: Lightbulb,
    color: 'text-amber-500'
  }
]

export default function AIPreferencesSettings({ onPreferencesChange, className }: AIPreferencesSettingsProps) {
  const [preferences, setPreferences] = useKV<AIPreferences>('ai-preferences', {
    aiSensitivity: 'neutral',
    allowHumor: false,
    autoDeescalate: true,
    showPatternExplanations: true
  })

  const [previewMode, setPreviewMode] = useState(false)
  const [previewText, setPreviewText] = useState('')

  useEffect(() => {
    if (onPreferencesChange && preferences) {
      onPreferencesChange(preferences)
    }
  }, [preferences, onPreferencesChange])

  const updatePreference = <K extends keyof AIPreferences>(
    key: K,
    value: AIPreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
  }

  const getPreviewText = (sensitivity: AIPreferences['aiSensitivity']) => {
    const previews = {
      supportive: "I notice this message might come across differently than intended. It sounds like you both care deeply about resolving this. Would you like to try rephrasing to focus on how you're feeling?",
      neutral: "This statement could be interpreted as problematic. Consider rephrasing to focus on the specific issue rather than making generalizations about the other person.",
      direct: "Hold up there, champ. That statement has some blame Olympics vibes. How about we try focusing on the actual issue instead of who's more wrong?"
    }
    return previews[sensitivity]
  }

  const handlePreview = (sensitivity: AIPreferences['aiSensitivity']) => {
    setPreviewText(getPreviewText(sensitivity))
    setPreviewMode(true)
    setTimeout(() => setPreviewMode(false), 3000)
  }

  if (!preferences) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading preferences...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings size={20} />
          AI Personality Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Customize how the AI communicates with you during conflicts. This directly affects 
          the tone and approach of AI suggestions.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Sensitivity Level */}
        <div className="space-y-4">
          <Label className="text-base font-medium">AI Communication Style</Label>
          <RadioGroup
            value={preferences.aiSensitivity}
            onValueChange={(value) => updatePreference('aiSensitivity', value as AIPreferences['aiSensitivity'])}
            className="space-y-3"
          >
            {SENSITIVITY_OPTIONS.map((option) => {
              const IconComponent = option.icon
              return (
                <div key={option.value} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <IconComponent size={16} className={option.color} />
                      <Label htmlFor={option.value} className="font-medium cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7"
                      onClick={() => handlePreview(option.value)}
                    >
                      Preview Example
                    </Button>
                  </div>
                </div>
              )
            })}
          </RadioGroup>
        </div>

        {/* Preview Alert */}
        {previewMode && previewText && (
          <Alert>
            <Robot size={16} />
            <AlertDescription className="font-medium">
              AI Example Response: "{previewText}"
            </AlertDescription>
          </Alert>
        )}

        {/* Additional Options */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-medium">Additional Options</Label>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="font-medium">Allow Humor</Label>
              <p className="text-sm text-muted-foreground">
                Let the AI use appropriate humor to lighten tense moments
              </p>
            </div>
            <Switch
              checked={preferences.allowHumor}
              onCheckedChange={(checked) => updatePreference('allowHumor', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="font-medium">Auto De-escalation</Label>
              <p className="text-sm text-muted-foreground">
                Automatically adjust tone when emotions run high
              </p>
            </div>
            <Switch
              checked={preferences.autoDeescalate}
              onCheckedChange={(checked) => updatePreference('autoDeescalate', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="font-medium">Pattern Explanations</Label>
              <p className="text-sm text-muted-foreground">
                Show explanations when communication patterns are detected
              </p>
            </div>
            <Switch
              checked={preferences.showPatternExplanations}
              onCheckedChange={(checked) => updatePreference('showPatternExplanations', checked)}
            />
          </div>
        </div>

        {/* Info Alert */}
        <Alert>
          <Brain size={16} />
          <AlertDescription>
            <strong>Why this matters:</strong> Research shows that AI tone significantly impacts 
            conflict resolution success. Choose the style that feels most comfortable for you 
            during stressful conversations.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}