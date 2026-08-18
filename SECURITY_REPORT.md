# Comprehensive Web Application Security Assessment & Penetration Testing Report

**Project**: EduPulse — Student Management System  
**Assessment Type**: Full-Stack Web Application Penetration Testing & Remediation  
**Scope**: React/TypeScript Frontend, Supabase PostgreSQL Database, Supabase Auth, Supabase Storage  
**Target Environment**: Authorized Hackathon Security Testing Environment  
**Report Version**: 1.0 (Final Security Audit & Remediation Deliverable)  

---

## 1. Executive Summary

During this security assessment, an authorized penetration test was performed against the **Student Management System (V1)** to discover, reproduce, and document vulnerabilities across the application, database, and cloud storage layers. 

A total of **10 unique vulnerabilities** were successfully identified and verified:
- **Critical Severity**: 1 finding
- **High Severity**: 7 findings
- **Medium Severity**: 2 findings

Following the testing phase, comprehensive **Phase 2 remediations** were engineered and implemented, transitioning the system to **Secure V2**. This document outlines the technical details of each finding, the attack mechanics, real-world security impacts, placeholder areas for captured screenshot evidence, and the specific hardening techniques used to prevent each attack.

---

## 2. Vulnerability Assessment Summary Matrix

| Vuln ID | Vulnerability Title | Category (OWASP Top 10) | Severity | Initial Status | Remediated Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VULN-001** | Client-Side Only Route & Action Guarding | A01:2021 — Broken Access Control | **High** | Exploited | **Fixed (Secure V2)** |
| **VULN-002** | Insecure Direct Object Reference (IDOR / BOLA) | A01:2021 — Broken Access Control | **High** | Exploited | **Fixed (Secure V2)** |
| **VULN-003** | PostgreSQL Row Level Security Misconfiguration | A05:2021 — Security Misconfiguration | **High** | Exploited | **Fixed (Secure V2)** |
| **VULN-004** | Privilege Escalation via Role Property Mutation | A01:2021 — Broken Access Control | **Critical** | Exploited | **Fixed (Secure V2)** |
| **VULN-005** | Stored Cross-Site Scripting (XSS) on Notice Board | A03:2021 — Injection (XSS) | **High** | Exploited | **Fixed (Secure V2)** |
| **VULN-006** | Mass Assignment / Unvalidated Parameter Binding | A08:2021 — Software & Data Integrity | **High** | Exploited | **Fixed (Secure V2)** |
| **VULN-007** | Storage Access Control & Cross-Tenant File Exposure | A01:2021 — Broken Access Control | **High** | Exploited | **Fixed (Secure V2)** |
| **VULN-008** | Sensitive Data Exposure in Roster / User Directory | A02:2021 — Cryptographic / Data Exposure | **Medium** | Exploited | **Fixed (Secure V2)** |
| **VULN-009** | Business Logic Authorization Failure (Attendance) | A04:2021 — Insecure Design | **High** | Exploited | **Fixed (Secure V2)** |
| **VULN-010** | Security Misconfiguration — Debug State Exposure | A05:2021 — Security Misconfiguration | **Medium** | Exploited | **Fixed (Secure V2)** |

---

## 3. Detailed Vulnerability Findings & Remediation Analysis

---

### VULN-001: Broken Access Control — Client-Side Only Route & Action Guarding

- **Vulnerability Category**: OWASP A01:2021 — Broken Access Control
- **Severity**: **HIGH** (CVSS: 8.1)
- **Affected Components**: Navigation Router (`ProtectedRoute.tsx`), Data Tables (`public.subjects`, `public.teachers`)
- **Attacker Persona**: Authenticated Student (`Student A`)
- **Target Asset**: Faculty & Administrative Course Data

#### 1. What We Attacked & How
We evaluated whether route protection was enforced exclusively in the React frontend (`ProtectedRoute`) or at the database layer. By executing direct Supabase PostgREST queries under the low-privileged Student session in the browser console, we bypassed UI route checks and directly queried and inserted administrative course records into `public.subjects`.

#### 2. What We Obtained (Attack Evidence)
The application accepted the direct API request with HTTP `200 OK`, returning full faculty rosters and successfully inserting a new academic subject (`TEST-AUDIT-101`) under the Student's session.

#### 3. Real-World Impact & Risk
- Allows unprivileged users to bypass UI permissions and perform administrative actions.
- Attackers can create phantom courses, delete curricula, or tamper with institutional configurations without having admin credentials.

