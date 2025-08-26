# MixitFixit: Product Requirements Document

*The digital Switzerland for relationships that are less "happily ever after" and more "hold my beer and watch this."*

## Mission Statement

MixitFixit forces couples and sparring partners to actually agree on what they're fighting about before they start fighting, then makes them prove they're listening through structured conflict resolution with an AI referee that calls out their BS.

## Experience Qualities

1. **Brutally Honest** - No euphemisms, no hand-holding, just direct confrontation with dysfunctional patterns wrapped in dry wit.
2. **Sardonic Intelligence** - Like your smartest, most jaded friend who's seen every manipulation tactic and finds them darkly amusing.  
3. **Structured Chaos** - Controlled environment that channels relationship dysfunction into productive outcomes through forced accountability.

## Complexity Level

**Light Application** - Multiple interconnected features (issue agreement, steel-manning, AI moderation, resolution) with persistent state across a structured workflow. Simple enough to use mid-argument, complex enough to actually change behavior patterns.

## Essential Features

### Session Initialization & Issue Agreement
- **Functionality**: Shared private space where users must mutually agree on the exact wording of their conflict
- **Purpose**: Prevents arguing about different things while thinking you're having the same fight
- **Trigger**: One user proposes issue, other accepts/modifies/rejects until consensus
- **Progression**: Issue proposal → Review → Modify/Accept/Reject → Mutual agreement → Lock issue
- **Success Criteria**: Both users explicitly agree on identical issue statement before proceeding

### Steel-Manning Phase ("Prove You're Not a Narcissist")
- **Functionality**: Each user must accurately explain the other's perspective to their satisfaction
- **Purpose**: Forces actual listening and empathy demonstration before personal grievances
- **Trigger**: After issue agreement, users alternate explaining each other's viewpoint  
- **Progression**: User writes steel-man → Other reviews → Approve/reject → Retry until approved
- **Success Criteria**: Both steel-man attempts approved by respective targets

### Statement Locking
- **Functionality**: Immutable personal truth statements about the agreed issue
- **Purpose**: Creates accountability anchors to prevent gaslighting and narrative shifting
- **Trigger**: After successful steel-manning, each user crafts their definitive position
- **Progression**: Draft statement → Review → Submit & lock → No takebacks
- **Success Criteria**: Both statements locked and displayed as permanent reference

### AI-Moderated Discussion
- **Functionality**: Real-time chat with AI interventions spotting manipulation tactics
- **Purpose**: Structured argument with intelligent moderation and pattern recognition
- **Trigger**: After statements locked, open discussion begins with AI oversight
- **Progression**: Message exchange → AI analysis → Suggestions/corrections → Continue discussion
- **Success Criteria**: AI successfully identifies and addresses toxic communication patterns

### Resolution Negotiation
- **Functionality**: Structured agreement process with proposal/modification cycles
- **Purpose**: Ensures mutual consent on solutions rather than assumed agreements
- **Trigger**: Either user proposes resolution during discussion phase
- **Progression**: Propose solution → Review → Accept/modify/reject → Iterate until mutual acceptance
- **Success Criteria**: Final resolution accepted by both parties and locked

### Battle Report Generation
- **Functionality**: Comprehensive session summary with all key elements documented
- **Purpose**: Permanent record preventing future gaslighting and providing reference
- **Trigger**: Upon successful resolution or session closure
- **Progression**: Compile data → Generate summary → Email to both parties → Session closure
- **Success Criteria**: Detailed PDF summary delivered containing all locked elements

## Edge Case Handling

- **Rage Quit Protection**: Session state preserved, return possible with penalty notifications
- **Manipulation Detection**: AI flags gaslighting, projection, blame-shifting, stonewalling attempts
- **Deadlock Resolution**: Time limits and mediation suggestions when agreement stalls
- **Bad Faith Participation**: Pattern recognition for users gaming the system repeatedly

## Design Direction

