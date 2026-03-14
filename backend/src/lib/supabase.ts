import { createClient } from "@supabase/supabase-js";
import { getConfig } from "../config";

let _adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (_adminClient) return _adminClient;

  const cfg = getConfig();
  _adminClient = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _adminClient;
}
