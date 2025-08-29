# Technical Debt Checklist

No bullshit, straight to the point. We've got 111 source files and 15 tests. That's 13.5% test coverage by file count alone - pathetic. Here's what needs fixing, in order of importance.

## Testing Coverage & Quality (CRITICAL)

### Missing Test Coverage
- [ ] **IssueAgreement.tsx** - Has test but needs error boundary coverage
- [x] **SteelManningPhase.tsx** - Added comprehensive test coverage (11k+ lines)
- [x] **StatementLocking.tsx** - Added comprehensive test coverage (15k+ lines)
- [x] **DiscussionPhase.tsx** - Added comprehensive test coverage (19k+ lines)
- [x] **ResolutionPhase.tsx** - Added comprehensive test coverage (18k+ lines)
- [x] **SessionSummary.tsx** - Added comprehensive test coverage (17k+ lines)
- [ ] **AnalyticsDashboard.tsx** - Zero test coverage for dashboard components
- [ ] **SessionHistoryDashboard.tsx** - Zero test coverage
- [ ] **CouplesDashboard.tsx** - Zero test coverage  
- [ ] **PatternRecognitionDashboard.tsx** - Zero test coverage
- [ ] **MLInsightsDashboard.tsx** - Zero test coverage
- [ ] **ConflictContextSelector.tsx** - Zero test coverage
- [ ] **SessionSharing.tsx** - Zero test coverage for multiplayer features
- [ ] **PhaseErrorBoundary.tsx** - Zero test coverage for error recovery
- [ ] **AIPersonalityTesting.tsx** - Zero test coverage for A/B testing
- [ ] **AIPreferencesSettings.tsx** - Zero test coverage

### Service Layer Tests (CRITICAL)
- [x] **realTimeSession.ts** - Added comprehensive test coverage with mocked localStorage
- [ ] **sessionHistory.ts** - Missing edge case tests
- [x] **couples.ts** - Added comprehensive test coverage (14k+ lines)
- [ ] **patternRecognition.ts** - Zero test coverage
- [ ] **businessModel.ts** - Zero test coverage
- [ ] **conflictContexts.ts** - Zero test coverage

### Hook Tests
- [ ] **useAccessibility.ts** - Zero test coverage for accessibility hooks
- [ ] **useSessionState.ts** - Zero test coverage
- [ ] **useErrorRecovery.ts** - Zero test coverage

### Utility Tests  
- [ ] **patternDetection.ts** - Zero test coverage
- [ ] **aiPersonality.ts** - Zero test coverage
- [ ] **feedbackAnalysis.ts** - Zero test coverage

## Code Quality Issues (HIGH PRIORITY)

### Type Safety & Validation
- [ ] **SessionData type** - Missing strict validation for all phase transitions
- [ ] **AI Response types** - No type safety for Gemini API responses
- [ ] **Message types** - Missing validation for discussion messages
- [ ] **Resolution types** - No validation for resolution data structure
- [ ] **Analytics types** - Missing type definitions for analytics data

### Error Handling
- [ ] **App.tsx** - Error boundaries don't handle async errors properly
- [ ] **API calls** - Missing timeout handling for AI service calls
- [ ] **LocalStorage failures** - No fallback when storage quota exceeded
- [ ] **Network failures** - No retry logic for API calls
- [ ] **Validation errors** - Inconsistent error message formatting

### Performance Issues
- [ ] **App.tsx** - Lazy loading components but not code-splitting properly
- [ ] **useKV hook** - No debouncing for rapid state updates
- [ ] **AI service calls** - No request deduplication
- [ ] **Dashboard components** - Heavy re-renders on every state change
- [ ] **Message list** - No virtualization for large discussion threads

## Architecture & Structure (MEDIUM PRIORITY)

### Component Architecture
- [x] **App.tsx** - Split into logical components (WelcomeScreen, SessionHeader, PhaseRenderer)
- [ ] **Phase components** - Inconsistent prop patterns and state management
- [ ] **Dashboard components** - Duplicate analytics logic across dashboards
- [ ] **UI components** - Some components don't follow shadcn patterns

### State Management
- [ ] **Session state** - No centralized state validation
- [ ] **Player role** - Stored in localStorage instead of session context
- [ ] **Multiplayer state** - Fake implementation with localStorage
- [ ] **Loading states** - Inconsistent loading state management

### Service Layer
- [ ] **AI services** - Multiple AI service files with overlapping functionality
- [ ] **Analytics** - Duplicate analytics generation across services
- [ ] **Storage** - Mixed localStorage/useKV usage patterns

## Infrastructure & Build (LOW PRIORITY)

### Build Configuration
- [ ] **TypeScript config** - Missing strict mode configurations
- [ ] **ESLint rules** - Missing accessibility and testing rules
- [ ] **Vite config** - No bundle analysis or optimization

### Dependencies
- [ ] **Unused dependencies** - Several packages installed but not used
- [ ] **Duplicate functionality** - Multiple icon libraries, date libraries
- [ ] **Version mismatches** - Some peer dependency warnings

## Security Issues (MEDIUM PRIORITY)

### Data Handling
- [ ] **AI prompts** - No sanitization of user input before sending to AI
- [ ] **Local storage** - Sensitive session data stored unencrypted
- [ ] **Error messages** - Potentially exposing internal application state

### Input Validation
- [ ] **XSS protection** - Missing input sanitization in message components
- [ ] **CSRF protection** - No protection for state-changing operations
- [ ] **Content Security Policy** - No CSP headers defined

## Execution Order (Start Here)

1. **Fix critical test coverage** - Get to 85% coverage minimum
2. **Split App.tsx** - Break down the 827-line monster
3. **Implement proper error handling** - Add timeouts, retries, fallbacks
4. **Consolidate AI services** - Merge overlapping service files
5. **Add type safety** - Proper validation for all data structures
6. **Performance optimization** - Debouncing, virtualization, code splitting
7. **Security hardening** - Input sanitization and data protection

## Success Criteria

- **Test Coverage**: 85% minimum across all modules
- **TypeScript**: Strict mode with zero type errors
- **Performance**: No component taking >100ms to render
- **Bundle Size**: <2MB total bundle size
- **Security**: Zero high/critical vulnerability findings
- **Code Quality**: ESLint score 9.5+/10

This isn't a wish list. This is what's broken and needs fixing before this thing goes live.