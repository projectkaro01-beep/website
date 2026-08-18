# 🎓 EduPulse — Full-Stack Student Management & Security Hardened Platform

> **A modern, enterprise-grade Student Management System featuring real multi-role authentication, secure cloud storage buckets, complete academic management workflows, and a full-scope security audit & remediation journey (from Vulnerable V1 to Hardened V2).**

---

## 🌟 Executive Overview

**EduPulse** is a responsive, multi-role academic management platform built using **React 19**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL, Auth, & Storage)**. 

Beyond delivering full institutional management for **Students**, **Teachers**, and **Administrators**, EduPulse serves as a benchmark security case study: discovering, demonstrating, and remediating **10 OWASP Top 10 vulnerabilities** with database Row-Level Security (RLS), input sanitization, and cryptographically isolated multi-tenant cloud storage.

---

## 🚀 Key Functional Capabilities

### 🔐 1. Real Multi-Role Authentication & Session Management
- **Supabase Auth Engine**: Real JWT-backed email/password authentication and password recovery workflows.
- **Dynamic Role Syncing**: Automated profile generation and relational mapping across `profiles`, `students`, and `teachers` database tables.
- **Client & Database Boundary Protection**: Multi-tier authentication guards that protect React routes (`ProtectedRoute`) combined with PostgreSQL database-level authorization policies.

---

### 📦 2. Fully Functional Website Cloud Storage System
- **Dedicated Storage Bucket**: Integrated with Supabase Storage (`student-documents` bucket) for handling academic files, assignments, receipts, and identity proofs.
- **Multi-Tenant Path Namespacing**: Files are stored under cryptographic paths (`{user_id}/{timestamp}_{filename}`) preventing tenant overlap and unauthorized file collisions.
- **Full File Lifecycle**: Drag-and-drop file uploads, real-time file size & type tracking, secure download link generation, and database-synchronized file deletion.

---

### 👥 3. Comprehensive Multi-Role Feature Modules

