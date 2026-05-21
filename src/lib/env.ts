const requiredEnv = [
  "TWELVE_DATA_API_KEY",
  "OPENAI_API_KEY",
  "SUPABASE_URL",
] as const;

type RequiredEnvKey = (typeof requiredEnv)[number];

export function getRequiredEnv(key: RequiredEnvKey) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function getSupabaseServerKey() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const legacyServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (secretKey) {
    return secretKey;
  }

  if (legacyServiceRoleKey) {
    return legacyServiceRoleKey;
  }

  throw new Error(
    "Missing Supabase server key. Set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.",
  );
}

export function hasConfiguredBackend() {
  return (
    requiredEnv.every((key) => Boolean(process.env[key])) &&
    Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}
