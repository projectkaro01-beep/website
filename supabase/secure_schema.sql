-- ==============================================================================
-- STUDENT MANAGEMENT SYSTEM — SECURE V2 DATABASE SCHEMA & HARDENING
-- For College Cybersecurity Hackathon (Phase 2 Remediation)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- Avoid recursive RLS lookups and provide tamper-proof role evaluation
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_student_id()
RETURNS UUID AS $$
  SELECT id FROM public.students WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_teacher_id()
RETURNS UUID AS $$
  SELECT id FROM public.teachers WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==============================================================================
-- PREVENT PRIVILEGE ESCALATION TRIGGER (VULN-004 & VULN-006 Fix)
-- Users cannot modify their own 'role' column unless they are verified admins
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    -- If role is being changed
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Only existing admins can change roles
        IF NOT public.is_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- ==============================================================================
-- DROP OLD PERMISSIVE V1 POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated delete profiles" ON public.profiles;

DROP POLICY IF EXISTS "Allow authenticated read students" ON public.students;
DROP POLICY IF EXISTS "Allow authenticated insert students" ON public.students;
DROP POLICY IF EXISTS "Allow authenticated update students" ON public.students;
DROP POLICY IF EXISTS "Allow authenticated delete students" ON public.students;

DROP POLICY IF EXISTS "Allow authenticated read teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow authenticated insert teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow authenticated update teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow authenticated delete teachers" ON public.teachers;

DROP POLICY IF EXISTS "Allow authenticated read subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow authenticated manage subjects" ON public.subjects;

DROP POLICY IF EXISTS "Allow authenticated read enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Allow authenticated manage enrollments" ON public.enrollments;

DROP POLICY IF EXISTS "Allow authenticated read attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow authenticated manage attendance" ON public.attendance;

DROP POLICY IF EXISTS "Allow authenticated read marks" ON public.marks;
DROP POLICY IF EXISTS "Allow authenticated manage marks" ON public.marks;

DROP POLICY IF EXISTS "Allow authenticated read notices" ON public.notices;
DROP POLICY IF EXISTS "Allow authenticated manage notices" ON public.notices;

DROP POLICY IF EXISTS "Allow authenticated read documents" ON public.documents;
DROP POLICY IF EXISTS "Allow authenticated manage documents" ON public.documents;

-- ==============================================================================
-- HARDENED SECURE V2 ROW LEVEL SECURITY POLICIES
-- ==============================================================================

-- 1. PROFILES POLICIES
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated
USING (
    id = auth.uid() 
    OR public.is_admin() 
    OR public.is_teacher()
);

CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.is_admin())
WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_delete_policy" ON public.profiles
FOR DELETE TO authenticated
USING (public.is_admin());

-- 2. STUDENTS POLICIES (Fixes VULN-008 Data Exposure)
CREATE POLICY "students_select_policy" ON public.students
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR public.is_admin() 
    OR public.is_teacher()
);

CREATE POLICY "students_insert_policy" ON public.students
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "students_update_policy" ON public.students
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "students_delete_policy" ON public.students
FOR DELETE TO authenticated
USING (public.is_admin());

-- 3. TEACHERS POLICIES
CREATE POLICY "teachers_select_policy" ON public.teachers
FOR SELECT TO authenticated
USING (true); -- Publicly viewable faculty directory

CREATE POLICY "teachers_insert_policy" ON public.teachers
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "teachers_update_policy" ON public.teachers
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "teachers_delete_policy" ON public.teachers
FOR DELETE TO authenticated
USING (public.is_admin());

-- 4. SUBJECTS POLICIES
CREATE POLICY "subjects_select_policy" ON public.subjects
FOR SELECT TO authenticated
USING (true); -- Public course catalog

CREATE POLICY "subjects_admin_manage_policy" ON public.subjects
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 5. ENROLLMENTS POLICIES
CREATE POLICY "enrollments_select_policy" ON public.enrollments
FOR SELECT TO authenticated
USING (
    student_id = public.get_student_id() 
    OR public.is_admin() 
    OR public.is_teacher()
);

CREATE POLICY "enrollments_insert_policy" ON public.enrollments
FOR INSERT TO authenticated
WITH CHECK (
    student_id = public.get_student_id() 
    OR public.is_admin()
);

