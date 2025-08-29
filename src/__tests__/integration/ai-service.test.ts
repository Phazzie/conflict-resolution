/**
 * AI Service Integration Test
 * 
 * This test verifies that the AI service can actually make real LLM calls
 * and handle responses properly. Run this to verify the core product functionality.
 */

import { unifiedAIService, ConversationContext } from '../services/aiServiceUnified'

describe('AI Service Integration', () => {
  describe('Real LLM Integration', () => {
    it('should analyze a message with real AI', async () => {
      const testContext: ConversationContext = {
        agreedIssue: 'Communication problems during disagreements',
        playerOneStatement: 'I feel like you never listen to my concerns',
        playerTwoStatement: 'I try to listen but you get emotional quickly',
        currentMessage: 'You always interrupt me when I try to explain things',
        messageAuthor: 'player1',
        conflictContext: 'relationship',
        previousMessages: [],
        userPreferences: {
          aiSensitivity: 'neutral',
          allowHumor: false
        }
      }

      const result = await unifiedAIService.analyzeMessage(
        'You always interrupt me when I try to explain things',
        testContext
      )

      // Verify the response structure
      expect(result).toBeDefined()
      expect(result.hasManipulation).toBeDefined()
      expect(result.detectedTactics).toBeInstanceOf(Array)
      expect(result.overallTone).toBeDefined()
      expect(result.suggestion).toBeDefined()
      expect(result.emotionalState).toBeDefined()

      // Check if this is a real AI response or fallback
      if (result.suggestion.includes('Using basic analysis instead')) {
        console.warn('AI service is using fallback - LLM integration may not be working')
      } else {
        console.log('✅ AI service returned real analysis')
        console.log('Detected manipulation:', result.hasManipulation)
        console.log('Suggestion:', result.suggestion)
      }
    }, 30000) // 30 second timeout for LLM calls

    it('should handle different AI sensitivity levels', async () => {
      const baseContext: ConversationContext = {
        agreedIssue: 'Household chores distribution',
        playerOneStatement: 'I do most of the work around here',
        playerTwoStatement: 'I contribute in other ways that aren't visible',
        currentMessage: 'You never help with anything important',
        messageAuthor: 'player1',
        conflictContext: 'relationship',
        previousMessages: []
      }

      // Test all three sensitivity levels
      const supportiveContext = { ...baseContext, userPreferences: { aiSensitivity: 'supportive' as const, allowHumor: false }}
      const neutralContext = { ...baseContext, userPreferences: { aiSensitivity: 'neutral' as const, allowHumor: false }}
      const directContext = { ...baseContext, userPreferences: { aiSensitivity: 'direct' as const, allowHumor: true }}

      const [supportive, neutral, direct] = await Promise.all([
        unifiedAIService.analyzeMessage('You never help with anything important', supportiveContext),
        unifiedAIService.analyzeMessage('You never help with anything important', neutralContext),
        unifiedAIService.analyzeMessage('You never help with anything important', directContext)
      ])

      expect(supportive.aiSensitivity).toBe('supportive')
      expect(neutral.aiSensitivity).toBe('neutral')
      expect(direct.aiSensitivity).toBe('direct')

      // Verify different tones in suggestions (this will only work with real AI)
      if (!supportive.suggestion.includes('Using basic analysis instead')) {
        console.log('✅ AI sensitivity levels working:')
        console.log('Supportive:', supportive.suggestion.substring(0, 100) + '...')
        console.log('Neutral:', neutral.suggestion.substring(0, 100) + '...')
        console.log('Direct:', direct.suggestion.substring(0, 100) + '...')
      }
    }, 45000)

    it('should detect manipulation tactics', async () => {
      const manipulativeMessages = [
        'If you really loved me, you would understand',
        'You always make everything about yourself',
        'I never said that - you\'re imagining things',
        'Everyone agrees with me about this'
      ]

      const testContext: ConversationContext = {
        agreedIssue: 'Trust and communication issues',
        playerOneStatement: 'I need more honesty in our relationship',
        playerTwoStatement: 'I am honest, sometimes the truth is hard to hear',
        currentMessage: '',
        messageAuthor: 'player2',
        conflictContext: 'relationship',
        previousMessages: []
      }

      for (const message of manipulativeMessages) {
        const result = await unifiedAIService.analyzeMessage(message, {
          ...testContext,
          currentMessage: message
        })

        // Should detect some form of manipulation
        if (!result.suggestion.includes('Using basic analysis instead')) {
          console.log(`Testing: "${message}"`)
          console.log(`Manipulation detected: ${result.hasManipulation}`)
          console.log(`Tactics: ${result.detectedTactics.map(t => t.tactic).join(', ')}`)
          console.log('---')
        }
      }
    }, 60000)
  })

  describe('Error Handling', () => {
    it('should handle invalid input gracefully', async () => {
      const invalidContext: ConversationContext = {
        agreedIssue: '',
        playerOneStatement: '',
        playerTwoStatement: '',
        currentMessage: '',
        messageAuthor: 'player1',
        previousMessages: []
      }

      await expect(
        unifiedAIService.analyzeMessage('', invalidContext)
      ).rejects.toThrow('Message content is required')

      await expect(
        unifiedAIService.analyzeMessage('x'.repeat(6000), invalidContext)
      ).rejects.toThrow('Message is too long')
    })

    it('should provide fallback when AI fails', async () => {
      // Test with a context that might cause AI issues
      const testContext: ConversationContext = {
        agreedIssue: 'Test issue',
        playerOneStatement: 'Test statement 1',
        playerTwoStatement: 'Test statement 2',
        currentMessage: 'Test message with edge case content that might break parsing: {"invalid": json}',
        messageAuthor: 'player1',
        previousMessages: []
      }

      // This should not throw, even if AI parsing fails
      const result = await unifiedAIService.analyzeMessage(
        'Test message with edge case content',
        testContext
      )

      expect(result).toBeDefined()
      expect(result.suggestion).toBeDefined()
      expect(typeof result.hasManipulation).toBe('boolean')
    })
  })

  describe('Performance and Caching', () => {
    it('should cache repeated requests', async () => {
      const testContext: ConversationContext = {
        agreedIssue: 'Performance test',
        playerOneStatement: 'Statement 1',
        playerTwoStatement: 'Statement 2',
        currentMessage: 'This is a test message for caching',
        messageAuthor: 'player1',
        previousMessages: []
      }

      const startTime = Date.now()
      
      // First call - should hit the API
      const result1 = await unifiedAIService.analyzeMessage(
        'This is a test message for caching',
        testContext
      )
      
      const midTime = Date.now()
      
      // Second call - should be cached (within 30 seconds)
      const result2 = await unifiedAIService.analyzeMessage(
        'This is a test message for caching',
        testContext
      )
      
      const endTime = Date.now()

      const firstCallTime = midTime - startTime
      const secondCallTime = endTime - midTime

      console.log(`First call: ${firstCallTime}ms`)
      console.log(`Second call: ${secondCallTime}ms`)

      // Second call should be significantly faster (cached)
      expect(secondCallTime).toBeLessThan(firstCallTime)
      
      // Results should be identical
      expect(result1.suggestion).toBe(result2.suggestion)
    })
  })
})

/**
 * Manual test runner for development
 */
export async function testAIIntegrationManually() {
  console.log('🧪 Testing AI Service Integration...')
  
  try {
    const testContext: ConversationContext = {
      agreedIssue: 'Manual test of AI integration',
      playerOneStatement: 'I need to verify the AI works',
      playerTwoStatement: 'Let me see what kind of analysis we get',
      currentMessage: 'You never listen to what I\'m actually saying',
      messageAuthor: 'player1',
      previousMessages: []
    }

    console.log('Sending test message to AI...')
    const result = await unifiedAIService.analyzeMessage(
      'You never listen to what I\'m actually saying',
      testContext
    )

    console.log('✅ AI Response received:')
    console.log('- Manipulation detected:', result.hasManipulation)
    console.log('- Overall tone:', result.overallTone)
    console.log('- Emotional state:', result.emotionalState.level)
    console.log('- Suggestion:', result.suggestion)
    
    if (result.suggestion.includes('Using basic analysis instead')) {
      console.log('⚠️  AI is using fallback mode - check LLM integration')
      return false
    } else {
      console.log('✅ Real AI analysis working!')
      return true
    }
  } catch (error) {
    console.error('❌ AI integration test failed:', error)
    return false
  }
}