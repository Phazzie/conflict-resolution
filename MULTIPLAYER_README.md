# MixitFixit - Real-Time Multiplayer Implementation

## WebSocket Integration

This implementation adds real-time multiplayer functionality to MixitFixit, allowing two participants to work through conflict resolution together with live synchronization.

## Architecture

### Components

1. **WebSocketService** (`src/services/websocketService.ts`)
   - Manages WebSocket connections
   - Handles message queuing and reconnection
   - Provides event-driven API for UI integration

2. **useMultiplayerSession** (`src/hooks/useMultiplayerSession.ts`)
   - React hook for multiplayer session management
   - Integrates with existing session state
   - Handles conflict resolution for concurrent updates

3. **useUnifiedSession** (updated)
   - Enhanced to support multiplayer functionality
   - Manages both local and remote session updates
   - Provides clean API for multiplayer operations

4. **UI Components**
   - **MultiplayerConnection**: Session creation and joining UI
   - **WelcomeScreenMultiplayer**: Enhanced welcome screen with multiplayer tab
   - **TypingIndicator**: Real-time typing status display
   - **DiscussionPhase** (enhanced): Live chat with multiplayer support

### WebSocket Server

A Node.js WebSocket server (`src/server/websocket-server.js`) handles:
- Session management and participant tracking
- Message broadcasting between participants
- Connection state monitoring
- Session cleanup and recovery

## Usage

### Development Setup

1. **Start the WebSocket server:**
```bash
npm run websocket-server
```

2. **Start the development server:**
```bash
npm run dev
```

3. **Or run both together:**
```bash
npm run dev:full
```

### Creating a Multiplayer Session

1. Navigate to the "Real-Time Multiplayer" tab on the welcome screen
2. Click "Create & Share" to generate a session ID
3. Share the session ID with your partner
4. Once both participants are connected, start the session

### Joining a Session

1. Navigate to the "Real-Time Multiplayer" tab
2. Enter the session ID provided by your partner
3. Click the join button to connect
4. Wait for both participants to be ready

## Features

### Real-Time Synchronization
- **Session State**: All phase changes, issue agreements, and statements sync instantly
- **Chat Messages**: Discussion phase messages appear in real-time for both participants
- **Typing Indicators**: See when your partner is typing
- **Connection Status**: Live connection monitoring with automatic reconnection

### Conflict Resolution
- **Smart Merging**: Prevents data loss when both participants make changes simultaneously
- **Message Ordering**: Maintains chronological order of chat messages
- **State Validation**: Ensures session integrity across network interruptions

### User Experience
- **Connection Feedback**: Clear indicators of connection status and errors
- **Offline Graceful Degradation**: Works normally in single-player mode
- **Mobile Support**: Touch-friendly interface with proper scaling

## Technical Details

### Message Types

The WebSocket protocol uses typed messages:

```typescript
interface WebSocketMessage {
  type: 'session_update' | 'message' | 'typing' | 'participant_update' | 'phase_change' | 'connection' | 'error'
  sessionId: string
  playerId: PlayerRole
  timestamp: number
  data?: any
}
```

### Session State Management

Session updates flow through this pattern:
1. Local change triggers `updateSession()`
2. Change is applied locally and validated
3. If multiplayer is enabled, change is broadcast via WebSocket
4. Remote clients receive and merge the update
5. Conflicts are resolved using timestamp-based precedence

### Connection Management

The WebSocket service includes:
- **Automatic Reconnection**: Up to 5 attempts with exponential backoff
- **Heartbeat/Ping**: 30-second intervals to detect connection loss
- **Message Queuing**: Messages are queued during disconnection and sent on reconnect
- **Circuit Breaker**: Prevents cascading failures

## Production Considerations

### Server Deployment

The included WebSocket server is for development only. For production:

1. **Use a proper WebSocket service** like:
   - AWS API Gateway WebSocket
   - Socket.io with Redis adapter
   - Firebase Realtime Database
   - Supabase Realtime

2. **Add authentication** to prevent unauthorized access

3. **Implement rate limiting** to prevent abuse

4. **Add session persistence** to survive server restarts

### Security

- **Session ID validation** prevents unauthorized joining
- **No sensitive data** is transmitted (all data is conflict resolution content)
- **Client-side validation** prevents malformed messages
- **Connection timeouts** prevent resource exhaustion

### Scalability

Current implementation supports:
- **Small sessions**: 2 participants maximum
- **Session cleanup**: Automatic cleanup after 24 hours
- **Memory usage**: In-memory session storage (production should use Redis/database)

## Error Handling

The system gracefully handles:
- **Network interruptions**: Automatic reconnection with state recovery
- **Server restarts**: Session recreation on reconnect
- **Malformed messages**: Validation and error responses
- **Connection timeouts**: Clear user feedback and retry options
- **Concurrent modifications**: Smart conflict resolution

## Monitoring

Development logging includes:
- Connection events (connect/disconnect)
- Message broadcasting
- Error conditions
- Session lifecycle events

Production should add:
- Connection metrics (active sessions, message volume)
- Error rates and types
- Performance monitoring (latency, throughput)
- User engagement analytics

## Future Enhancements

Potential improvements:
1. **Voice chat integration**
2. **Screen sharing for document review**
3. **Session recording and playback**
4. **Advanced conflict detection (concurrent edits)**
5. **Mobile push notifications**
6. **Session analytics and insights**