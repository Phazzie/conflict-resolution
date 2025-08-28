# MixitFixit: Product Requirements Document (PRD)

## Core Purpose & Success

**Mission Statement**: MixitFixit forces conflicted individuals to structure their disagreements, demonstrate mutual understanding, and reach accountable resolutions through AI-moderated discourse - whether in relationships, workplaces, or families.

**Success Indicators**: 
- Sessions that progress to locked resolutions (>60%)
- Reduced AI interventions over multiple sessions (indicating improved communication)
- User feedback indicating "less painful than our usual fights"
- Measurable follow-through on agreed resolutions
- Cross-context usage showing platform versatility

**Experience Qualities**: Direct, Context-Aware, Therapeutically Effective

## Market Expansion & Target Audiences

**Primary Markets**:
1. **Romantic Relationships**: Couples dealing with recurring communication issues and conflict patterns
2. **Workplace Conflicts**: Team members, colleagues, and professional relationships needing structured resolution
3. **Family Dynamics**: Parent-child, sibling, and extended family conflicts requiring sensitive handling

**Market Size & Opportunity**:
- Relationship counseling market: $4.2B globally
- Corporate conflict resolution training: $2.8B annually  
- Family therapy and mediation: $1.9B market
- Total addressable market: $8.9B with significant overlap potential

## Project Classification & Approach

**Complexity Level**: Complex Application (multiple features with context-aware AI, cross-domain applicability, and adaptive learning)

**Primary User Activity**: Interacting - structured conflict resolution with context-specific guidance and forced accountability

## Thought Process for Feature Selection

**Core Problem Analysis**: People across all relationship types get stuck in circular arguments because they never agree on what they're fighting about, don't understand each other's perspectives, and have no accountability for their stated positions. The dynamics vary significantly between romantic partners, workplace colleagues, and family members.

**User Context**: Used during or immediately after conflicts when emotions are high but both parties want to resolve things constructively rather than just "winning." Context matters - workplace conflicts require professional boundaries, family conflicts need generational sensitivity, and romantic conflicts demand emotional intimacy.

**Critical Path**: Context Selection → Issue Agreement → Steel-Manning → Statement Locking → AI-Moderated Discussion → Resolution Negotiation → Binding Agreement

**Key Moments**: 
1. Context selection that determines appropriate communication style
2. The moment both parties accept the same issue definition
3. Statement locking (point of no return for positions) 
4. First context-aware AI intervention calling out inappropriate communication
5. Mutual acceptance of context-appropriate final resolution

## Essential Features

### Context Selection System
- **What it does**: Users choose between relationship, workplace, or family conflict contexts, each with tailored approaches
- **Why it matters**: Different contexts require different communication styles, boundaries, and resolution approaches
- **Success criteria**: Clear context selection with appropriate AI prompting and guidance adaptation

### Context-Aware Issue Agreement Logic
- **What it does**: Forces iterative negotiation until both parties agree on the exact wording of the problem, with context-specific common issues suggested
- **Why it matters**: Prevents arguing about different issues while thinking you're discussing the same thing
- **Success criteria**: Both users click "Accept" on identical issue text appropriate to their context

### Context-Sensitive Steel-Manning Phase  
- **What it does**: Requires each person to articulate the other's perspective accurately enough to earn approval, with context-appropriate language expectations
- **Why it matters**: Prevents "you're not even listening" accusations and forces cognitive empathy while respecting context boundaries
- **Success criteria**: Both steel-man attempts are approved by the target person using context-appropriate criteria

### Statement Locking
- **What it does**: Creates immutable, timestamped position statements that can't be edited or denied later
- **Why it matters**: Eliminates gaslighting, memory gaps, and moving goalposts
- **Success criteria**: Both statements locked with clear "no take-backs" acknowledgment

### AI-Moderated Discussion
- **What it does**: LLM-powered referee identifies toxic communication patterns and suggests constructive rephrasing with context-aware guidance
- **Why it matters**: Provides neutral third-party perspective that spots manipulation tactics humans miss, tailored to relationship type
- **Success criteria**: Contextually relevant interventions that actually improve communication quality within appropriate boundaries

### Context-Adaptive Analytics Dashboard  
- **What it does**: Tracks patterns across different conflict types with context-specific metrics and insights
- **Why it matters**: Understanding how communication patterns differ across contexts helps users improve broadly
- **Success criteria**: Clear insights showing context-specific communication effectiveness and improvement areas

### Resolution Negotiation
- **What it does**: Proposal/counter-proposal system requiring explicit mutual agreement before finalization  
- **Why it matters**: Ensures both parties are genuinely committed to the same solution
- **Success criteria**: Final resolution text is identically agreed upon by both users

## Design Direction

### Visual Tone & Identity
**Emotional Response**: Professional therapy meets Silicon Valley efficiency - serious but not heavy, direct but not cruel
**Design Personality**: Clean, confident, slightly edgy - like a really good therapist who doesn't coddle
**Visual Metaphors**: Courtroom + therapy office + digital workspace
**Simplicity Spectrum**: Minimal interface complexity, maximum functional sophistication

