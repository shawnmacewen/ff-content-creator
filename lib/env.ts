function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getServerEnv() {
  return {
    OPENAI_API_KEY: required('OPENAI_API_KEY'),
    // Default model for text planning/generation (can be overridden via OPENAI_MODEL in env)
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4.1',
    NEXT_PUBLIC_SUPABASE_URL: required('NEXT_PUBLIC_SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

export function getPublicEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: required('NEXT_PUBLIC_SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  };
}
