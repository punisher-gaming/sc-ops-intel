import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  SC_WIKI_BASE: string;
  CURRENT_GAME_VERSION: string;
  AI?: AIBinding;
  // Email notifications via Resend (optional — if unset, email pushes
  // silently no-op and we fall back to Discord webhook + in-site only).
  RESEND_API_KEY?: string;
  NOTIFICATIONS_FROM?: string;       // e.g. "CitizenDex <notifications@citizendex.com>"
  NOTIFICATIONS_REPLY_TO?: string;   // e.g. "noreply@citizendex.com"
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
