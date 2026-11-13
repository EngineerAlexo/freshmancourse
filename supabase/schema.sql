-- ============================================================================
-- SUPABASE DATABASE & STORAGE CONFIGURATION
-- Freshman Ethiopia – Smart Study Notes & Materials Platform
-- ============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
-- It creates the admin allow-list, the smart study_materials metadata table,
-- the 'chapter-files' storage bucket (HTML + Images), and all Row Level Security (RLS) policies.
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

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2. Security Definer Function to Check if Current User is an Authorized Admin
-- ----------------------------------------------------------------------------
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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Row Level Security Policies for public.admin_users
DROP POLICY IF EXISTS "Admins can view admin_users table" ON public.admin_users;
CREATE POLICY "Admins can view admin_users table"
    ON public.admin_users
    FOR SELECT
    TO authenticated
    USING (public.is_admin() OR auth.uid() = id);

-- 3. Create the Smart Study Materials Metadata Table
-- ----------------------------------------------------------------------------
-- Tracks rich document metadata: Subject, Chapter, Category, Stream, and File references.
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

-- RLS Policy: Only verified administrators can insert, update, or delete study materials
DROP POLICY IF EXISTS "Admins manage study_materials" ON public.study_materials;
CREATE POLICY "Admins manage study_materials"
    ON public.study_materials
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4. Storage Bucket Setup: 'chapter-files' (HTML + Images)
-- ----------------------------------------------------------------------------
-- Accommodates both HTML interactive documents and educational images (PNG, JPG, WebP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chapter-files',
    'chapter-files',
    TRUE,
    31457280, -- 30MB limit
    ARRAY[
        'text/html',
        'text/plain',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/svg+xml',
        'image/gif'
    ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = TRUE,
    file_size_limit = 31457280,
    allowed_mime_types = ARRAY[
        'text/html',
        'text/plain',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/svg+xml',
        'image/gif'
    ]::text[];

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

-- Policy B: Only verified admins can upload
CREATE POLICY "Admin Upload to chapter-files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'chapter-files'
        AND public.is_admin()
    );

-- Policy C: Only verified admins can update / upsert
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

-- Policy D: Only verified admins can delete
CREATE POLICY "Admin Delete in chapter-files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'chapter-files'
        AND public.is_admin()
    );

-- ============================================================================
-- AUTHORIZE AN ADMINISTRATOR ACCOUNT:
-- ----------------------------------------------------------------------------
-- 1. Create a user in your Supabase Dashboard: Authentication -> Users -> Add User.
-- 2. Execute the snippet below to grant admin permissions:
--
--    INSERT INTO public.admin_users (id, email, is_active)
--    SELECT id, email, TRUE
--    FROM auth.users
--    WHERE email = 'engineerhaile1@gmail.com'
--    ON CONFLICT (id) DO UPDATE SET is_active = TRUE;
-- ============================================================================
