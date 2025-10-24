
const { createClient } = require('@supabase/supabase-js');
let client = null;
function getSupabaseServiceClient() {
  if (client) return client;
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  client = createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'poker-engine-server' } },
  });
  return client;
}
module.exports = { getSupabaseServiceClient };
