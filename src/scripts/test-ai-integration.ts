/**
 * AI Integration Test Runner
 * 
 * Run this to verify the AI service works with real LLM calls.
 * This helps identify if the core product functionality is working.
 */

import { testAIIntegrationManually } from '../__tests__/integration/ai-service.test'

async function main() {
  console.log('🚀 MixitFixit AI Integration Test')
  console.log('================================')
  
  const isWorking = await testAIIntegrationManually()
  
  if (isWorking) {
    console.log('\n✅ SUCCESS: AI integration is working properly')
    console.log('   The core product functionality is ready for deployment')
    process.exit(0)
  } else {
    console.log('\n❌ FAILURE: AI integration has issues')
    console.log('   Check LLM API configuration and network connectivity')
    process.exit(1)
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled error:', error)
  process.exit(1)
})

main().catch(error => {
  console.error('\n💥 Test runner failed:', error)
  process.exit(1)
})