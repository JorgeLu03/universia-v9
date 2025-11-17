import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

// IMPORTANT: Make sure to create a bucket named 'assets' in your Supabase project.
// You also need to configure your bucket to be public.
// Go to Storage -> Buckets -> assets -> Bucket settings -> Public bucket -> true

const SUPABASE_URL = 'https://tfmhwqnzssqyieotzpyb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmbWh3cW56c3NxeWllb3R6cHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMzM4NjUsImV4cCI6MjA3ODkwOTg2NX0.F-M2zfM3Nq_2AIndvkclWnn5F34G91NOahU03Hzv5s0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };
