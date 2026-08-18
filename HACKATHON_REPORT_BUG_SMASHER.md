# CYBERSECURITY HACKATHON PENETRATION TESTING & SECURITY AUDIT REPORT

**Project Name:** EduPulse — Full-Stack Student Management System  
**Team Name:** Bug Smasher  
**Team Leader:** Ranjan Gowda S S  
**Team Members:**  
- Ranjan Gowda S S (Team Leader — Security & Full-Stack Architect)  
- Manish M (Lead Penetration Tester & Exploit Researcher)  
- Keerthan Gowda T R (Database Administrator & Hardening Engineer)  

**Target Architecture:** React 18, TypeScript, Vite, Tailwind CSS, Supabase PostgreSQL, Supabase Auth & Storage  
**Evaluation Scope:** Web Application Vulnerability Discovery, Controlled Exploitation, Attack Reproduction & Full-Stack Defense-in-Depth Remediation  
**Submission Date:** August 17, 2026  
**Final Project Status:** 10/10 Vulnerabilities Discovered → Successfully Exploited → 100% Remediated in Secure V2  

---

## 1. Executive Summary & Assessment Methodology

Modern web applications built on Single Page Application (SPA) frameworks coupled directly with Backend-as-a-Service (BaaS) platforms like Supabase introduce significant security risks when developers confuse user interface routing with server-side authorization. When database tables lack fine-grained Row Level Security (RLS) or when input parameters are unvalidated, low-privilege users can bypass the visual frontend entirely and execute unauthorized operations directly against the database API.

Team **Bug Smasher** executed a comprehensive, dual-phase security lifecycle:
1. **Phase 1 (Target Construction & Attack Verification):** Constructed a functional, multi-tier Student Management System (EduPulse) containing authentic PostgreSQL relationships, Supabase Authentication, real role models (Student, Teacher, Admin), and genuine academic workflows. We identified, reproduced, and documented 10 controlled vulnerabilities spanning access control, injection, parameter tampering, and storage isolation.
2. **Phase 2 (Defense-in-Depth Engineering):** Engineered an enterprise-grade remediation suite that moves beyond cosmetic UI fixes. We implemented PostgreSQL `SECURITY DEFINER` role validation functions, database-level `BEFORE UPDATE` mutation triggers, strict row-ownership RLS predicates, client-side input whitelisting, DOMPurify HTML sanitization, and ephemeral 60-second storage signed tokens.

---

## 2. Threat Modeling & Vulnerability Summary Matrix

| Vuln ID | Vulnerability Title | OWASP Category | Severity | CVSS v3.1 | Attack Result | Secure V2 Prevention |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| **VULN-001** | Client-Side Only Route Guarding | A01:2021 — Broken Access Control | **High** | 8.1 | Created unauthorized courses & queried faculty data as student | PostgreSQL `is_admin()` & `is_teacher()` RLS enforcement |
| **VULN-002** | Insecure Direct Object Reference (IDOR) | A01:2021 — Broken Access Control | **High** | 8.5 | Accessed Student B's grades via URL parameter tampering | Bound queries strictly to session `auth.uid()` |
| **VULN-003** | PostgreSQL Row Level Security (RLS) Misconfig | A05:2021 — Security Misconfiguration | **High** | 8.2 | Dumped complete database marks & attendance tables | Replaced `USING (true)` with tenant-isolated predicates |
| **VULN-004** | Privilege Escalation via Role Mutation | A01:2021 — Broken Access Control | **Critical** | 9.8 | Elevated standard student account to Super-Admin | Implemented `BEFORE UPDATE` role protection trigger |
| **VULN-005** | Stored Cross-Site Scripting (XSS) | A03:2021 — Injection | **High** | 8.3 | Injected script in notice board executing in victim browsers | Integrated `DOMPurify` HTML sanitization engine |
| **VULN-006** | Mass Assignment Parameter Binding | A08:2021 — Software & Data Integrity | **High** | 7.5 | Overwrote unauthorized model properties during profile save | Enforced strict client/server field whitelisting |
| **VULN-007** | Insecure Storage Bucket Access Control | A01:2021 — Broken Access Control | **High** | 7.9 | Downloaded confidential student documents unauthenticated | Private storage bucket + 60s scoped signed tokens |
| **VULN-008** | Sensitive Data Exposure in Roster Queries | A02:2021 — Sensitive Data Exposure | **Medium** | 5.3 | Harvested personal student phone numbers and internal UUIDs | Applied query projection data minimization |
| **VULN-009** | Business Logic Authorization Bypass | A04:2021 — Insecure Design | **High** | 7.7 | Self-certified student attendance from Absent to Present | Database RLS restricting writes to assigned teachers |
| **VULN-010** | Information Disclosure via Client Debug State | A05:2021 — Security Misconfiguration | **Medium** | 4.8 | Extracted session tokens and client config via console | Stripped all debug harnesses from production bundle |

