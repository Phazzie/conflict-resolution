import { ConflictContext, ConflictContextConfig } from '../types/session'

export const CONFLICT_CONTEXTS: Record<ConflictContext, ConflictContextConfig> = {
  relationship: {
    type: 'relationship',
    label: 'Romantic Relationship',
    description: 'Partnership conflicts, communication issues, and relationship dynamics',
    participantRoles: ['Partner A', 'Partner B'],
    commonIssues: [
      'Communication breakdown',
      'Trust and betrayal issues',
      'Intimacy and emotional connection',
      'Financial decisions and spending',
      'Family planning and future goals',
      'Household responsibilities',
      'Social boundaries and friendships',
      'Personal space and independence'
    ],
    specialConsiderations: [
      'Emotional vulnerability and attachment',
      'Long-term commitment implications',
      'Shared living space and daily interactions',
      'Intimate relationship dynamics'
    ],
    aiPromptModifiers: [
      'Consider the intimate and emotional nature of romantic relationships',
      'Focus on building emotional connection and trust',
      'Address underlying relationship patterns and attachment styles',
      'Emphasize empathy and emotional validation'
    ]
  },
  workplace: {
    type: 'workplace',
    label: 'Workplace Conflict',
    description: 'Professional disagreements, team dynamics, and organizational issues',
    participantRoles: ['Team Member A', 'Team Member B'],
    commonIssues: [
      'Project management and deadlines',
      'Role clarity and responsibilities',
      'Communication styles and meetings',
      'Resource allocation and priorities',
      'Performance feedback and evaluation',
      'Team collaboration and workflow',
      'Leadership and decision-making',
      'Workplace culture and values'
    ],
    specialConsiderations: [
      'Professional boundaries and hierarchy',
      'Career implications and advancement',
      'Company policies and procedures',
      'Team dynamics and organizational culture'
    ],
    aiPromptModifiers: [
      'Maintain professional tone and workplace appropriate language',
      'Consider organizational hierarchy and reporting structures',
      'Focus on business outcomes and team effectiveness',
      'Emphasize constructive feedback and professional development'
    ]
  },
  family: {
    type: 'family',
    label: 'Family Conflict',
    description: 'Intergenerational issues, sibling disputes, and family dynamics',
    participantRoles: ['Family Member A', 'Family Member B'],
    commonIssues: [
      'Parenting styles and child-rearing',
      'Elder care and family responsibilities',
      'Financial support and inheritance',
      'Holiday traditions and family gatherings',
      'Lifestyle choices and personal values',
      'Sibling rivalry and fairness',
      'Extended family relationships',
      'Family business or property decisions'
    ],
    specialConsiderations: [
      'Long-term family relationships and history',
      'Intergenerational dynamics and power structures',
      'Family roles and expectations',
      'Shared family heritage and traditions'
    ],
    aiPromptModifiers: [
      'Consider family history and established relationship patterns',
      'Respect generational differences and cultural values',
      'Focus on preserving family bonds and relationships',
      'Address family roles and traditional expectations sensitively'
    ]
  }
}

export const getContextConfig = (context: ConflictContext): ConflictContextConfig => {
  return CONFLICT_CONTEXTS[context]
}

export const getContextSpecificPrompt = (context: ConflictContext, basePrompt: string): string => {
  const config = getContextConfig(context)
  const modifiers = config.aiPromptModifiers.join('. ')
  
  return `${basePrompt}

Context: This is a ${config.label.toLowerCase()} conflict. ${modifiers}.

Special considerations for this context:
${config.specialConsiderations.map(c => `- ${c}`).join('\n')}

Please tailor your response appropriately for this specific conflict type.`
}