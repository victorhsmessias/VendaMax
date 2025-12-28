/**
 * Centralized Application Configuration
 *
 * This file contains all configuration values used throughout the application.
 * It validates required environment variables at startup to fail fast if
 * configuration is missing.
 */

// ============================================================================
// Environment Variables Validation
// ============================================================================

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
] as const;

// Validate all required environment variables are present
for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    throw new Error(
      `Missing required environment variable: ${envVar}\n` +
      `Please check your .env file and ensure all variables from .env.example are set.`
    );
  }
}

// ============================================================================
// Configuration Object
// ============================================================================

export const config = {
  // Application metadata
  app: {
    name: 'VendaMax',
    version: '1.0.0',
    description: 'Sistema de Gestão de Vendas para Revendedores',
    isProd: import.meta.env.PROD,
    isDev: import.meta.env.DEV,
    mode: import.meta.env.MODE,
  },

  // Supabase configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL as string,
    anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID as string,
  },

  // Optional: Monitoring and error tracking
  monitoring: {
    sentryDsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,
    enableSentry: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN,
  },

  // API configuration
  api: {
    timeout: 30000, // 30 seconds
    retries: 1,
  },

  // Feature flags (for gradual rollout of features)
  features: {
    enableAdvancedReports: false,
    enableExportPDF: false,
    enableDarkMode: false,
  },
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type Config = typeof config;

// ============================================================================
// Logging (dev only)
// ============================================================================

if (config.app.isDev) {
  console.log('[Config] Application configuration loaded:', {
    app: config.app,
    supabase: {
      url: config.supabase.url,
      projectId: config.supabase.projectId,
      // Never log the anon key, even in dev
    },
    monitoring: config.monitoring,
  });
}
