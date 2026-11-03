import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.SUPABASE_PROJECT_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

export const isSupabaseServerConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseKey !== 'your-anon-public-key-here' &&
  supabaseKey !== 'your-service-role-secret-key-here'
);
export const isSupabaseServiceRoleConfigured = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your-service-role-secret-key-here'
);

export const supabaseServer = isSupabaseServerConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;
