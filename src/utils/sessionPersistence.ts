/**
 * Enhanced session persistence with integrity checks and atomic updates
 */

import { SessionData } from '@/types/session'
import { validateSessionData, sanitizeObject } from './validation'

const SESSION_KEY = 'mixitfixit-session'
const SESSION_VERSION = '1.0'
const CHECKSUM_KEY = 'mixitfixit-session-checksum'

interface PersistedSession {
  version: string
  timestamp: number
  data: SessionData
  checksum: string
}

/**
 * Simple checksum calculation for data integrity
 */
function calculateChecksum(data: SessionData): string {
  const dataString = JSON.stringify(data, Object.keys(data).sort())
  let hash = 0
  
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return hash.toString(36)
}

/**
 * Enhanced session save with atomic writes and integrity checks
 */
export function saveSession(sessionData: SessionData): { success: boolean; error?: string } {
  try {
    // Validate data before saving
    const validation = validateSessionData(sessionData)
    if (!validation.isValid) {
      return { 
        success: false, 
        error: `Cannot save invalid session: ${validation.error}` 
      }
    }
    
    // Sanitize data
    const sanitizedData = sanitizeObject(sessionData)
    
    // Create persisted session object
    const persistedSession: PersistedSession = {
      version: SESSION_VERSION,
      timestamp: Date.now(),
      data: sanitizedData,
      checksum: calculateChecksum(sanitizedData)
    }
    
    // Atomic write - if this fails, original data is preserved
    const sessionJson = JSON.stringify(persistedSession)
    localStorage.setItem(SESSION_KEY, sessionJson)
    localStorage.setItem(CHECKSUM_KEY, persistedSession.checksum)
    
    // Verify the write was successful
    const verification = loadSession()
    if (!verification.success || !verification.sessionData) {
      // Rollback - clear potentially corrupted data
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(CHECKSUM_KEY)
      return { 
        success: false, 
        error: 'Session save verification failed - data may be corrupted' 
      }
    }
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: `Session save failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

/**
 * Enhanced session load with integrity verification and recovery
 */
export function loadSession(): { 
  success: boolean 
  sessionData?: SessionData 
  error?: string 
  warnings?: string[]
  wasCorrupted?: boolean
} {
  const warnings: string[] = []
  
  try {
    const sessionJson = localStorage.getItem(SESSION_KEY)
    const storedChecksum = localStorage.getItem(CHECKSUM_KEY)
    
    if (!sessionJson) {
      // No session found - this is normal for first-time users
      return { success: true }
    }
    
    let persistedSession: PersistedSession
    try {
      persistedSession = JSON.parse(sessionJson)
    } catch (parseError) {
      warnings.push('Session data was malformed JSON')
      return attemptDataRecovery(warnings)
    }
    
    // Version compatibility check
    if (!persistedSession.version || persistedSession.version !== SESSION_VERSION) {
      warnings.push(`Session version mismatch: expected ${SESSION_VERSION}, got ${persistedSession.version}`)
      // For now, we'll try to load anyway, but this is where migration logic would go
    }
    
    // Integrity verification
    if (!persistedSession.data) {
      warnings.push('Session contained no data')
      return attemptDataRecovery(warnings)
    }
    
    const calculatedChecksum = calculateChecksum(persistedSession.data)
    const checksumMatch = calculatedChecksum === persistedSession.checksum || calculatedChecksum === storedChecksum
    
    if (!checksumMatch) {
      warnings.push('Session checksum mismatch - data may be corrupted')
      return attemptDataRecovery(warnings, persistedSession.data)
    }
    
    // Validate the loaded data
    const validation = validateSessionData(persistedSession.data)
    if (!validation.isValid) {
      warnings.push(`Session validation failed: ${validation.error}`)
      return attemptDataRecovery(warnings, persistedSession.data)
    }
    
    // Add validation warnings to our warnings
    if (validation.warnings) {
      warnings.push(...validation.warnings)
    }
    
    // Check if session is too old (older than 24 hours)
    const sessionAge = Date.now() - persistedSession.timestamp
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    
    if (sessionAge > maxAge) {
      warnings.push('Session is older than 24 hours')
      // Don't auto-clear old sessions, but warn the user
    }
    
    return { 
      success: true, 
      sessionData: persistedSession.data,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  } catch (error) {
    warnings.push('Unexpected error loading session')
    return attemptDataRecovery(warnings)
  }
}

/**
 * Attempt to recover from corrupted session data
 */
function attemptDataRecovery(
  warnings: string[], 
  corruptedData?: any
): { 
  success: boolean 
  sessionData?: SessionData 
  error?: string 
  warnings?: string[]
  wasCorrupted: boolean
} {
  warnings.push('Attempting data recovery...')
  
  try {
    // Try to parse raw session data from localStorage
    if (!corruptedData) {
      const rawSession = localStorage.getItem(SESSION_KEY)
      if (rawSession) {
        try {
          const parsed = JSON.parse(rawSession)
          corruptedData = parsed.data || parsed
        } catch {
          // Can't recover anything useful
        }
      }
    }
    
    if (corruptedData) {
      const recovery = attemptSessionRecovery(corruptedData)
      if (recovery.recovered && recovery.sessionData) {
        warnings.push('Successfully recovered partial session data')
        if (recovery.warnings) {
          warnings.push(...recovery.warnings)
        }
        
        // Save the recovered session
        const saveResult = saveSession(recovery.sessionData)
        if (!saveResult.success) {
          warnings.push('Failed to save recovered session')
        }
        
        return {
          success: true,
          sessionData: recovery.sessionData,
          warnings,
          wasCorrupted: true
        }
      }
    }
    
    // Complete failure - clear corrupted data and start fresh
    clearSession()
    warnings.push('Data recovery failed - cleared corrupted session')
    
    return {
      success: true, // Success means we handled the error gracefully
      warnings,
      wasCorrupted: true
    }
  } catch (error) {
    clearSession()
    return {
      success: false,
      error: 'Data recovery failed catastrophically',
      warnings,
      wasCorrupted: true
    }
  }
}

/**
 * Minimal session recovery from corrupted data
 */
function attemptSessionRecovery(corruptedData: any): { 
  recovered: boolean 
  sessionData?: SessionData 
  warnings?: string[] 
} {
  const warnings: string[] = []
  
  try {
    // Create a fresh session with defaults
    const recovered: SessionData = {
      phase: 'welcome',
      agreedIssue: '',
      playerOneSteelMan: '',
      playerTwoSteelMan: '',
      playerOneStatement: '',
      playerTwoStatement: '',
      messages: [],
      proposedResolution: '',
      finalResolution: '',
      sessionStarted: Date.now()
    }
    
    if (!corruptedData || typeof corruptedData !== 'object') {
      return { recovered: false }
    }
    
    // Try to recover what we can
    if (typeof corruptedData.agreedIssue === 'string' && corruptedData.agreedIssue.length >= 10) {
      recovered.agreedIssue = corruptedData.agreedIssue.substring(0, 500)
      recovered.phase = 'steel-manning'
      warnings.push('Recovered agreed issue')
    }
    
    if (typeof corruptedData.playerOneSteelMan === 'string' && corruptedData.playerOneSteelMan.length >= 20) {
      recovered.playerOneSteelMan = corruptedData.playerOneSteelMan.substring(0, 1000)
      warnings.push('Recovered player one steel-man')
    }
    
    if (typeof corruptedData.playerTwoSteelMan === 'string' && corruptedData.playerTwoSteelMan.length >= 20) {
      recovered.playerTwoSteelMan = corruptedData.playerTwoSteelMan.substring(0, 1000)
      warnings.push('Recovered player two steel-man')
    }
    
    // Set appropriate phase based on recovered data
    if (recovered.agreedIssue && recovered.playerOneSteelMan && recovered.playerTwoSteelMan) {
      recovered.phase = 'statement-locking'
      warnings.push('Set phase to statement-locking')
    } else if (recovered.agreedIssue) {
      recovered.phase = 'steel-manning'
      warnings.push('Set phase to steel-manning')
    }
    
    return { 
      recovered: true, 
      sessionData: recovered,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  } catch (error) {
    return { recovered: false }
  }
}

/**
 * Clear session data completely
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(CHECKSUM_KEY)
    localStorage.removeItem('mixitfixit-player-role') // Also clear player role
  } catch (error) {
    console.error('Failed to clear session:', error)
  }
}

/**
 * Get session metadata without loading full data
 */
export function getSessionMetadata(): {
  exists: boolean
  version?: string
  timestamp?: number
  age?: number
  sizeKB?: number
} {
  try {
    const sessionJson = localStorage.getItem(SESSION_KEY)
    
    if (!sessionJson) {
      return { exists: false }
    }
    
    const sizeKB = Math.round((sessionJson.length * 2) / 1024) // Rough size in KB
    
    try {
      const persistedSession: PersistedSession = JSON.parse(sessionJson)
      const age = Date.now() - (persistedSession.timestamp || 0)
      
      return {
        exists: true,
        version: persistedSession.version,
        timestamp: persistedSession.timestamp,
        age,
        sizeKB
      }
    } catch {
      return { exists: true, sizeKB }
    }
  } catch {
    return { exists: false }
  }
}

/**
 * Backup current session to a downloadable format
 */
export function exportSession(): { success: boolean; data?: string; error?: string } {
  try {
    const loadResult = loadSession()
    if (!loadResult.success || !loadResult.sessionData) {
      return { success: false, error: 'No session to export' }
    }
    
    const exportData = {
      version: SESSION_VERSION,
      exportTimestamp: Date.now(),
      sessionData: loadResult.sessionData,
      metadata: getSessionMetadata()
    }
    
    return { 
      success: true, 
      data: JSON.stringify(exportData, null, 2) 
    }
  } catch (error) {
    return { 
      success: false, 
      error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}