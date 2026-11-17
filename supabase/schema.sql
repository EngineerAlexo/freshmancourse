-- ============================================================================
-- SUPABASE DATABASE & STORAGE CONFIGURATION
-- Freshman Ethiopia – Smart Study Notes & Materials Platform
-- ============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
-- It creates the admin authorization setup, the study_materials table,
-- the 'chapter-files' storage bucket (HTML + Images), and all RLS policies.
-- ============================================================================

-- 1. Create the Administrator Table & Auto-Sync
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Auto-populate admin_users from any users already created in Supabase Auth
INSERT INTO public.admin_users (id, email, is_active)
SELECT id, email, TRUE
FROM auth.users
ON CONFLICT (id) DO UPDATE SET is_active = TRUE;

-- Trigger to automatically add future auth users into admin_users
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.admin_users (id, email, is_active)
    VALUES (NEW.id, NEW.email, TRUE)
    ON CONFLICT (id) DO UPDATE SET is_active = TRUE;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin_user();

-- 2. Security Definer Function to Check if Current User is an Authorized Admin
-- ----------------------------------------------------------------------------
-- Allows:
-- 1) Any user present in admin_users with is_active = TRUE
-- 2) Any signed-in authenticated user (since only admins have accounts in this project)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT (
        auth.role() = 'authenticated'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- Row Level Security Policies for public.admin_users
DROP POLICY IF EXISTS "Admins can view admin_users table" ON public.admin_users;
CREATE POLICY "Admins can view admin_users table"
    ON public.admin_users
    FOR SELECT
    TO authenticated
    USING (TRUE);

-- 3. Create the Smart Study Materials Metadata Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'html', -- 'html' or 'image'
    mime_type TEXT,
    file_size BIGINT DEFAULT 0,
    subject TEXT NOT NULL,                  -- e.g. 'Geography', 'Mathematics', 'Psychology'
    subject_code TEXT,                      -- e.g. 'GEOG', 'MATH', 'PSYC'
    category TEXT NOT NULL DEFAULT 'notes', -- 'notes', 'questions', 'exam', 'summary', 'image'
    chapter INT,                            -- 1, 2, 3... (NULL for non-chapter / model exams)
    chapter_label TEXT,                     -- e.g. 'Chapter 1', 'Model Exam 2026'
    stream TEXT NOT NULL DEFAULT 'common',  -- 'natural', 'social', 'common'
    description TEXT,
    is_published BOOLEAN DEFAULT TRUE,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on study_materials
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

-- Indexes for lightning-fast filtering & search
CREATE INDEX IF NOT EXISTS idx_materials_subject ON public.study_materials(subject);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.study_materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_stream ON public.study_materials(stream);
CREATE INDEX IF NOT EXISTS idx_materials_chapter ON public.study_materials(chapter);

-- RLS Policy: Anyone (including unauthenticated students) can view published materials
DROP POLICY IF EXISTS "Public Read Study Materials" ON public.study_materials;
CREATE POLICY "Public Read Study Materials"
    ON public.study_materials
    FOR SELECT
    TO public
    USING (is_published = TRUE);

-- RLS Policy: Authenticated administrators can insert, update, or delete study materials
DROP POLICY IF EXISTS "Admins manage study_materials" ON public.study_materials;
CREATE POLICY "Admins manage study_materials"
    ON public.study_materials
    FOR ALL
    TO authenticated
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 4. Storage Bucket Setup: 'chapter-files' (HTML + Images)
-- ----------------------------------------------------------------------------
-- Public bucket with 50MB limit and unrestricted MIME types (allows all HTML, PNG, JPG, WebP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chapter-files',
    'chapter-files',
    TRUE,
    52428800, -- 50MB limit
    NULL      -- NULL allows all file types without MIME rejection
)
ON CONFLICT (id) DO UPDATE
SET public = TRUE,
    file_size_limit = 52428800,
    allowed_mime_types = NULL;

-- 5. Storage Row Level Security Policies on storage.objects
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Read Notes in chapter-files" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload to chapter-files" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update in chapter-files" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete in chapter-files" ON storage.objects;

-- Policy A: Public read access for students
CREATE POLICY "Public Read Notes in chapter-files"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'chapter-files');

-- Policy B: Authenticated admins can upload new files
CREATE POLICY "Admin Upload to chapter-files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'chapter-files'
    );

-- Policy C: Authenticated admins can update / upsert existing files
CREATE POLICY "Admin Update in chapter-files"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'chapter-files'
    )
    WITH CHECK (
        bucket_id = 'chapter-files'
    );

-- Policy D: Authenticated admins can delete files
CREATE POLICY "Admin Delete in chapter-files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'chapter-files'
    );

-- ============================================================================
-- VERIFICATION QUERY:
-- ----------------------------------------------------------------------------
-- Run the query below to confirm your setup:
-- SELECT id, email, is_active FROM public.admin_users;
-- ============================================================================
