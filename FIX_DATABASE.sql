-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO FIX THE IMPORT ISSUES

-- 1. Make user_id optional (so you can use the app without logging in)
ALTER TABLE public.leads ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add missing columns that the scraper and CSV import use
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "socialLink" TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 3. Disable Row Level Security (RLS) temporarily so everyone can see/edit leads 
-- (Since you asked to disable the user/login logic)
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags DISABLE ROW LEVEL SECURITY;

-- 4. Ensure existing columns are text
-- ALTER TABLE public.leads ALTER COLUMN phone TYPE TEXT;