### Color Strategy
**Color Scheme Type**: Analogous with strategic complementary accents
**Primary Color**: Deep blue (oklch(0.45 0.12 200)) - trustworthy, professional, calming authority
**Secondary Colors**: Warm grays (oklch(0.65 0.02 45)) - neutral, supportive
**Accent Color**: Amber (oklch(0.65 0.15 45)) - attention-grabbing for key actions and warnings
**Color Psychology**: Blue builds trust, gray stays neutral, amber signals importance without aggression
**Color Accessibility**: All combinations tested at WCAG AA (4.5:1) minimum contrast

### Typography System
**Font Pairing Strategy**: Single font family (Inter) with varied weights for hierarchy
**Typographic Hierarchy**: Bold for headings, medium for labels, regular for body, tight line spacing for focused reading
**Font Personality**: Clean, readable, slightly technical - no-nonsense but not clinical
**Readability Focus**: Optimized for heated emotional states - larger text, generous spacing
**Typography Consistency**: Consistent scale (1.25 ratio), never more than 4 text sizes on screen
**Which fonts**: Inter (Google Fonts) - highly legible, professional, slightly warm
**Legibility Check**: Tested across devices and emotional states - remains readable when users are upset

### Visual Hierarchy & Layout
**Attention Direction**: Progress indicators → current action → secondary context → help text
**White Space Philosophy**: Generous breathing room to reduce cognitive load during emotional stress
**Grid System**: 12-column responsive grid with consistent 24px spacing units
**Responsive Approach**: Mobile-first with touch-friendly targets (minimum 44px)
**Content Density**: Deliberately sparse - one primary action per screen

### Animations
**Purposeful Meaning**: State transitions reinforce progress, loading states maintain user confidence
**Hierarchy of Movement**: Critical actions get subtle emphasis, success states get celebration micro-animations
**Contextual Appropriateness**: Professional, restrained - no playful bouncing during serious conversations

### UI Elements & Component Selection
**Component Usage**: 
- Cards for phase containers (clear boundaries)
- Badges for status indicators (immediate recognition)
- Buttons with clear hierarchy (primary for progression, destructive for rejection)
- Textareas with generous sizing (comfortable for longer thoughts)
- Progress bars for session advancement (visual motivation)

**Component Customization**: 
- Rounded corners (8px) for friendliness without being juvenile
- Subtle shadows for depth and focus
- Color-coded locks/checks for state confirmation
- Consistent 16px icon sizing

**Component States**: All interactive elements have hover, focus, active, and disabled states with clear visual feedback

**Icon Selection**: Phosphor Icons - clean, consistent, professional set
**Component Hierarchy**: Primary actions (blue), secondary (gray), destructive (red), success (green)
**Spacing System**: 4px base unit, 8px/16px/24px/32px scale
**Mobile Adaptation**: Larger touch targets, single-column layouts, bottom-sheet patterns for mobile

### Visual Consistency Framework
**Design System Approach**: Component-based with clear props and variants
**Style Guide Elements**: Color palette, typography scale, spacing system, component library
**Visual Rhythm**: Consistent vertical spacing (24px baseline) creates predictable layout patterns
**Brand Alignment**: Professional therapeutic tool, not casual social app

### Accessibility & Readability
**Contrast Goal**: WCAG AA compliance minimum, AAA where possible
**Keyboard Navigation**: Full keyboard accessibility with logical tab order
**Screen Reader Support**: Proper ARIA labels and semantic HTML
**Color Independence**: No information conveyed through color alone
**Motion Sensitivity**: Respects prefers-reduced-motion settings

## Edge Cases & Problem Scenarios

**Potential Obstacles**:
- One party abandoning session mid-process
- Gaming the steel-manning phase with minimal effort
- AI system failures during critical moments
- Users trying to edit locked statements through refresh/manipulation
- Resolution proposals that are vague or unactionable

**Edge Case Handling**:
- Session persistence across browser refreshes
- Steel-manning approval requires explicit acceptance by target person
- Graceful AI degradation with helpful fallback responses
- Immutable storage with clear timestamps and user attribution
- Resolution validation requiring specific, measurable commitments

**Technical Constraints**: 
- AI API rate limits during high usage
- Session storage limitations
- Real-time synchronization complexity
- Mobile keyboard/screen space limitations

## Implementation Considerations

**Scalability Needs**: Session-based architecture supporting concurrent users, efficient AI prompt management
**Testing Focus**: User flow completion rates, AI response quality, cross-device compatibility
**Critical Questions**: How do we handle users who refuse to proceed? What happens to abandoned sessions? How do we measure actual relationship improvement vs. just completion rates?

## Reflection

**What makes this approach uniquely suited**: The combination of forced structure, technological mediation, and psychological techniques creates accountability that pure human communication often lacks. The AI component adds neutral perspective that friends/family can't provide.

**Assumptions to challenge**: That people want their relationships to improve (vs. wanting to win), that structured processes work during emotional distress, that AI can effectively identify manipulation tactics.

**What would make this solution truly exceptional**: Integration with calendar systems for follow-up reminders, patterns analysis across multiple sessions, option to involve neutral human mediators, measurable outcome tracking over time.

This isn't just a chat app with AI - it's a structured therapeutic intervention disguised as a digital tool. The real innovation is forcing accountability and empathy through technological constraints that humans can't easily circumvent.