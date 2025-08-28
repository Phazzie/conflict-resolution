import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConflictContext, SessionData } from '../types/session'
import { CONFLICT_CONTEXTS } from '../services/conflictContexts'
import { Heart, Briefcase, Users, ArrowRight, CheckCircle } from '@phosphor-icons/react'

interface ConflictContextSelectorProps {
  sessionData: SessionData
  updateSessionData: (updates: Partial<SessionData>) => void
}

const CONTEXT_ICONS = {
  relationship: Heart,
  workplace: Briefcase,
  family: Users
}

const CONTEXT_COLORS = {
  relationship: 'text-pink-500',
  workplace: 'text-blue-500', 
  family: 'text-green-500'
}

export default function ConflictContextSelector({ sessionData, updateSessionData }: ConflictContextSelectorProps) {
  const selectContext = (context: ConflictContext) => {
    updateSessionData({ 
      conflictContext: context,
      phase: 'issue-agreement' 
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Choose Your Conflict Arena
        </h2>
        <p className="text-muted-foreground">
          Different contexts require different approaches. Pick your battlefield wisely.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(CONFLICT_CONTEXTS) as ConflictContext[]).map((context) => {
          const config = CONFLICT_CONTEXTS[context]
          const Icon = CONTEXT_ICONS[context]
          const colorClass = CONTEXT_COLORS[context]
          
          return (
            <Card 
              key={context} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => selectContext(context)}
            >
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <Icon size={24} className={colorClass} />
                  <span className="text-lg">{config.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {config.description}
                </p>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Participant Roles:
                    </p>
                    <div className="flex gap-1">
                      {config.participantRoles.map((role, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Common Issues:
                    </p>
                    <div className="text-xs text-muted-foreground">
                      {config.commonIssues.slice(0, 3).map((issue, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <CheckCircle size={12} className={colorClass} />
                          <span>{issue}</span>
                        </div>
                      ))}
                      {config.commonIssues.length > 3 && (
                        <div className="text-xs text-muted-foreground/70 mt-1">
                          +{config.commonIssues.length - 3} more...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full mt-4 group-hover:bg-primary/90"
                  onClick={(e) => {
                    e.stopPropagation()
                    selectContext(context)
                  }}
                >
                  Enter {config.label}
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="text-center">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">Why Context Matters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div className="text-center">
                <Heart size={20} className="text-pink-500 mx-auto mb-2" />
                <p><strong>Relationships:</strong> Focus on emotional connection and intimacy patterns</p>
              </div>
              <div className="text-center">
                <Briefcase size={20} className="text-blue-500 mx-auto mb-2" />
                <p><strong>Workplace:</strong> Emphasize professional outcomes and team dynamics</p>
              </div>
              <div className="text-center">
                <Users size={20} className="text-green-500 mx-auto mb-2" />
                <p><strong>Family:</strong> Consider long-term bonds and generational differences</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}