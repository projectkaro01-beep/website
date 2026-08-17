-- ==============================================================================
-- STUDENT MANAGEMENT SYSTEM — VULNERABLE V1 DATABASE SCHEMA
-- For College Cybersecurity Hackathon (Phase 1)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Clean Existing Tables if needed
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.notices CASCADE;
DROP TABLE IF EXISTS public.marks CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. PROFILES TABLE (Linked 1:1 with auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. STUDENTS TABLE
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    enrollment_no TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    semester INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TEACHERS TABLE
CREATE TABLE public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    designation TEXT NOT NULL DEFAULT 'Assistant Professor',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SUBJECTS TABLE
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    semester INT NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ENROLLMENTS TABLE
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, subject_id)
);

-- 8. ATTENDANCE TABLE
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Late')),
    marked_by UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, subject_id, date)
);

-- 9. MARKS TABLE
CREATE TABLE public.marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    exam_type TEXT NOT NULL CHECK (exam_type IN ('Midterm', 'Final', 'Quiz', 'Assignment')),
    score NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. NOTICES TABLE
CREATE TABLE public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    posted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_role TEXT NOT NULL DEFAULT 'all' CHECK (target_role IN ('all', 'student', 'teacher')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. DOCUMENTS TABLE
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- AUTOMATIC PROFILE TRIGGER ON AUTH.USERS SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- PHASE 1: V1 CONTROLLED ROW LEVEL SECURITY (RLS) POLICIES
-- Intentionally weak / overly permissive policies for Phase 1 testing
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies (VULN-004 & VULN-006: Any authenticated user can read/update all profiles)
CREATE POLICY "Allow authenticated read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update profiles" ON public.profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated delete profiles" ON public.profiles FOR DELETE TO authenticated USING (true);

-- 2. Students Policies (VULN-008: Open select for authenticated users)
CREATE POLICY "Allow authenticated read students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert students" ON public.students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update students" ON public.students FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete students" ON public.students FOR DELETE TO authenticated USING (true);

-- 3. Teachers Policies
CREATE POLICY "Allow authenticated read teachers" ON public.teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert teachers" ON public.teachers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update teachers" ON public.teachers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete teachers" ON public.teachers FOR DELETE TO authenticated USING (true);

-- 4. Subjects Policies
CREATE POLICY "Allow authenticated read subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage subjects" ON public.subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Enrollments Policies
CREATE POLICY "Allow authenticated read enrollments" ON public.enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage enrollments" ON public.enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Attendance Policies (VULN-009: Any authenticated user can insert/update attendance)
CREATE POLICY "Allow authenticated read attendance" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage attendance" ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Marks Policies (VULN-002 & VULN-003: Permissive marks read & write)
CREATE POLICY "Allow authenticated read marks" ON public.marks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage marks" ON public.marks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. Notices Policies (VULN-005: Stored notice rendering)
CREATE POLICY "Allow authenticated read notices" ON public.notices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage notices" ON public.notices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. Documents Policies (VULN-007: Open cross-student document read)
CREATE POLICY "Allow authenticated read documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage documents" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- STORAGE BUCKET SETUP (Execute in Supabase Storage or SQL Editor)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('student-documents', 'student-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'student-documents');
CREATE POLICY "Allow public document downloads" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'student-documents');
CREATE POLICY "Allow document delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'student-documents');
