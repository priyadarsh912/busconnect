import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tsjbfuretxybgndkzihf.supabase.co';
const supabaseAnonKey = 'sb_publishable_StTErnbrboRtftBPwhPYKA_rqQJD4IL';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
