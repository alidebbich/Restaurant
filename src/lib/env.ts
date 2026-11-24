/**
 * Environment Variable Validation
 *
 * Validates all required environment variables at startup.
 * Fails fast with clear error messages if any are missing or invalid.
 */

interface EnvConfig {
  /** Required environment variables */
  required: string[];
  /** Optional environment variables with defaults */
  optional: Record<string, string>;
  /** Validators for specific variables */
  validators: Record<string, (value: string) => boolean>;
}

/**
 * Validate environment variables
 * Call this early in the application startup (e.g., in instrumentation.ts or root layout)
 */
export function validateEnv(config: EnvConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required variables
  for (const key of config.required) {
    const value = process.env[key];
    if (!value || value.trim() === "") {
      errors.push(`Missing required environment variable: ${key}`);
      continue;
    }

    // Run validator if provided
    const validator = config.validators[key];
    if (validator && !validator(value)) {
      errors.push(`Invalid value for environment variable: ${key}`);
    }
  }

  // Set defaults for optional variables
  for (const [key, defaultValue] of Object.entries(config.optional)) {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Default environment configuration for the restaurant app
 */
export const restaurantEnvConfig: EnvConfig = {
  required:
    process.env.NODE_ENV === "production"
      ? [
          "ADMIN_BOOTSTRAP_SECRET", // Secret for first-admin bootstrap
          "SITE_URL", // Production site URL (e.g., https://darzitoun.tn)
        ]
      : [],
  optional: {
    NODE_ENV: "development",
    SITE_URL: "http://localhost:3000",
    ADMIN_BOOTSTRAP_SECRET: "darzitoun-dev-bootstrap-secret-min-32-chars-key",
    CRON_SECRET: "darzitoun-cron-secret-key-32-chars-long",
    FORCE_SECURE_COOKIES: "false",
    FORCE_HSTS: "false",
    // Redis for rate limiting (optional, falls back to in-memory)
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
  },
  validators: {
    SITE_URL: (value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    },
    ADMIN_BOOTSTRAP_SECRET: (value) => value.length >= 32, // Minimum 32 chars for security
    NODE_ENV: (value) => ["development", "production", "test"].includes(value),
  },
};

/**
 * Get validated environment configuration
 * Throws if validation fails (use in server-side code only)
 */
export function getValidatedEnv(): void {
  // Skip validation in test environment or during build
  if (process.env.NODE_ENV === "test" || process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const result = validateEnv(restaurantEnvConfig);
  if (!result.valid) {
    const errorMessage = [
      "❌ Environment validation failed:",
      ...result.errors.map((e) => `  - ${e}`),
      "",
      "Please check your .env file and ensure all required variables are set.",
      "See .env.example for reference.",
    ].join("\n");

    console.error(errorMessage);
    throw new Error("Environment validation failed");
  }

  console.log("✅ Environment validation passed");
}

/**
 * Type-safe access to environment variables
 */
export const env = {
  get NODE_ENV() {
    return process.env.NODE_ENV || "development";
  },
  get isProduction() {
    return this.NODE_ENV === "production";
  },
  get isDevelopment() {
    return this.NODE_ENV === "development";
  },
  get SITE_URL() {
    return process.env.SITE_URL || "http://localhost:3000";
  },
  get ADMIN_BOOTSTRAP_SECRET() {
    return process.env.ADMIN_BOOTSTRAP_SECRET;
  },
  get FORCE_SECURE_COOKIES() {
    return process.env.FORCE_SECURE_COOKIES === "true";
  },
  get FORCE_HSTS() {
    return process.env.FORCE_HSTS === "true";
  },
  get UPSTASH_REDIS_REST_URL() {
    return process.env.UPSTASH_REDIS_REST_URL;
  },
  get UPSTASH_REDIS_REST_TOKEN() {
    return process.env.UPSTASH_REDIS_REST_TOKEN;
  },
};