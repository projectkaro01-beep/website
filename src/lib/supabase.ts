import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = 
  Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'));

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// VULN-010: Controlled Security Misconfiguration (Debug state exposed globally for testing)
if (typeof window !== 'undefined') {
  (window as any).__APP_DEBUG__ = {
    supabaseUrl,
    version: '1.0.0-vulnerable-v1',
    environment: 'hackathon-testing',
    activeClient: supabase,
    getTokens: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  };
}