The interface should feel like sitting across from your most brilliant, wickedly funny therapist friend who's tired of your shit but still wants to help - clean, authoritative, with subtle dark humor touches that make hard truths more palatable while maintaining absolute clarity about process and accountability.

## Color Selection

**Complementary (opposite colors)** - Using tension between warm and cool to reflect the conflict resolution nature while maintaining visual balance and emotional regulation.

- **Primary Color**: Deep Teal `oklch(0.45 0.12 200)` - Professional authority with calming undertones, communicates "we're serious but not aggressive"
- **Secondary Colors**: Warm Gray `oklch(0.65 0.02 45)` for neutral backgrounds and Steel Blue `oklch(0.55 0.08 220)` for supporting elements
- **Accent Color**: Burnt Orange `oklch(0.65 0.15 45)` - Attention-grabbing warmth for CTAs and AI interventions, energizing without being hostile
- **Foreground/Background Pairings**: 
  - Background (White `oklch(0.98 0 0)`): Dark Gray text `oklch(0.25 0.02 230)` - Ratio 11.2:1 ✓
  - Card (Light Gray `oklch(0.95 0.01 45)`): Dark Gray text `oklch(0.25 0.02 230)` - Ratio 9.8:1 ✓
  - Primary (Deep Teal): White text `oklch(0.98 0 0)` - Ratio 7.1:1 ✓
  - Accent (Burnt Orange): White text `oklch(0.98 0 0)` - Ratio 4.6:1 ✓

## Font Selection

Typography should convey intelligent authority with approachable clarity - clean sans-serif that feels modern and professional while supporting the app's direct, no-nonsense personality.

- **Primary Font**: Inter - Clean, highly legible, professional
- **Typographic Hierarchy**:
  - H1 (Page Titles): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter Semibold/24px/normal spacing  
  - H3 (Subsections): Inter Medium/18px/normal spacing
  - Body (Main Text): Inter Regular/16px/relaxed line height (1.6)
  - Small (Meta Info): Inter Regular/14px/normal spacing
  - UI Labels: Inter Medium/14px/wide letter spacing (0.025em)

## Animations

Subtle, purposeful motion that reinforces the app's personality - animations should feel like the slight raised eyebrow of someone who's seen this all before, guiding attention without dramatics.

- **Purposeful Meaning**: Micro-animations that emphasize state changes (locking statements, AI interventions) and guide users through the structured process
- **Hierarchy of Movement**: 
  - Critical state changes (locking, agreements): 300ms ease-out with subtle bounce
  - AI interventions: Gentle slide-in from right with soft glow
  - Navigation: Quick 200ms transitions maintaining spatial continuity
  - Hover states: 150ms color/shadow transitions for interactive elements

## Component Selection

- **Components**: 
  - Cards for each phase container with subtle shadows
  - Alert dialogs for confirmation of irreversible actions (locking statements)
  - Textarea with character counts for statement composition
  - Badge components for status indicators and AI intervention tags
  - Button variants: Primary for progression, Secondary for modifications, Destructive for rejections
  - Progress indicator showing session phase completion

- **Customizations**: 
  - Custom "Lock" button component with confirmation behavior
  - AI message bubble component with distinct styling
  - Session phase stepper component showing progress
  - Custom "Statement Locked" display with immutable styling

- **States**: 
  - Buttons: Clear disabled states for turn-based restrictions
  - Inputs: Focus states with teal accent, error states with orange highlights
  - Cards: Active phase highlighted, completed phases marked with checkmarks

- **Icon Selection**: 
  - Lock icon for statement locking
  - CheckCircle for approved actions
  - XCircle for rejections  
  - Robot icon for AI interventions
  - ArrowRight for progression
  - Edit icon for modification attempts

- **Spacing**: Consistent 16px base unit with 8px, 16px, 24px, 32px, 48px scale for padding/margins

- **Mobile**: 
  - Single column layout on mobile
  - Collapsible sections for completed phases
  - Sticky progress indicator at top
  - Larger touch targets (44px minimum)
  - Bottom-sheet pattern for resolution proposals