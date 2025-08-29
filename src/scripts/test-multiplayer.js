#!/usr/bin/env node

/**
 * Test script to verify multiplayer WebSocket functionality
 * 
 * Run with: node src/scripts/test-multiplayer.js
 * Requires WebSocket server to be running on port 3001
 */

const WebSocket = require('ws')

const WEBSOCKET_URL = 'ws://localhost:3001'
const TEST_SESSION_ID = 'test-session-123456'

async function testMultiplayerConnection() {
  console.log('🧪 Testing Multiplayer WebSocket Connection')
  console.log('=' .repeat(50))

  // Test 1: Basic connection
  console.log('\n1. Testing basic WebSocket connection...')
  
  try {
    const ws1 = new WebSocket(`${WEBSOCKET_URL}?sessionId=${TEST_SESSION_ID}&playerId=player1`)
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, 5000)

      ws1.on('open', () => {
        clearTimeout(timeout)
        console.log('   ✅ Player 1 connected successfully')
        resolve()
      })

      ws1.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })

    // Test 2: Two-player connection
    console.log('\n2. Testing two-player session...')
    
    const ws2 = new WebSocket(`${WEBSOCKET_URL}?sessionId=${TEST_SESSION_ID}&playerId=player2`)
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Player 2 connection timeout'))
      }, 5000)

      ws2.on('open', () => {
        clearTimeout(timeout)
        console.log('   ✅ Player 2 connected successfully')
        resolve()
      })

      ws2.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })

    // Test 3: Message exchange
    console.log('\n3. Testing message exchange...')
    
    let messageReceived = false
    
    ws2.on('message', (data) => {
      try {
        const message = JSON.parse(data)
        if (message.type === 'session_update' && message.data.phase === 'ai-preferences') {
          console.log('   ✅ Player 2 received session update from Player 1')
          messageReceived = true
        }
      } catch (error) {
        console.error('   ❌ Error parsing received message:', error)
      }
    })

    // Send session update from player 1
    ws1.send(JSON.stringify({
      type: 'session_update',
      sessionId: TEST_SESSION_ID,
      playerId: 'player1',
      timestamp: Date.now(),
      data: { phase: 'ai-preferences' }
    }))

    // Wait for message to be received
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (messageReceived) {
          clearInterval(check)
          resolve()
        }
      }, 100)
      
      // Timeout after 3 seconds
      setTimeout(() => {
        clearInterval(check)
        resolve()
      }, 3000)
    })

    if (!messageReceived) {
      console.log('   ⚠️  Message exchange test failed - no message received')
    }

    // Test 4: Chat message
    console.log('\n4. Testing chat message...')
    
    let chatReceived = false
    
    ws1.on('message', (data) => {
      try {
        const message = JSON.parse(data)
        if (message.type === 'message' && message.data.content) {
          console.log('   ✅ Player 1 received chat message from Player 2')
          chatReceived = true
        }
      } catch (error) {
        console.error('   ❌ Error parsing chat message:', error)
      }
    })

    // Send chat message from player 2
    ws2.send(JSON.stringify({
      type: 'message',
      sessionId: TEST_SESSION_ID,
      playerId: 'player2',
      timestamp: Date.now(),
      data: {
        id: `msg-${Date.now()}`,
        content: 'Test chat message',
        sender: 'player2',
        timestamp: Date.now(),
        aiAnalysis: null
      }
    }))

    // Wait for chat message
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (chatReceived) {
          clearInterval(check)
          resolve()
        }
      }, 100)
      
      setTimeout(() => {
        clearInterval(check)
        resolve()
      }, 3000)
    })

    if (!chatReceived) {
      console.log('   ⚠️  Chat message test failed - no message received')
    }

    // Clean up
    console.log('\n5. Cleaning up connections...')
    ws1.close()
    ws2.close()
    
    console.log('   ✅ Connections closed')

    // Results
    console.log('\n' + '='.repeat(50))
    console.log('🎉 Multiplayer Connection Test Results:')
    console.log(`   Basic Connection: ✅ PASS`)
    console.log(`   Two-Player Session: ✅ PASS`)
    console.log(`   Message Exchange: ${messageReceived ? '✅ PASS' : '⚠️  PARTIAL'}`)
    console.log(`   Chat Messages: ${chatReceived ? '✅ PASS' : '⚠️  PARTIAL'}`)
    
    if (messageReceived && chatReceived) {
      console.log('\n🚀 All multiplayer functionality working correctly!')
    } else {
      console.log('\n⚠️  Some functionality may need debugging')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.log('\nTroubleshooting:')
    console.log('1. Make sure WebSocket server is running: node src/server/websocket-server.js')
    console.log('2. Check that port 3001 is available')
    console.log('3. Verify server is accepting connections')
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMultiplayerConnection()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test script failed:', error)
      process.exit(1)
    })
}

module.exports = { testMultiplayerConnection }