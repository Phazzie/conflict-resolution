/**
 * Environment Configuration Validation
 * 
 * Validates required environment variables at build time to prevent
 * runtime failures due to missing configuration.
 */

import { z } from 'zod'

// Define the schema for all environment variables
const envSchema = z.object({
  // Application Settings
  VITE_APP_NAME: z.string().default('MixitFixit'),
  VITE_APP_VERSION: z.string().default('1.0.0'),
  VITE_APP_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),

  // API Configuration
  VITE_API_BASE_URL: z.string().url().optional(),
  VITE_AI_SERVICE_URL: z.string().url().optional(),
  VITE_ANALYTICS_URL: z.string().url().optional(),

  // AI Service Settings
  VITE_GEMINI_API_KEY: z.string().optional(),
  VITE_AI_MODEL: z.string().default('gemini-pro'),
  VITE_AI_MAX_TOKENS: z.coerce.number().default(1000),
  VITE_AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),

  // Rate Limiting
  VITE_RATE_LIMIT_REQUESTS: z.coerce.number().default(100),
  VITE_RATE_LIMIT_WINDOW: z.coerce.number().default(3600),
  VITE_RATE_LIMIT_MAX_RETRIES: z.coerce.number().default(3),

  // Security Settings
  VITE_ENABLE_CSRF_PROTECTION: z.coerce.boolean().default(true),
  VITE_ENABLE_XSS_PROTECTION: z.coerce.boolean().default(true),
  VITE_SECURE_COOKIES: z.coerce.boolean().default(true),
  VITE_CORS_ORIGIN: z.string().optional(),

  // Performance Settings
  VITE_ENABLE_COMPRESSION: z.coerce.boolean().default(true),
  VITE_BUNDLE_SIZE_LIMIT: z.coerce.number().default(2048),
  VITE_LAZY_LOADING: z.coerce.boolean().default(true),

  // Monitoring & Analytics
  VITE_ENABLE_ERROR_TRACKING: z.coerce.boolean().default(false),
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_ANALYTICS_TRACKING_ID: z.string().optional(),

  // Feature Flags
  VITE_ENABLE_MULTIPLAYER: z.coerce.boolean().default(true),
  VITE_ENABLE_ML_FEATURES: z.coerce.boolean().default(true),
  VITE_ENABLE_PREMIUM_FEATURES: z.coerce.boolean().default(false),
  VITE_ENABLE_DEBUG_PANEL: z.coerce.boolean().default(false),

  // Session Configuration
  VITE_SESSION_TIMEOUT: z.coerce.number().default(3600000),
  VITE_MAX_SESSION_HISTORY: z.coerce.number().default(50),
  VITE_AUTO_SAVE_INTERVAL: z.coerce.number().default(30000),

  // Business Model Settings
  VITE_ENABLE_SUBSCRIPTIONS: z.coerce.boolean().default(false),
  VITE_FREE_SESSIONS_LIMIT: z.coerce.number().default(3),
  VITE_PREMIUM_PRICE_MONTHLY: z.coerce.number().default(9.99),

  // Development Settings
  VITE_DEV_API_DELAY: z.coerce.number().default(0),
  VITE_DEV_MOCK_API: z.coerce.boolean().default(false),
  VITE_DEV_SHOW_WARNINGS: z.coerce.boolean().default(false),
})

export type AppConfig = z.infer<typeof envSchema>

/**
 * Validates and parses environment variables
 * Throws an error if required variables are missing or invalid
 */
function validateEnv(): AppConfig {
  try {
    // Parse environment variables from import.meta.env
    const env = {
      ...import.meta.env,
      // Add some computed defaults
      VITE_APP_ENVIRONMENT: import.meta.env.VITE_APP_ENVIRONMENT || 
        (import.meta.env.DEV ? 'development' : 'production'),
    }

    const parsed = envSchema.parse(env)

    // Additional validation based on environment
    if (parsed.VITE_APP_ENVIRONMENT === 'production') {
      if (!parsed.VITE_GEMINI_API_KEY) {
        console.warn('Warning: VITE_GEMINI_API_KEY is not set in production')
      }
      
      if (parsed.VITE_ENABLE_DEBUG_PANEL) {
        console.warn('Warning: Debug panel is enabled in production')
      }
    }

    return parsed
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
        .map(err => err.path.join('.'))
      
      const invalidVars = error.errors
        .filter(err => err.code !== 'invalid_type')
        .map(err => `${err.path.join('.')}: ${err.message}`)

      let errorMessage = 'Environment configuration validation failed:\n'
      
      if (missingVars.length > 0) {
        errorMessage += `\nMissing required variables: ${missingVars.join(', ')}`
      }
      
      if (invalidVars.length > 0) {
        errorMessage += `\nInvalid variables: ${invalidVars.join('; ')}`
      }
      
      errorMessage += '\n\nCheck your .env file and ensure all required variables are set correctly.'
      
      throw new Error(errorMessage)
    }
    throw error
  }
}

// Export validated configuration
export const appConfig = validateEnv()

// Helper functions for common config access
export const isProduction = () => appConfig.VITE_APP_ENVIRONMENT === 'production'
export const isDevelopment = () => appConfig.VITE_APP_ENVIRONMENT === 'development'
export const isFeatureEnabled = (feature: keyof Pick<AppConfig, 
  'VITE_ENABLE_MULTIPLAYER' | 'VITE_ENABLE_ML_FEATURES' | 
  'VITE_ENABLE_PREMIUM_FEATURES' | 'VITE_ENABLE_DEBUG_PANEL'
>) => appConfig[feature]

// Development-only logging
if (isDevelopment() && appConfig.VITE_DEV_SHOW_WARNINGS) {
  console.info('MixitFixit Configuration:', {
    environment: appConfig.VITE_APP_ENVIRONMENT,
    version: appConfig.VITE_APP_VERSION,
    features: {
      multiplayer: appConfig.VITE_ENABLE_MULTIPLAYER,
      ml: appConfig.VITE_ENABLE_ML_FEATURES,
      premium: appConfig.VITE_ENABLE_PREMIUM_FEATURES,
      debug: appConfig.VITE_ENABLE_DEBUG_PANEL,
    }
  })
}