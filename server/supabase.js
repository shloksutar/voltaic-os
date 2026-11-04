import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const DEFAULT_SUPABASE_URL = 'https://cgildwaecjinizvwnchy.supabase.co';
const DEFAULT_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnaWxkd2FlY2ppbml6dnduY2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjU2MzQwMSwiZXhwIjoyMTA4MTM5NDAxfQ.uBNTdauKi7W8UjmQ3-e2VDMKELRZ5IJhe5qdt1kUFO4';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.SUPABASE_PROJECT_URL ||
  process.env.VITE_SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  DEFAULT_SERVICE_ROLE_KEY;

export const isSupabaseServerConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseKey !== 'your-anon-public-key-here' &&
  supabaseKey !== 'your-service-role-secret-key-here'
);
export const isSupabaseServiceRoleConfigured = Boolean(
  supabaseKey &&
  supabaseKey !== 'your-service-role-secret-key-here'
);

export const supabaseServer = isSupabaseServerConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;