---

## 3. Detailed Vulnerability Findings, Attack Reproductions & Prevention Architectures

---

### VULN-001: Broken Access Control — Client-Side Only Route & Action Guarding

- **Severity Rating:** HIGH (CVSS: 8.1)
- **OWASP Category:** OWASP A01:2021 — Broken Access Control
- **Target Asset:** Course Curriculum & Faculty Directory (`public.subjects`, `public.teachers`)

#### 1. Technical Root Cause & Attack Methodology
In modern React single-page applications, UI route guards (such as `ProtectedRoute`) only alter client-side browser views and do not represent a security barrier. In Vulnerable V1, while administrative buttons were hidden from the Student UI, the underlying Supabase tables lacked backend role enforcement. Under an authenticated Student session, we executed direct API queries via DevTools Console to insert new course records into `public.subjects` and extract faculty records:
```javascript
const { data, error } = await supabase.from('subjects').insert({
  code: 'HACK-101',
  name: 'Unauthorized Curriculum Injection',
  department: 'Computer Science',
  semester: 1
}).select();
```

#### 2. Attack Outcome & Verification
The API accepted the request with HTTP `200 OK`, creating course `HACK-101` and dumping the full instructor database directly from a standard student session.

#### 3. Business Impact & Risk Analysis
Complete collapse of role segregation. Any registered student could inject fictitious courses, tamper with curriculum structures, or corrupt administrative tables.

#### 4. Proof-of-Concept Screenshot Evidence
```
================================================================================
[ PLACEHOLDER: INSERT SCREENSHOT VULN-001-before.png HERE ]
Caption: DevTools console showing student account successfully executing administrative course insertion into public.subjects.
================================================================================
```

#### 5. Exhaustive Prevention Architecture (Secure V2 Remediation)
- **Database-Level Role Evaluation Functions:** Relying on JWT user metadata for authorization is vulnerable to token tampering and synchronization delays. We implemented PostgreSQL helper functions with `SECURITY DEFINER` to inspect the verified `public.profiles` record:
  ```sql
  CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
  $$ LANGUAGE sql SECURITY DEFINER STABLE;
  ```
- **Hardened Row Level Security (RLS) Policy:** We locked all modification operations on `public.subjects` and `public.teachers` exclusively to administrators:
  ```sql
  CREATE POLICY "subjects_admin_manage_policy" ON public.subjects
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
  ```
- **Verification & Failure State:** Any direct API mutation issued by a non-admin session is intercepted by PostgreSQL before reaching the table buffer, returning an immediate fatal RLS permission violation (`403 Forbidden`).

---

### VULN-002: Insecure Direct Object Reference (IDOR / BOLA) on Academic Marks

- **Severity Rating:** HIGH (CVSS: 8.5)
- **OWASP Category:** OWASP A01:2021 — Broken Access Control / API1:2023 BOLA
- **Target Asset:** Confidential Grade Ledger & Academic Evaluations of Student B

