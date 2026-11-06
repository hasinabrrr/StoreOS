import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ochkypfqhrvtskjxdrcw.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jaGt5cGZxaHJ2dHNranhkcmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNzY4MzYsImV4cCI6MjEwODg1MjgzNn0.4tiPnk74v3fWmsAnamJFUqXbY4m9WeMSRnRfolUObOk';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