#### 4. Proof of Concept & Screenshot Evidence
```
[ INSERT SCREENSHOT HERE: VULN-001-before.png ]
Description: Browser console showing student session successfully querying teacher directory and inserting records into public.subjects.
```

#### 5. How We Prevented It (Secure V2 Remediation)
- Defined PostgreSQL `SECURITY DEFINER` helper functions (`is_admin()`, `is_teacher()`).
- Replaced permissive policies with strict RLS policies on `public.subjects` allowing only verified administrators (`public.is_admin()`) to insert, update, or delete courses.

---

### VULN-002: Insecure Direct Object Reference (IDOR / BOLA) on Academic Marks

- **Vulnerability Category**: OWASP A01:2021 — Broken Access Control / API1:2023 BOLA
- **Severity**: **HIGH** (CVSS: 8.5)
- **Affected Components**: Marks Module (`/student/marks`, `StudentMarks.tsx`)
- **Attacker Persona**: Authenticated Student (`Student A`)
- **Target Asset**: Confidential Academic Marks of `Student B`

#### 1. What We Attacked & How
We tested the object-level authorization on the marks lookup component. By modifying the `?student_id=<UUID>` URL query parameter and submitting Student B's identifier into the lookup field, we requested academic grade reports belonging to another student.

#### 2. What We Obtained (Attack Evidence)
The application returned Student B's complete grade sheet, exam scores (Midterm, Final, Quizzes), percentages, and faculty remarks directly inside Student A's session.

#### 3. Real-World Impact & Risk
- Direct violation of student data confidentiality and privacy regulations (FERPA, GDPR).
- Any student can enumerate UUIDs and view the academic standing, scores, and private remarks of every enrolled peer.

#### 4. Proof of Concept & Screenshot Evidence
```
[ INSERT SCREENSHOT HERE: VULN-002-before.png ]
Description: Student Marks interface showing Student A logged in while displaying Student B's name, UUID, and academic grades.
```

#### 5. How We Prevented It (Secure V2 Remediation)
- Removed client-side identifier overriding in `StudentMarks.tsx` and strictly bound data retrieval to the authenticated user's `studentRecord.id`.
- Implemented row-ownership filtering in PostgreSQL RLS: `USING (student_id = public.get_student_id())`.

---

### VULN-003: PostgreSQL Row Level Security (RLS) Misconfiguration — Overly Permissive Policies

- **Vulnerability Category**: OWASP A05:2021 — Security Misconfiguration
- **Severity**: **HIGH** (CVSS: 8.2)
- **Affected Components**: PostgreSQL Database Tables (`public.marks`, `public.attendance`)
- **Attacker Persona**: Authenticated Student (`Student A`)
- **Target Asset**: Entire Institution Evaluation and Attendance Database

#### 1. What We Attacked & How
We audited the PostgreSQL RLS policy configuration. The tables had RLS enabled, but the policy was defined as `FOR SELECT TO authenticated USING (true)`. We executed an unconstrained `SELECT *` query against `public.marks` and `public.attendance` from the Student console.

#### 2. What We Obtained (Attack Evidence)
The database returned an array containing every single mark and attendance log across all students and courses in the institution.

#### 3. Real-World Impact & Risk
- Enables full bulk database exfiltration via standard API endpoints.
- Completely defeats multi-tenant isolation, exposing all institutional data to any valid login.

#### 4. Proof of Concept & Screenshot Evidence
```
[ INSERT SCREENSHOT HERE: VULN-003-before.png ]
Description: Console output showing console.table dumping marks and attendance records across all students.
```