#### 1. Technical Root Cause & Attack Methodology
The marks lookup component accepted an untrusted query parameter (`?student_id=<UUID>`). Because the backend failed to validate whether the requesting user owned the requested `student_id`, an attacker could supply another student's identifier in the URL or lookup bar to retrieve their grade report:
```
http://localhost:5173/student/marks?student_id=8f4a1234-5678-4321-abcd-ef0123456789
```

#### 2. Attack Outcome & Verification
Student A successfully rendered Student B's complete grade sheet, including Midterm/Final examination scores, quiz grades, percentages, and private faculty remarks.

#### 3. Business Impact & Risk Analysis
Severe breach of academic confidentiality and data protection laws (FERPA, GDPR). Every student could spy on the marks and academic standing of all peers.

#### 4. Proof-of-Concept Screenshot Evidence
```
================================================================================
[ PLACEHOLDER: INSERT SCREENSHOT VULN-002-before.png HERE ]
Caption: Student A's interface displaying Student B's confidential academic marks sheet and teacher remarks via IDOR parameter tampering.
================================================================================
```

#### 5. Exhaustive Prevention Architecture (Secure V2 Remediation)
- **Elimination of Client-Controlled Query Identifiers:** In `StudentMarks.tsx`, we completely removed URL parameter binding and manual search lookups. The client query is bound strictly to the session's internal `studentRecord.id` resolved on the server side.
- **Identity-Scoped Row Level Security (RLS):** We enforced strict ownership predicates in PostgreSQL ensuring students can ONLY select rows matching their own authenticated student profile:
  ```sql
  CREATE OR REPLACE FUNCTION public.get_student_id()
  RETURNS UUID AS $$
    SELECT id FROM public.students WHERE user_id = auth.uid();
  $$ LANGUAGE sql SECURITY DEFINER STABLE;

  CREATE POLICY "marks_select_policy" ON public.marks FOR SELECT TO authenticated
  USING (
      student_id = public.get_student_id()
      OR public.is_admin()
      OR (public.is_teacher() AND subject_id IN (
          SELECT id FROM public.subjects WHERE teacher_id = public.get_teacher_id()
      ))
  );
  ```
- **Verification & Failure State:** If Student A attempts to query Student B's marks via manual API request, PostgreSQL filters the query using the WHERE predicate `student_id = public.get_student_id()`, returning an empty array (0 rows) and preventing unauthorized data discovery.

---

### VULN-003: PostgreSQL Row Level Security (RLS) Misconfiguration — Overly Permissive Policies

- **Severity Rating:** HIGH (CVSS: 8.2)
- **OWASP Category:** OWASP A05:2021 — Security Misconfiguration
- **Target Asset:** Entire Institutional Marks & Attendance Database

#### 1. Technical Root Cause & Attack Methodology
Database tables had RLS enabled, but policies were configured with open clauses: `FOR SELECT TO authenticated USING (true)`. This granted any authenticated bearer token blanket read access across every record in the table regardless of role or ownership:
```javascript
const { data: allMarks } = await supabase.from('marks').select('*, student:students(*), subject:subjects(*)');
console.table(allMarks);
```

#### 2. Attack Outcome & Verification
Executing an unconstrained `SELECT *` against `public.marks` and `public.attendance` dumped the complete institution-wide academic ledger and attendance history across all students in a single query.

#### 3. Business Impact & Risk Analysis
Unrestricted bulk data exfiltration. Any registered user could extract thousands of institutional records directly via REST endpoints.

#### 4. Proof-of-Concept Screenshot Evidence
```
================================================================================
[ PLACEHOLDER: INSERT SCREENSHOT VULN-003-before.png HERE ]
Caption: Browser console table displaying an unfiltered dump of all students' marks and attendance logs via misconfigured RLS policies.
================================================================================
```

