-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Check and add missing columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "socialLink" TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 2. Only try to modify user_id if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='user_id') THEN
        ALTER TABLE public.leads ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

-- 3. Disable Row Level Security (RLS) to ensure everything works without login
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags DISABLE ROW LEVEL SECURITY;