#### 5. How We Prevented It (Secure V2 Remediation)
- Dropped all open `USING (true)` policies in [`supabase/secure_schema.sql`](file:///c:/Users/manis/OneDrive/Desktop/hackathon/supabase/secure_schema.sql).
- Configured scoped policies ensuring students only receive rows where `student_id = public.get_student_id()`, while teachers only receive rows for subjects they instruct.

---

### VULN-004: Privilege Escalation — Unauthorized Role Field Mutation

- **Vulnerability Category**: OWASP A01:2021 — Broken Access Control / Privilege Escalation
- **Severity**: **CRITICAL** (CVSS: 9.8)
- **Affected Components**: User Profiles (`public.profiles`, `StudentProfile.tsx`)
- **Attacker Persona**: Authenticated Student (`Student A`)
- **Target Asset**: Full Administrator Access (`role: 'admin'`)

#### 1. What We Attacked & How
We audited whether a user could modify protected authorization fields. In the browser console, we issued a direct Supabase update query against `public.profiles` modifying our own account with `{ role: 'admin' }` and refreshed the application.

#### 2. What We Obtained (Attack Evidence)
The database accepted the update with HTTP `200 OK`. Upon refreshing the application, the session re-hydrated with super-admin privileges, dynamically unlocking the full **ADMIN PORTAL** navigation and administrative CRUD operations.

#### 3. Real-World Impact & Risk
- **Total system compromise**. Any registered student or untrusted user can instantly grant themselves full administrative control over the entire system.

#### 4. Proof of Concept & Screenshot Evidence
```
[ INSERT SCREENSHOT HERE: VULN-004-before.png ]
Description: Console showing { role: 'admin' } update result and UI displaying the Admin role badge and Admin Portal sidebar for the student account.
```

#### 5. How We Prevented It (Secure V2 Remediation)
- Created the PostgreSQL trigger `trg_protect_profile_role` that fires `BEFORE UPDATE ON public.profiles` and raises a database exception if any non-admin attempts to modify the `role` column.

---

### VULN-005: Stored Cross-Site Scripting (XSS) on Notice Board

- **Vulnerability Category**: OWASP A03:2021 — Injection (XSS)
- **Severity**: **HIGH** (CVSS: 8.3)
- **Affected Components**: Notice Board (`StudentNotices.tsx`, `StudentDashboard.tsx`)
- **Attacker Persona**: Notice Author (`Teacher` or `Admin`)
- **Target Asset**: Victim Browser Sessions (Students / Faculty)

#### 1. What We Attacked & How
We tested user-controlled input rendering on the campus notice board. We posted a bulletin containing HTML markup with an embedded JavaScript payload:
```html
<img src="invalid-trigger" onerror="alert('VULN-005: Stored XSS Executed on ' + document.domain);" />
```
We then logged in as Student A and navigated to `/student/notices`.

#### 2. What We Obtained (Attack Evidence)
The unescaped `dangerouslySetInnerHTML` directive parsed the payload into the DOM, immediately triggering the `onerror` event and executing JavaScript in the victim's browser context.

#### 3. Real-World Impact & Risk
- Session hijacking: Attackers can extract authentication tokens from browser storage.
- UI Redirection & Defacement: Malicious actors can redirect students to phishing portals or force administrative actions on behalf of viewing users.

#### 4. Proof of Concept & Screenshot Evidence
```
[ INSERT SCREENSHOT HERE: VULN-005-before.png ]
Description: Browser alert dialog popping up on the Student Notice Board displaying document.domain.
```

#### 5. How We Prevented It (Secure V2 Remediation)
- Integrated `dompurify` in all notice rendering components ([`StudentNotices.tsx`](file:///c:/Users/manis/OneDrive/Desktop/hackathon/src/pages/student/StudentNotices.tsx), [`StudentDashboard.tsx`](file:///c:/Users/manis/OneDrive/Desktop/hackathon/src/pages/student/StudentDashboard.tsx), etc.).
- Wrapped content rendering in `DOMPurify.sanitize(notice.content)` with strict tag and attribute forbidden lists (`script`, `onerror`, `onclick`, `iframe`).

---

### VULN-006: Mass Assignment / Unvalidated Parameter Binding

- **Vulnerability Category**: OWASP A08:2021 — Software & Data Integrity Failures
- **Severity**: **HIGH** (CVSS: 7.5)
- **Affected Components**: Profile Settings (`StudentProfile.tsx`, `public.profiles`)
- **Attacker Persona**: Authenticated Student (`Student A`)
- **Target Asset**: Backend Data Model & Internal Attributes

#### 1. What We Attacked & How
We tested whether the profile update handler performed schema validation and column whitelisting. We submitted an object payload bundling non-form attributes (`role: 'teacher'`, `avatar_url`, custom timestamps) directly to the database update method.

#### 2. What We Obtained (Attack Evidence)
The backend accepted and bound all unwhitelisted properties simultaneously into the database record without filtering or schema rejection.

#### 3. Real-World Impact & Risk
- Attackers can overwrite sensitive internal properties (account verification flags, timestamps, permission levels) that were never intended to be client-editable.

#### 4. Proof of Concept & Screenshot Evidence
```
[ INSERT SCREENSHOT HERE: VULN-006-before.png ]
Description: DevTools console showing mass assignment payload containing extra properties accepted by the database update query.
```

#### 5. How We Prevented It (Secure V2 Remediation)
- Updated `StudentProfile.tsx` to explicitly construct a strict whitelist payload containing only `full_name` and `phone`.
- Combined with database-level trigger protection to prevent unauthorized column tampering.

---

### VULN-007: Storage Access Control & Cross-Tenant File Exposure

- **Vulnerability Category**: OWASP A01:2021 — Broken Access Control
- **Severity**: **HIGH** (CVSS: 7.9)
- **Affected Components**: Supabase Storage (`student-documents` bucket, `StudentDocuments.tsx`)
- **Attacker Persona**: Authenticated Student (`Student B`) or Unauthenticated User
- **Target Asset**: Confidential Verification Documents Uploaded by `Student A`

#### 1. What We Attacked & How
We tested access controls on uploaded student files. Student A uploaded a test document. Student B queried the document registry, extracted Student A's storage path, and accessed the generated public object URL in an unauthenticated Incognito window.

#### 2. What We Obtained (Attack Evidence)
The storage server served Student A's document with HTTP `200 OK` directly to an unauthenticated third party without requiring authentication or signed authorization tokens.

#### 3. Real-World Impact & Risk
- Total exposure of sensitive documents (identification cards, certificates, assignments, medical records) uploaded by all students.

#### 4. Proof of Concept & Screenshot Evidence
```
[ INSERT SCREENSHOT HERE: VULN-007-before.png ]
Description: Storage Explorer showing Student B accessing Student A's storage file path, with an adjacent tab downloading the file publicly.
```

#### 5. How We Prevented It (Secure V2 Remediation)
- Set storage bucket `student-documents` to **Private** (`public = false`).
- Applied Storage RLS restricting upload and read access strictly to paths prefixed with the user's `auth.uid()`.
- Implemented temporary, short-lived (60-second) Signed URLs via `supabase.storage.createSignedUrl()` in `StudentDocuments.tsx`.

---

### VULN-008: Sensitive Data Exposure in Roster & Directory Queries

- **Vulnerability Category**: OWASP A02:2021 — Sensitive Data Exposure / Broken Object Property Level Authorization
- **Severity**: **MEDIUM** (CVSS: 5.3)
- **Affected Components**: Assigned Students Roster (`TeacherStudents.tsx`, `public.profiles`)
- **Attacker Persona**: Authenticated Teacher / Student
- **Target Asset**: Personal Identifiable Information (PII) of Students

#### 1. What We Attacked & How
We inspected the network requests made when viewing the course roster. The query used wildcard selectors (`students(*, profile:profiles(*))`), fetching complete profile structures.

#### 2. What We Obtained (Attack Evidence)
The API response returned internal user UUIDs, personal phone numbers, and creation timestamps for all enrolled students, displaying private contact numbers in the directory table.

#### 3. Real-World Impact & Risk
- Violates data minimization principles (GDPR Article 5).
- Exposes private contact numbers of students to unauthorized parties, increasing the risk of social engineering and harassment.

#### 4. Proof of Concept & Screenshot Evidence
```
[ INSERT SCREENSHOT HERE: VULN-008-before.png ]
Description: Network tab and table showing full student records including private phone numbers and internal UUIDs returned in the response payload.
```

#### 5. How We Prevented It (Secure V2 Remediation)
- Applied data minimization in `TeacherStudents.tsx` by explicitly querying only required directory fields (`full_name`, `email`, `enrollment_no`, `department`, `semester`) and excluding private phone numbers and raw UUIDs.

---

### VULN-009: Business Logic Authorization Failure — Client-Side Attendance Modification

- **Vulnerability Category**: OWASP A04:2021 — Insecure Design / Broken Access Control
- **Severity**: **HIGH** (CVSS: 7.7)
- **Affected Components**: Attendance Workflow (`public.attendance`, `TeacherAttendance.tsx`)
- **Attacker Persona**: Authenticated Student (`Student A`)
- **Target Asset**: Academic Attendance Records

#### 1. What We Attacked & How
We evaluated whether business logic restrictions were enforced at the database level. Attendance marking is an instructor-only capability. Under a Student session, we executed a direct `upsert` call on `public.attendance` to mark Student A as `Present` for an enrolled subject.

#### 2. What We Obtained (Attack Evidence)
The database accepted the operation with HTTP `200 OK`. Upon refreshing `/student/attendance`, the record reflected `Present` and the student's attendance percentage increased accordingly.

#### 3. Real-World Impact & Risk
- Complete subversion of academic attendance tracking. Students can self-certify attendance, bypass minimum attendance eligibility criteria, and overwrite faculty records.

#### 4. Proof of Concept & Screenshot Evidence
```
[ INSERT SCREENSHOT HERE: VULN-009-before.png ]
Description: Console showing student session executing attendance upsert returning { status: 'Present' }, and UI reflecting updated attendance percentage.
```

#### 5. How We Prevented It (Secure V2 Remediation)
- Enforced PostgreSQL RLS policy `attendance_modify_policy` requiring that the modifying user must either be an administrator or the specific faculty member assigned to that course (`subject_id IN (SELECT id FROM public.subjects WHERE teacher_id = public.get_teacher_id())`).

---

### VULN-010: Security Misconfiguration — Global Debug Object & Client State Exposure

- **Vulnerability Category**: OWASP A05:2021 — Security Misconfiguration
- **Severity**: **MEDIUM** (CVSS: 4.8)
- **Affected Components**: Global Client State (`src/lib/supabase.ts`)
- **Attacker Persona**: Anonymous Visitor / Any User
- **Target Asset**: Client Runtime Environment & Active Session State

#### 1. What We Attacked & How
We inspected the global browser environment (`window`) for residual development harnesses. We accessed `window.__APP_DEBUG__` from the console and invoked its introspection utilities.

#### 2. What We Obtained (Attack Evidence)
The global object exposed internal build details, backend endpoints, active Supabase client instances, and helper functions capable of extracting active authentication session tokens.

#### 3. Real-World Impact & Risk
- Provides attackers with immediate reconnaissance data and client handles to facilitate automated API scripting and session token extraction.

#### 4. Proof of Concept & Screenshot Evidence
```
[ INSERT SCREENSHOT HERE: VULN-010-before.png ]
Description: Browser console displaying the expanded window.__APP_DEBUG__ object showing configuration details and session extraction methods.
```

#### 5. How We Prevented It (Secure V2 Remediation)
- Removed all debug harnesses, diagnostic objects, and global client attachments from [`src/lib/supabase.ts`](file:///c:/Users/manis/OneDrive/Desktop/hackathon/src/lib/supabase.ts).

---

## 4. Remediation Verification Summary

All remediations were validated through automated build tests (`npm run build` passing with 0 errors) and re-testing of attack procedures:

| Vulnerability ID | Vulnerability Name | V1 Exploit Status | Secure V2 Retest Result |
| :--- | :--- | :--- | :--- |
| **VULN-001** | Broken Access Control | **Vulnerable** | **Blocked** (403 Forbidden / RLS Policy Violation) |
| **VULN-002** | IDOR / BOLA | **Vulnerable** | **Blocked** (0 Rows returned for cross-student lookups) |
| **VULN-003** | RLS Misconfiguration | **Vulnerable** | **Blocked** (Queries strictly scoped to authenticated user) |
| **VULN-004** | Privilege Escalation | **Vulnerable** | **Blocked** (Database trigger raises Unauthorized Exception) |
| **VULN-005** | Stored XSS | **Vulnerable** | **Blocked** (DOMPurify strips all script/event handlers) |
| **VULN-006** | Mass Assignment | **Vulnerable** | **Blocked** (Field whitelisting & trigger enforcement) |
| **VULN-007** | Storage Access Control | **Vulnerable** | **Blocked** (Private bucket + 60s scoped signed URLs) |
| **VULN-008** | Sensitive Data Exposure | **Vulnerable** | **Blocked** (Data minimization applied to query projections) |
| **VULN-009** | Business Logic Authorization | **Vulnerable** | **Blocked** (RLS rejects non-instructor attendance writes) |
| **VULN-010** | Security Misconfiguration | **Vulnerable** | **Blocked** (`window.__APP_DEBUG__` is `undefined`) |

---

## 5. Conclusion & Recommendations

The application has successfully undergone a complete security lifecycle:
1. **Design & Build**: A functional, multi-role Student Management System was constructed with authentic Supabase Auth, PostgreSQL, and Storage.
2. **Authorized Penetration Testing**: All 10 controlled vulnerabilities were verified, executed, and documented with attack evidence.
3. **Hardening & Remediation**: The application was hardened to **Secure V2** by implementing defense-in-depth measures across the database schema, PostgreSQL triggers, Row Level Security, input sanitization, and storage scoping.

The codebase is now fully secured against the identified attack vectors and ready for presentation and evaluation.