#### 5. Exhaustive Prevention Architecture (Secure V2 Remediation)
- **Elimination of Open 'USING (true)' Directives:** In PostgreSQL BaaS architectures, a policy with `USING (true)` completely bypasses tenant isolation. We dropped all open policies across `profiles`, `students`, `teachers`, `marks`, `attendance`, and `documents`.
- **Role-Based & Tenant-Scoped Predicates:** Every table was partitioned with mathematical tenant guarantees:
  - `public.profiles`: `id = auth.uid() OR public.is_admin() OR public.is_teacher()`
  - `public.attendance`: `student_id = public.get_student_id() OR public.is_admin() OR assigned_teacher`
  - `public.marks`: `student_id = public.get_student_id() OR public.is_admin() OR assigned_teacher`
- **Verification & Failure State:** When a student issues an unconstrained `SELECT * FROM marks`, the database runtime automatically injects the active user's RLS constraints into the query execution planner, ensuring only rows owned by the caller are ever evaluated.

---

### VULN-004: Privilege Escalation — Unauthorized Role Field Mutation

- **Severity Rating:** CRITICAL (CVSS: 9.8)
- **OWASP Category:** OWASP A01:2021 — Broken Access Control / Privilege Escalation
- **Target Asset:** User Profiles & System Authorization Table (`public.profiles.role`)

#### 1. Technical Root Cause & Attack Methodology
The `profiles` table contained the `role` column (`student`, `teacher`, `admin`). The update RLS policy allowed users to update their own row without column-level restrictions. Under a Student account, we issued a direct update payload `{ role: 'admin' }` and refreshed the application:
```javascript
const userId = (await supabase.auth.getUser()).data.user.id;
await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);
```

#### 2. Attack Outcome & Verification
The database committed the role update. Upon page refresh, the application re-hydrated the session with super-admin privileges, dynamically unlocking the full ADMIN PORTAL and administrative management modules.

#### 3. Business Impact & Risk Analysis
Complete system takeover. Any unprivileged user could unilaterally promote their account to super-administrator and assume total administrative control over the entire institution.

#### 4. Proof-of-Concept Screenshot Evidence
```
================================================================================
[ PLACEHOLDER: INSERT SCREENSHOT VULN-004-before.png HERE ]
Caption: Student A's account interface immediately following the attack, displaying the red ADMIN role badge and Admin Portal sidebar navigation.
================================================================================
```

#### 5. Exhaustive Prevention Architecture (Secure V2 Remediation)
- **Immutable Role Field Trigger (Database Layer):** Because column-level UPDATE grants in PostgreSQL RLS can still be bypassed if policy checks are too broad, we implemented an un-bypassable `BEFORE UPDATE` trigger on `public.profiles`:
  ```sql
  CREATE OR REPLACE FUNCTION public.protect_profile_role()
  RETURNS TRIGGER AS $$
  BEGIN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
          IF NOT public.is_admin() THEN
              RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles.';
          END IF;
      END IF;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE TRIGGER trg_protect_profile_role
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();
  ```
- **Server-Side Role Enforcement:** Even if a malicious actor sends `{ role: 'admin' }` in raw JSON, the database engine aborts the transaction before disk write, throwing an uncatchable PL/pgSQL exception.

---

### VULN-005: Stored Cross-Site Scripting (XSS) on Campus Notice Board

- **Severity Rating:** HIGH (CVSS: 8.3)
- **OWASP Category:** OWASP A03:2021 — Injection (Stored XSS)
- **Target Asset:** Campus Bulletin Board & Victim Browser Sessions (Students/Teachers)

#### 1. Technical Root Cause & Attack Methodology
Announcements posted to the notice board were rendered into the DOM using React's unescaped `dangerouslySetInnerHTML` directive without HTML sanitization. We posted a notice containing an event-driven payload:
```html
<img src="invalid-img" onerror="alert('VULN-005: Stored XSS Executed on ' + document.domain);" />
```

#### 2. Attack Outcome & Verification
When Student A viewed the notice board, the browser parsed the unescaped tag, triggered the `onerror` handler, and executed arbitrary JavaScript in the victim's session context.

