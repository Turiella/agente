import { SupabaseClient } from '@supabase/supabase-js';

declare module '../supabaseClient' {
export const supabase : SupabaseClient;
}