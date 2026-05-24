window.SUPABASE_CONFIG = {
  url: 'https://bemcdcfdaccfdtmnzuwh.supabase.co',
  anonKey: 'sb_publishable_VbaPH-wr2lNFwgYAWkOFIw_Jbz1lkNp'
};

window.supabaseClient = supabase.createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