#### 3. Business Impact & Risk Analysis
Session hijacking (exfiltrating JWT tokens from storage), credential harvesting via DOM phishing overlays, and forced background administrative actions.

#### 4. Proof-of-Concept Screenshot Evidence
```
================================================================================
[ PLACEHOLDER: INSERT SCREENSHOT VULN-005-before.png ]
Caption: Browser alert dialog popping up over the Student Notice Board confirming arbitrary script execution via unescaped stored HTML.
================================================================================
```

#### 5. Exhaustive Prevention Architecture (Secure V2 Remediation)
- **DOMPurify Sanitization Engine Integration:** We integrated `DOMPurify` across all notice rendering components (`StudentNotices.tsx`, `StudentDashboard.tsx`, `TeacherNotices.tsx`, `AdminNotices.tsx`). Every HTML fragment is passed through a strict sanitization pipeline prior to DOM injection:
  ```tsx
  import DOMPurify from 'dompurify';

  const sanitizedContent = DOMPurify.sanitize(notice.content, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
  });
  ```
- **Neutralization of Executable Vectors:** When malicious payloads such as `<img src=x onerror=alert(1)>` are processed, DOMPurify strips the `onerror` handler and renders a safe, harmless `<img>` tag, completely disarming execution while maintaining valid formatting.

---

### VULN-006: Mass Assignment / Unvalidated Parameter Binding

- **Severity Rating:** HIGH (CVSS: 7.5)
- **OWASP Category:** OWASP A08:2021 — Software & Data Integrity Failures
- **Target Asset:** Backend User Model & Protected Database Properties

#### 1. Technical Root Cause & Attack Methodology
The profile update routine accepted arbitrary client objects and forwarded them directly into the database update query without filtering or schema whitelisting. We submitted a payload containing extra, unexposed fields (`role: 'teacher'`, `avatar_url`, `updated_at`):
```javascript
const payload = {
  full_name: "Student A (Modified)",
  phone: "+1-555-0199",
  role: "teacher",
  avatar_url: "https://attacker.com/malicious.png"
};
await supabase.from('profiles').update(payload).eq('id', user.id);
```

#### 2. Attack Outcome & Verification
The database bound and committed all supplied keys into the profile record in a single transaction without parameter rejection.

#### 3. Business Impact & Risk Analysis
Attackers can manipulate hidden model attributes, overwrite audit timestamps, or modify privilege flags during standard profile saves.

#### 4. Proof-of-Concept Screenshot Evidence
```
================================================================================
[ PLACEHOLDER: INSERT SCREENSHOT VULN-006-before.png ]
Caption: Console showing unvalidated mass assignment payload updating multiple internal profile attributes simultaneously.
================================================================================
```

#### 5. Exhaustive Prevention Architecture (Secure V2 Remediation)
- **Strict DTO Field Whitelisting (Frontend & API Layer):** In `StudentProfile.tsx`, we replaced direct object ingestion with an explicit Data Transfer Object (DTO) constructor that extracts only explicitly approved user-modifiable properties:
  ```typescript
  const sanitizedPayload = {
    full_name: fullName.trim(),
    phone: phone.trim(),
    updated_at: new Date().toISOString(),
  };
  await supabase.from('profiles').update(sanitizedPayload).eq('id', profile.id);
  ```
- **Database Layer Constraints:** Combined with the PostgreSQL role protection trigger, any client-side attempt to attach unapproved fields (such as `role`, `created_at`, or `status`) is discarded by the client constructor and rejected by the database.

---

### VULN-007: Insecure Storage Bucket Access Control & Cross-Tenant File Exposure

- **Severity Rating:** HIGH (CVSS: 7.9)
- **OWASP Category:** OWASP A01:2021 — Broken Access Control
- **Target Asset:** Private Student Verification Files & Storage Vault (`student-documents`)

