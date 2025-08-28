import CryptoJS from 'crypto-js'

// Simple encryption key derivation (in production, this would be more sophisticated)
const ENCRYPTION_KEY = 'mixitfixit-secure-key-v1'

/**
 * Secure storage wrapper around localStorage with encryption
 */
export class SecureStorage {
  private static instance: SecureStorage
  
  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage()
    }
    return SecureStorage.instance
  }

  /**
   * Encrypt and store data
   */
  setItem(key: string, value: any): void {
    try {
      const serialized = JSON.stringify(value)
      const encrypted = CryptoJS.AES.encrypt(serialized, ENCRYPTION_KEY).toString()
      localStorage.setItem(`secure_${key}`, encrypted)
    } catch (error) {
      console.error('Failed to encrypt and store data:', error)
      // Fallback to unencrypted storage for critical data
      localStorage.setItem(key, JSON.stringify(value))
    }
  }

  /**
   * Decrypt and retrieve data
   */
  getItem<T = any>(key: string): T | null {
    try {
      // Try secure storage first
      const encryptedData = localStorage.getItem(`secure_${key}`)
      if (encryptedData) {
        const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8)
        return JSON.parse(decrypted)
      }

      // Fallback to check unencrypted storage (for migration)
      const unencryptedData = localStorage.getItem(key)
      if (unencryptedData) {
        const parsed = JSON.parse(unencryptedData)
        // Migrate to encrypted storage
        this.setItem(key, parsed)
        localStorage.removeItem(key)
        return parsed
      }

      return null
    } catch (error) {
      console.error('Failed to decrypt data:', error)
      return null
    }
  }

  /**
   * Remove encrypted data
   */
  removeItem(key: string): void {
    localStorage.removeItem(`secure_${key}`)
    localStorage.removeItem(key) // Also remove any unencrypted version
  }

  /**
   * Clear all secure storage
   */
  clear(): void {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('secure_') || key.startsWith('mixitfixit-')) {
        localStorage.removeItem(key)
      }
    })
  }

  /**
   * Get all encrypted keys
   */
  keys(): string[] {
    const keys = Object.keys(localStorage)
    return keys
      .filter(key => key.startsWith('secure_'))
      .map(key => key.replace('secure_', ''))
  }
}

// Export singleton instance
export const secureStorage = SecureStorage.getInstance()