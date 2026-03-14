import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  SENTRY_DSN: z.string().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  SCORING_PASS_THRESHOLD: z.coerce.number().default(70),
  SCORING_AUTO_APPROVE_THRESHOLD: z.coerce.number().default(90),
  SCORING_AUTO_REJECT_THRESHOLD: z.coerce.number().default(30),
});

export type Config = z.infer<typeof schema>;

let _config: Config | null = null;

/** Reset cached config — only for tests. */
export function resetConfig(): void {
  _config = null;
}

export function loadConfig(): Config {
  if (_config) return _config;

  const result = schema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    console.error("Invalid environment configuration:");
    for (const [key, errors] of Object.entries(formatted)) {
      console.error(`  ${key}: ${errors?.join(", ")}`);
    }
    process.exit(1);
  }

  _config = result.data;
  return _config;
}

export function getConfig(): Config {
  if (!_config) throw new Error("Config not loaded — call loadConfig() first");
  return _config;
}