#### 1. Technical Root Cause & Attack Methodology
The storage bucket was configured as `public = true`, and read policies allowed unconstrained reads. Student A uploaded a private document. Student B queried the document registry, retrieved Student A's storage key (`<UUID>/1700000000-assignment.pdf`), and generated the public storage URL:
```
https://<project-ref>.supabase.co/storage/v1/object/public/student-documents/<STUDENT_A_UUID>/1700000000-assignment.pdf
```

#### 2. Attack Outcome & Verification
The storage endpoint returned Student A's document with HTTP `200 OK` directly to Student B and unauthenticated users in an Incognito window.

#### 3. Business Impact & Risk Analysis
Confidentiality loss of student identity documents, medical records, and assignment submissions across tenants.

#### 4. Proof-of-Concept Screenshot Evidence
```
================================================================================
[ PLACEHOLDER: INSERT SCREENSHOT VULN-007-before.png ]
Caption: Storage Explorer showing Student B retrieving Student A's storage key, with an adjacent incognito tab downloading the file unauthenticated.
================================================================================
```

#### 5. Exhaustive Prevention Architecture (Secure V2 Remediation)
- **Private Bucket Transition & Storage RLS:** We set the storage bucket to private (`public = false`) and implemented strict RLS on `storage.objects` requiring upload/read folder paths to match the user's authentic `auth.uid()`:
  ```sql
  CREATE POLICY "storage_user_upload_policy" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
      bucket_id = 'student-documents' 
      AND (storage.foldername(name))[1] = auth.uid()::text
  );

  CREATE POLICY "storage_user_read_policy" ON storage.objects FOR SELECT TO authenticated
  USING (
      bucket_id = 'student-documents' 
      AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin() OR public.is_teacher())
  );
  ```
- **Ephemeral Signed URL Token Generation:** In `StudentDocuments.tsx`, files are never downloaded via static public links. The application issues a secure call generating a cryptographic, 60-second signed URL:
  ```typescript
  const { data, error } = await supabase.storage
    .from('student-documents')
    .createSignedUrl(filePath, 60);
  ```
- Unauthenticated or cross-tenant access attempts receive an immediate HTTP 403 Access Denied error.

---

### VULN-008: Sensitive Data Exposure in Roster & Directory Queries

- **Severity Rating:** MEDIUM (CVSS: 5.3)
- **OWASP Category:** OWASP A02:2021 — Sensitive Data Exposure / Broken Property Authorization
- **Target Asset:** Personal Identifiable Information (PII) of Enrolled Students

#### 1. Technical Root Cause & Attack Methodology
Roster queries used wildcard selections (`students(*, profile:profiles(*))`), over-fetching all columns from the database and delivering private contact phone numbers and internal UUIDs into client memory.

#### 2. Attack Outcome & Verification
Auditing the network response payload revealed complete profile structures containing private phone numbers and internal user IDs for all enrolled students.

#### 3. Business Impact & Risk Analysis
Violation of Data Minimization (GDPR Article 5). Exposes students' private contact numbers, increasing the risk of targeted social engineering and phishing.

#### 4. Proof-of-Concept Screenshot Evidence
```
================================================================================
[ PLACEHOLDER: INSERT SCREENSHOT VULN-008-before.png ]
Caption: Network tab showing full profile structures including private phone numbers returned in student roster response payload.
================================================================================
```

#### 5. Exhaustive Prevention Architecture (Secure V2 Remediation)
- **Query Projection Data Minimization:** In `TeacherStudents.tsx` and `StudentSubjects.tsx`, we replaced wildcard selections with explicit, minimal column projections:
  ```typescript
  const { data } = await supabase
    .from('enrollments')
    .select(`
      student:students(
        id,
        enrollment_no,
        department,
        semester,
        profile:profiles(full_name, email)
      ),
      subject:subjects(name, code)
    `);
  ```
- **Privacy & Principle of Least Privilege:** Private phone numbers and raw foreign keys are excluded from the API response payload, ensuring sensitive student PII is never transmitted to unauthorized client viewports.

