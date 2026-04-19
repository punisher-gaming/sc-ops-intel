import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  SC_WIKI_BASE: string;
  CURRENT_GAME_VERSION: string;
  AI?: AIBinding;
}

// Minimal shape of the Cloudflare Workers AI binding — just the run()
// method we call. Full type is @cloudflare/workers-types but we avoid
// depending on the full package here.
export interface AIBinding {
  run(
    model: string,
    input: { messages: Array<{ role: "system" | "user" | "assistant"; content: string }>; max_tokens?: number },
  ): Promise<{ response: string }>;
}

export function supabase(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
