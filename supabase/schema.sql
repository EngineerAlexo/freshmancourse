-- ============================================================================
-- SUPABASE DATABASE & STORAGE CONFIGURATION
-- Study Notes Educational Platform
-- ============================================================================
-- Run this script in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New Query).
-- It configures the administrator allow-list table, Row Level Security (RLS),
-- the 'chapter-files' storage bucket, and strict storage security policies.
-- ============================================================================

-- 1. Create the Administrator Allow-List Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on the admin table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2. Security Definer Function to Check if Current User is an Authorized Admin
-- ----------------------------------------------------------------------------
-- This function runs with elevated security to verify if the authenticated user
-- exists in the admin_users table, avoiding recursive policy checks.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admin_users
        WHERE id = auth.uid()
          AND is_active = TRUE
    );
$$;

-- Grant execution to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- 3. Row Level Security Policies for public.admin_users
-- ----------------------------------------------------------------------------
-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Admins can view admin_users table" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can update admin_users table" ON public.admin_users;

-- Authenticated admins can view the admin table
CREATE POLICY "Admins can view admin_users table"
    ON public.admin_users
    FOR SELECT
    TO authenticated
    USING (public.is_admin() OR auth.uid() = id);

-- 4. Storage Bucket Setup: 'chapter-files'
-- ----------------------------------------------------------------------------
-- Ensure the 'chapter-files' bucket exists and is marked public for student reading
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chapter-files',
    'chapter-files',
    TRUE,
    20971520, -- 20MB limit
    ARRAY['text/html', 'text/plain']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = TRUE,
    allowed_mime_types = ARRAY['text/html', 'text/plain']::text[];

-- 5. Storage Row Level Security Policies on storage.objects
-- ----------------------------------------------------------------------------
-- Drop existing policies for this bucket to ensure a clean setup
DROP POLICY IF EXISTS "Public Read Notes in chapter-files" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload to chapter-files" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update in chapter-files" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete in chapter-files" ON storage.objects;

-- Policy A: Anyone (including unauthenticated students) can READ files in 'chapter-files'
CREATE POLICY "Public Read Notes in chapter-files"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'chapter-files');

-- Policy B: Only verified administrators can INSERT (Upload) files into 'chapter-files'
CREATE POLICY "Admin Upload to chapter-files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'chapter-files'
        AND public.is_admin()
    );

-- Policy C: Only verified administrators can UPDATE (Replace / Upsert) files in 'chapter-files'
CREATE POLICY "Admin Update in chapter-files"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'chapter-files'
        AND public.is_admin()
    )
    WITH CHECK (
        bucket_id = 'chapter-files'
        AND public.is_admin()
    );

-- Policy D: Only verified administrators can DELETE files in 'chapter-files'
CREATE POLICY "Admin Delete in chapter-files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'chapter-files'
        AND public.is_admin()
    );

-- ============================================================================
-- HOW TO AUTHORIZE AN ADMINISTRATOR ACCOUNT:
-- ----------------------------------------------------------------------------
-- 1. Create a user in your Supabase Dashboard: Authentication -> Users -> Add User.
-- 2. Once created, run the following SQL query with your admin email:
--
--    INSERT INTO public.admin_users (id, email, is_active)
--    SELECT id, email, TRUE
--    FROM auth.users
--    WHERE email = 'engineerhaile1@gmail.com'
--    ON CONFLICT (id) DO UPDATE SET is_active = TRUE;
-- ============================================================================