```
                    ┌────────────────────────┐
                    │    EduPulse Platform   │
                    └───────────┬────────────┘
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Student Portal  │  │  Teacher Portal  │  │   Admin Portal   │
│  (/student/*)    │  │  (/teacher/*)    │  │   (/admin/*)     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

#### 👨‍🎓 **Student Portal (`/student/*`)**
- **Unified Dashboard**: Quick view of enrolled courses, live overall attendance percentage, recent grade postings, and institution announcements.
- **My Profile**: View and update verified personal and contact details with strict field validation.
- **Academic Subjects & Registration**: Browse department curricula and enroll in available semester courses.
- **Attendance Tracker**: Subject-wise percentage breakdown with visual status pills (Present, Absent, Late, Excused) and session logs.
- **Grade Sheet & Marks Ledger**: Breakdown of Midterm, Final Exam, Quiz, and Assignment scores with GPA and faculty remarks.
- **Campus Notice Board**: Real-time broadcast notices with category tags (Academic, Exam, Events, Urgent).
- **Document Vault**: Upload, view, download, and delete academic documents powered by Supabase Cloud Storage.

#### 👩‍🏫 **Teacher Portal (`/teacher/*`)**
- **Faculty Dashboard**: Active course allocations, total student counts, and class schedule metrics.
- **Assigned Student Rosters**: Live directory of enrolled students per allocated subject with academic details.
- **Attendance Management**: Daily class attendance logger supporting single-click status updates (`Present`, `Absent`, `Late`, `Excused`) for specific subjects and session dates.
- **Marks & Grading Center**: Real-time score entry for Midterms, Finals, Quizzes, and Assignments with automatic percentage calculation and custom faculty remarks.
- **Announcements Publisher**: Create and publish department or campus-wide announcements.

#### 🛡️ **Administrator Portal (`/admin/*`)**
- **Institution Analytics Dashboard**: Global metrics showing total enrolled students, active faculty members, registered courses, and system health.
- **Student Directory Management**: Full CRUD operations for student records, enrollment numbers, departments, and active statuses.
- **Faculty Directory Management**: Manage teachers, employee IDs, designations, and department mappings.
- **Curriculum & Course Scheduling**: Add, edit, or archive courses, configure semester requirements, credit hours, and assign instructors.
- **Attendance & Grade Ledger Oversight**: Institution-wide monitoring of student attendance trends and final academic grades.
- **System Broadcasts**: Publish system-wide announcements.
- **Role & Access Governance**: Promote, update, or manage user roles and account permissions.

---

## 🔍 What We Found Out (Vulnerability Assessment & Pentest Findings)

During the authorized security audit of the initial application (V1), we uncovered **10 critical security misconfigurations and implementation flaws** across the OWASP Top 10 categories:

| Vuln ID | Title | OWASP Category | Initial Severity | Finding Summary |
| :--- | :--- | :--- | :---: | :--- |
| **VULN-001** | Client-Side Only Route Guarding | A01: Broken Access Control | **High** | UI routes were protected via React components, but Supabase database tables lacked strict RLS, allowing students to query or alter teacher and subject tables via API calls. |
| **VULN-002** | Insecure Direct Object Reference (IDOR) | A01: Broken Access Control | **High** | The marks lookup component accepted arbitrary `student_id` query parameters, allowing any student to view private grades of other students. |
| **VULN-003** | Permissive Row Level Security (RLS) | A05: Security Misconfiguration | **High** | Database policies were set to `true` for public roles, failing to enforce session ownership or role validation. |
| **VULN-004** | Role Mutation Privilege Escalation | A01: Broken Access Control | **Critical** | Profile update API calls accepted unvalidated `role` parameters, allowing a student to elevate their own account to `admin`. |
| **VULN-005** | Stored Cross-Site Scripting (XSS) | A03: Injection | **High** | Notice descriptions were rendered using raw unescaped HTML, allowing attackers to inject malicious JavaScript into campus notices. |
| **VULN-006** | Mass Assignment Vulnerability | A08: Software & Data Integrity | **High** | Profiles and student records accepted bulk JSON payloads without field whitelisting, permitting unauthorized field tampering. |
| **VULN-007** | Storage Bucket Cross-Tenant Exposure | A01: Broken Access Control | **High** | Uploaded documents in Supabase Storage were saved in a flat public namespace without folder ownership restrictions, allowing unauthorized document access and deletion. |
| **VULN-008** | Sensitive Data Exposure in Rosters | A02: Cryptographic / Data Exposure | **Medium** | Student and teacher listings returned full internal UUIDs, personal phone numbers, and private contact info across unprivileged roles. |
| **VULN-009** | Business Logic Flaw on Attendance | A04: Insecure Design | **High** | Students could directly forge attendance records or alter past dates due to missing backend authorization checks on attendance tables. |
| **VULN-010** | Verbose Debug & Global State Exposure | A05: Security Misconfiguration | **Medium** | Client-side console debugging tools exposed session auth states, Supabase references, and database schemas in the `window` object. |

---

## 🛠️ What We Solved (Hardened V2 Architecture & Remediations)

We implemented an end-to-end security hardening protocol transforming the application into **Secure V2**:

### 1. Robust PostgreSQL Row-Level Security (RLS) & Helper Functions
- Implemented PostgreSQL `SECURITY DEFINER` helper functions (`is_admin()`, `is_teacher()`, `get_auth_student_id()`) that run with elevated checks at the database layer.
- Strict RLS policies restrict users strictly to records where `auth.uid() = user_id` or role-based assignments match.

### 2. Elimination of IDOR / BOLA Vulnerabilities
- Enforced database-level ownership constraints on `marks`, `attendance`, `enrollments`, and `documents`.
- Stripped client-side ID overrides in frontend queries, binding lookups exclusively to the verified auth session ID.

### 3. Privilege Escalation & Mass Assignment Defense
- Locked down `profiles.role` column modification; role changes can only be executed through dedicated administrative functions.
- Implemented strict payload whitelisting across all update forms (`first_name`, `last_name`, `phone_number` only).

### 4. Zero-Trust Storage Bucket Isolation (Fixing VULN-007)
- Partitioned storage paths under authenticated user UUIDs (`(storage.foldername(name))[1] = auth.uid()::text`).
- Applied storage RLS policies ensuring users can only read, write, and delete files within their own namespace.

### 5. Stored XSS Mitigation via DOMPurify (Fixing VULN-005)
- Integrated `DOMPurify` HTML sanitization pipelines across all notice rendering components to neutralize script injections, malicious `<iframe>` tags, and `javascript:` URIs.

### 6. Production Hardening & Exposure Elimination
- Removed all debug helper variables from `window`.
- Restricted API response schemas to prevent sensitive user information leakage.

---

## 💻 Tech Stack & Architecture

- **Frontend Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/), [Lucide React Icons](https://lucide.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Security & Sanitization**: [DOMPurify](https://github.com/cure53/DOMPurify)
- **Backend-as-a-Service**: [Supabase](https://supabase.com/)
  - **Database**: PostgreSQL with Row-Level Security (RLS) & Triggers
  - **Authentication**: Supabase Auth (JWT session management)
  - **Storage**: Supabase Object Storage (Bucket: `student-documents`)

---

## ⚙️ Installation & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/hackathon.git
cd hackathon
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
Create a `.env` file in the root directory (based on `.env.example`):
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Initialize the Database Schema & Storage
1. Open your [Supabase Dashboard](https://supabase.com/dashboard) and navigate to the **SQL Editor**.
2. Copy and run the contents of [`supabase/schema.sql`](./supabase/schema.sql) to create all tables, indexes, RLS policies, and triggers.
3. In **Storage**, verify that the `student-documents` bucket is created.
4. Under **Authentication > Providers > Email**, you can disable *Confirm email* for rapid local test account creation.

### 5. Run the Application
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Testing User Personas

You can create test accounts directly via the `/signup` screen:

| Role | Suggested Email | Required Fields |
| :--- | :--- | :--- |
| **Admin** | `admin@institution.edu` | Full Name, Email, Password |
| **Teacher** | `teacher.smith@institution.edu` | Employee ID (`EMP-101`), Designation (`Senior Professor`), Department (`Computer Science`) |
| **Student 1** | `student1@institution.edu` | Enrollment No (`STU-2024-001`), Department (`Computer Science`), Semester (`4`) |
| **Student 2** | `student2@institution.edu` | Enrollment No (`STU-2024-002`), Department (`Computer Science`), Semester (`4`) |

---

## 📁 Project Structure

```
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components (Navbar, Sidebar, Modal, Card, Button)
│   ├── context/            # AuthContext (real Supabase session management & role state)
│   ├── lib/                # Supabase client initialization
│   ├── pages/
│   │   ├── admin/          # Admin portal pages (Dashboard, Students, Teachers, Subjects, Users)
│   │   ├── auth/           # Login, Signup, Password Reset pages
│   │   ├── student/        # Student portal pages (Dashboard, Profile, Marks, Attendance, Documents)
│   │   └── teacher/        # Teacher portal pages (Dashboard, Marks, Attendance, Notices)
│   ├── types/              # TypeScript interface definitions
│   ├── App.tsx             # Route definitions & Role-based access guards
│   └── main.tsx            # Application entry point
├── supabase/
│   └── schema.sql          # Complete PostgreSQL schema, RLS policies, functions & triggers
├── SECURITY_REPORT.md      # Comprehensive Penetration Testing & Vulnerability Audit Report
├── package.json
└── README.md
```

---

## 🏆 Hackathon Achievements & Key Takeaways

1. **Production-Grade Full-Stack Implementation**: Delivered a functional, intuitive, multi-role academic portal with responsive UI and real-time database syncing.
2. **True Cloud Multi-Tenancy**: Built real cloud storage document management with secure user-isolated namespaces.
3. **Rigorous Security Verification**: Proved that frontend route protection alone is insufficient; demonstrated 10 OWASP exploits and implemented defense-in-depth security with PostgreSQL RLS and strict authorization boundaries.