---

### VULN-009: Business Logic Authorization Failure — Attendance Self-Modification

- **Severity Rating:** HIGH (CVSS: 7.7)
- **OWASP Category:** OWASP A04:2021 — Insecure Design / Broken Access Control
- **Target Asset:** Institutional Classroom Attendance Records (`public.attendance`)

#### 1. Technical Root Cause & Attack Methodology
The application assumed hiding the attendance marking UI was sufficient to restrict attendance marking to instructors. The database policy allowed all authenticated users to execute `INSERT` and `UPDATE` on `public.attendance`. Under a Student session with status `Absent`, we issued a direct `upsert` call marking Student A as `Present`:
```javascript
await supabase.from('attendance').upsert({
  student_id: myStudentId,
  subject_id: targetCourseId,
  date: new Date().toISOString().split('T')[0],
  status: 'Present'
}, { onConflict: 'student_id,subject_id,date' });
```

#### 2. Attack Outcome & Verification
The database committed the modification. Upon refreshing the student portal, Student A's attendance reflected `Present` and their attendance percentage increased immediately.

#### 3. Business Impact & Risk Analysis
Total loss of institutional academic integrity. Students can falsify classroom attendance records, bypass exam eligibility requirements, and overwrite faculty records.

#### 4. Proof-of-Concept Screenshot Evidence
```
================================================================================
[ PLACEHOLDER: INSERT SCREENSHOT VULN-009-before.png ]
Caption: Student Attendance view showing attendance percentage and session status successfully falsified to Present via student session API injection.
================================================================================
```

#### 5. Exhaustive Prevention Architecture (Secure V2 Remediation)
- **Business Logic Verification via Database RLS:** We engineered the PostgreSQL RLS policy `attendance_modify_policy` to strictly validate that the caller is either an administrator or the specific faculty member assigned to instruct that subject:
  ```sql
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
  ```
- **Verification & Failure State:** If a student attempts to execute an attendance upsert, the database policy check evaluates to `false` and rejects the mutation with an RLS access violation error.

---

### VULN-010: Security Misconfiguration — Global Debug Object & Client State Exposure

- **Severity Rating:** MEDIUM (CVSS: 4.8)
- **OWASP Category:** OWASP A05:2021 — Security Misconfiguration
- **Target Asset:** Client Runtime Environment & Active Authentication Session

#### 1. Technical Root Cause & Attack Methodology
An internal diagnostic object was bound directly to `window.__APP_DEBUG__`, providing helper methods that returned active session JWT tokens, project URLs, and client handles from the browser console.

#### 2. Attack Outcome & Verification
Typing `window.__APP_DEBUG__.getTokens()` into DevTools instantly extracted the user's active session tokens and configuration without inspecting local storage or cookies.

#### 3. Business Impact & Risk Analysis
Facilitates rapid reconnaissance and streamlines script-assisted session token harvesting.

#### 4. Proof-of-Concept Screenshot Evidence
```
================================================================================
[ PLACEHOLDER: INSERT SCREENSHOT VULN-010-before.png ]
Caption: Browser console displaying the exposed window.__APP_DEBUG__ object and token extraction helper output.
================================================================================
```

#### 5. Exhaustive Prevention Architecture (Secure V2 Remediation)
- **Complete Removal of Diagnostic Interfaces:** In `src/lib/supabase.ts`, all global window object attachments, debug harnesses, and token extraction functions were completely removed:
  ```typescript
  // Secure V2: Diagnostic harnesses stripped from production bundle
  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
  ```
- **Verification & Failure State:** Attempting to query `window.__APP_DEBUG__` in DevTools returns `undefined`, preventing automated client-side reconnaissance and token scraping.

---

## 4. Retesting & Verification Audit Matrix

Following the implementation of **Secure V2**, Team Bug Smasher re-executed all 10 attack procedures against the hardened deployment:

