import { env as loadEnv } from "custom-env";
import { z } from "zod";

process.env.APP_STAGE = process.env.APP_STAGE || "dev";

const isProduction = process.env.APP_STAGE === "production";
const isDevelopment = process.env.APP_STAGE === "dev";
const isTest = process.env.APP_STAGE === "test";

// Load .env file
if (isDevelopment) {
  loadEnv();
} else if (isTest) {
  loadEnv("test");
}

// Define the schema with environment-specific requirements
const envSchema = z.object({
  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  APP_STAGE: z.enum(["dev", "production", "test"]).default("dev"),

  // Server
  PORT: z.coerce.number().positive().default(4000),
  HOST: z.string().default("localhost"),

  // Database
  DATABASE_URL: z.string().startsWith("postgresql://"),
  DATABASE_POOL_MIN: z.coerce.number().min(0).default(2),
  DATABASE_POOL_MAX: z.coerce.number().positive().default(10),

  // JWT & Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z
    .string()
    .regex(
      /^\d+(ms|s|m|h|d|w|y)?$/,
      "JWT_EXPIRES_IN must be a duration like 1h or 7d",
    )
    .default("7d"),
  REFRESH_TOKEN_SECRET: z.string().min(32).optional(),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(20).default(12),

  // CORS
  CORS_ORIGIN: z
    .string()
    .or(z.array(z.string()))
    .transform((val) => {
      if (typeof val === "string") {
        return val.split(",").map((origin) => origin.trim());
      }
      return val;
    })
    .default([]),

  // Logging
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "debug", "trace"])
    .default(isProduction ? "info" : "debug"),
});

// Type for the validated environment
export type Env = z.infer<typeof envSchema>;

// Parse and validate environment variables
let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ Invalid environment variables:");
    console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));

    // More detailed error messages
    error.issues.forEach((err) => {
      const path = err.path.join(".");
      console.error(`  ${path}: ${err.message}`);
    });

    process.exit(1);
  }
  throw error;
}

// Helper functions for environment checks
export const isProd = () => env.NODE_ENV === "production";
export const isDev = () => env.NODE_ENV === "development";
export const isTestEnv = () => env.NODE_ENV === "test";

// Export the validated environment object
export { env };

// Default export for convenience
export default env;