CREATE POLICY "enrollments_delete_policy" ON public.enrollments
FOR DELETE TO authenticated
USING (
    student_id = public.get_student_id() 
    OR public.is_admin()
);

-- 6. ATTENDANCE POLICIES (Fixes VULN-009 & VULN-003)
CREATE POLICY "attendance_select_policy" ON public.attendance
FOR SELECT TO authenticated
USING (
    student_id = public.get_student_id()
    OR public.is_admin()
    OR (
        public.is_teacher() AND subject_id IN (
            SELECT id FROM public.subjects WHERE teacher_id = public.get_teacher_id()
        )
    )
);

CREATE POLICY "attendance_modify_policy" ON public.attendance
FOR ALL TO authenticated
USING (
    public.is_admin() 
    OR (
        public.is_teacher() AND subject_id IN (
            SELECT id FROM public.subjects WHERE teacher_id = public.get_teacher_id()
        )
    )
)
WITH CHECK (
    public.is_admin() 
    OR (
        public.is_teacher() AND subject_id IN (
            SELECT id FROM public.subjects WHERE teacher_id = public.get_teacher_id()
        )
    )
);

-- 7. MARKS POLICIES (Fixes VULN-002 & VULN-003 IDOR and RLS)
CREATE POLICY "marks_select_policy" ON public.marks
FOR SELECT TO authenticated
USING (
    student_id = public.get_student_id()
    OR public.is_admin()
    OR (
        public.is_teacher() AND subject_id IN (
            SELECT id FROM public.subjects WHERE teacher_id = public.get_teacher_id()
        )
    )
);

CREATE POLICY "marks_modify_policy" ON public.marks
FOR ALL TO authenticated
USING (
    public.is_admin() 
    OR (
        public.is_teacher() AND subject_id IN (
            SELECT id FROM public.subjects WHERE teacher_id = public.get_teacher_id()
        )
    )
)
WITH CHECK (
    public.is_admin() 
    OR (
        public.is_teacher() AND subject_id IN (
            SELECT id FROM public.subjects WHERE teacher_id = public.get_teacher_id()
        )
    )
);

-- 8. NOTICES POLICIES
CREATE POLICY "notices_select_policy" ON public.notices
FOR SELECT TO authenticated
USING (
    target_role = 'all'
    OR (target_role = 'student' AND (public.get_auth_role() = 'student' OR public.is_admin() OR public.is_teacher()))
    OR (target_role = 'teacher' AND (public.is_teacher() OR public.is_admin()))
    OR public.is_admin()
);

CREATE POLICY "notices_modify_policy" ON public.notices
FOR ALL TO authenticated
USING (public.is_admin() OR public.is_teacher())
WITH CHECK (public.is_admin() OR public.is_teacher());

-- 9. DOCUMENTS POLICIES (Fixes VULN-007)
CREATE POLICY "documents_select_policy" ON public.documents
FOR SELECT TO authenticated
USING (
    uploaded_by = auth.uid() 
    OR student_id = public.get_student_id() 
    OR public.is_admin() 
    OR public.is_teacher()
);

CREATE POLICY "documents_insert_policy" ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
    uploaded_by = auth.uid() 
    AND student_id = public.get_student_id()
);

CREATE POLICY "documents_delete_policy" ON public.documents
FOR DELETE TO authenticated
USING (
    uploaded_by = auth.uid() 
    OR public.is_admin()
);

-- ==============================================================================
-- HARDENED STORAGE POLICIES (Fixes VULN-007 Storage Access Control)
-- ==============================================================================
UPDATE storage.buckets SET public = false WHERE id = 'student-documents';

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public document downloads" ON storage.objects;
DROP POLICY IF EXISTS "Allow document delete" ON storage.objects;

-- Only permit uploads where folder matches user's auth UID
CREATE POLICY "storage_user_upload_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'student-documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Only permit reads if user owns the folder, or is teacher/admin
CREATE POLICY "storage_user_read_policy" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'student-documents' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_admin()
        OR public.is_teacher()
    )
);

CREATE POLICY "storage_user_delete_policy" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'student-documents' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_admin()
    )
);