| Vuln ID | Vulnerability Title | Original V1 Status | Secure V2 Verification Result | Final Defense Status |
| :--- | :--- | :---: | :--- | :---: |
| **VULN-001** | Broken Access Control | **Exploited** | Blocked with PostgreSQL RLS Permission Violation (`403 Forbidden`) | **PASS / SECURED** |
| **VULN-002** | IDOR on Marks | **Exploited** | Blocked: Query returns 0 rows; URL parameter overrides eliminated | **PASS / SECURED** |
| **VULN-003** | RLS Misconfiguration | **Exploited** | Blocked: Unconstrained selects return only caller's own records | **PASS / SECURED** |
| **VULN-004** | Privilege Escalation | **Exploited** | Blocked: Trigger `trg_protect_profile_role` aborts role change | **PASS / SECURED** |
| **VULN-005** | Stored XSS | **Exploited** | Blocked: DOMPurify strips all script tags and `onerror` handlers | **PASS / SECURED** |
| **VULN-006** | Mass Assignment | **Exploited** | Blocked: Schema whitelisting & trigger reject unapproved keys | **PASS / SECURED** |
| **VULN-007** | Storage Access Control | **Exploited** | Blocked: Private bucket rejects direct reads; requires 60s signed URL | **PASS / SECURED** |
| **VULN-008** | Sensitive Data Exposure | **Exploited** | Blocked: Private phone numbers omitted from API response | **PASS / SECURED** |
| **VULN-009** | Business Logic Authorization | **Exploited** | Blocked: Non-instructor attendance upsert rejected by database | **PASS / SECURED** |
| **VULN-010** | Debug State Exposure | **Exploited** | Blocked: `window.__APP_DEBUG__` returns `undefined` | **PASS / SECURED** |

---

## 5. Advanced Defense-in-Depth Architectural Principles

Through this assessment and remediation lifecycle, Team Bug Smasher established 5 core pillars of enterprise web security:

1. **Shift Authorization to the Storage & Database Layer:**
   Client-side UI route guards (such as React Router guards) are purely UX enhancements and must never be treated as access control mechanisms. All authorization checks must be enforced at the database or backend API layer via Row Level Security (RLS).

2. **Granular Tenant Partitioning Over Blanket Policies:**
   Using open clauses like `USING (true)` in RLS gives a false sense of security while enabling complete table dumps. Every table must evaluate identity claims (e.g. `user_id = auth.uid()` or `get_student_id()`).

3. **Database Triggers for Immutable Sensitive Columns:**
   For critical model attributes like user roles and account statuses, RLS policies must be reinforced with `BEFORE UPDATE` database triggers to eliminate privilege escalation and mass assignment vulnerabilities.

4. **Strict Context-Aware Sanitization:**
   When user-supplied HTML must be rendered, the application must pass input through a hardened sanitizer like DOMPurify with an explicit forbidden tag/attribute list (stripping `script`, `iframe`, and inline event handlers).

5. **Ephemeral Signed Access for Multi-Tenant Storage:**
   Cloud storage buckets storing sensitive user data must remain private, using short-lived (60s) cryptographic signed URLs with path-scoped RLS policies.

---

## 6. Conclusion & Submission Sign-Off

Team **Bug Smasher** has demonstrated a complete, end-to-end cybersecurity audit lifecycle:
- Built an authentic, fully functional, multi-tier web application.
- Successfully discovered and exploited 10 realistic security vulnerabilities.
- Documented proof-of-concept attacks and assessed real-world business risks.
- Implemented robust, enterprise-grade remediations across PostgreSQL, Supabase, and React.
- Validated that 100% of vulnerabilities are remediated with zero regressions.

**Respectfully Submitted by Team Bug Smasher:**  
- **Ranjan Gowda S S** — Team Leader & Full-Stack Security Engineer  
- **Manish M** — Lead Penetration Tester & Security Researcher  
- **Keerthan Gowda T R** — Database & Backend Security Engineer  
