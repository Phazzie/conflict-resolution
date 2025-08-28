import { describe, it, expect, beforeEach, vi } from 'vitest'
import { secureStorage } from '../secureStorage'

// Mock CryptoJS
vi.mock('crypto-js', () => ({
  AES: {
    encrypt: vi.fn().mockImplementation((data, key) => ({
      toString: () => `encrypted_${data}_${key}`
    })),
    decrypt: vi.fn().mockImplementation((encryptedData, key) => ({
      toString: vi.fn().mockImplementation(() => {
        // Extract original data from mock encryption
        const match = encryptedData.match(/encrypted_(.+?)_/)
        return match ? match[1] : encryptedData
      })
    }))
  },
  enc: {
    Utf8: 'utf8'
  }
}))

describe('SecureStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('stores and retrieves data securely', () => {
    const testData = { test: 'data', number: 123 }
    
    secureStorage.setItem('test-key', testData)
    const retrieved = secureStorage.getItem('test-key')
    
    expect(retrieved).toEqual(testData)
  })

  it('returns null for non-existent keys', () => {
    const result = secureStorage.getItem('non-existent')
    expect(result).toBeNull()
  })

  it('migrates unencrypted data to encrypted storage', () => {
    const testData = { legacy: 'data' }
    
    // Simulate old unencrypted data
    localStorage.setItem('legacy-key', JSON.stringify(testData))
    
    const retrieved = secureStorage.getItem('legacy-key')
    
    expect(retrieved).toEqual(testData)
    // Original unencrypted data should be removed
    expect(localStorage.getItem('legacy-key')).toBeNull()
    // Encrypted version should exist
    expect(localStorage.getItem('secure_legacy-key')).toBeTruthy()
  })

  it('handles encryption errors gracefully', () => {
    const CryptoJS = vi.mocked(await import('crypto-js'))
    CryptoJS.AES.encrypt.mockImplementationOnce(() => {
      throw new Error('Encryption failed')
    })
    
    const testData = { fallback: 'test' }
    
    // Should fallback to unencrypted storage
    secureStorage.setItem('fallback-key', testData)
    
    expect(localStorage.getItem('fallback-key')).toBeTruthy()
  })

  it('handles decryption errors gracefully', () => {
    const CryptoJS = vi.mocked(await import('crypto-js'))
    CryptoJS.AES.decrypt.mockImplementationOnce(() => {
      throw new Error('Decryption failed')
    })
    
    localStorage.setItem('secure_corrupt-key', 'corrupted-encrypted-data')
    
    const result = secureStorage.getItem('corrupt-key')
    expect(result).toBeNull()
  })

  it('removes items correctly', () => {
    secureStorage.setItem('remove-test', { data: 'test' })
    expect(secureStorage.getItem('remove-test')).toBeTruthy()
    
    secureStorage.removeItem('remove-test')
    expect(secureStorage.getItem('remove-test')).toBeNull()
  })

  it('clears all secure storage', () => {
    secureStorage.setItem('test1', { data: 1 })
    secureStorage.setItem('test2', { data: 2 })
    localStorage.setItem('other-data', 'should-remain')
    
    secureStorage.clear()
    
    expect(secureStorage.getItem('test1')).toBeNull()
    expect(secureStorage.getItem('test2')).toBeNull()
    expect(localStorage.getItem('other-data')).toBe('should-remain')
  })

  it('lists encrypted keys correctly', () => {
    secureStorage.setItem('key1', { data: 1 })
    secureStorage.setItem('key2', { data: 2 })
    localStorage.setItem('unencrypted', 'data')
    
    const keys = secureStorage.keys()
    
    expect(keys).toContain('key1')
    expect(keys).toContain('key2')
    expect(keys).not.toContain('unencrypted')
  })
})