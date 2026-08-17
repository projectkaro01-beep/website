# EduPulse — Student Management System (Vulnerable V1)

A full-stack Student Management System built for cybersecurity and web application security penetration testing hackathons.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, React Router v6
- **Backend & Database**: Supabase PostgreSQL, Supabase Authentication, Supabase Storage (`student-documents`)

---

## 🚀 Quick Setup Instructions

### 1. Supabase Project Setup
1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard.
3. Open [`supabase/schema.sql`](file:///c:/Users/manis/OneDrive/Desktop/hackathon/supabase/schema.sql), copy the entire SQL script, paste it into the Supabase SQL Editor, and click **Run**.
4. (Optional / Auto-configured) In **Storage**, ensure the bucket `student-documents` is present and public.
5. In **Authentication -> Providers -> Email**, disable "Confirm email" if you want instant test account activation without waiting for confirmation emails.

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase project URL and public Anon Key:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
```

### 3. Run Locally
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 👥 Creating Test Accounts
Create real test accounts through the `/signup` screen:
1. **Admin Account**: Select role **Admin**, register with e.g. `admin@institution.edu`.
2. **Teacher Account**: Select role **Teacher**, enter Employee ID (e.g. `EMP-101`), designation, and department.
3. **Student A Account**: Select role **Student**, enter Enrollment No (e.g. `STU-001`), department, semester.
4. **Student B Account**: Select role **Student**, enter Enrollment No (e.g. `STU-002`), department, semester.

---

## 🎯 Application Modules

### 👨‍🎓 Student Module (`/student/*`)
- **Dashboard**: Enrolled courses overview, attendance percentages, latest notices.
- **My Profile**: View and update contact information.
- **My Subjects**: View enrolled academic courses and register for new courses.
- **My Attendance**: Course-wise attendance breakdowns and session logs.
- **My Marks**: Graded evaluations, quiz scores, and IDOR query lookup.
- **Notice Board**: Campus notices and announcements.
- **Documents**: File upload to Supabase Storage and file listing.

### 👩‍🏫 Teacher Module (`/teacher/*`)
- **Dashboard**: Allocated courses load and quick action metrics.
- **Faculty Profile**: Department, designation, and contact details.
- **Assigned Students**: Complete roster of enrolled students.
- **Manage Attendance**: Daily attendance marking per subject/date.
- **Manage Marks**: Input and edit student scores for Midterms, Finals, Quizzes, and Assignments.
- **Notices**: Publish announcements with formatting for students.

### 🛡 Admin Module (`/admin/*`)
- **Dashboard**: Campus-wide metrics and total user statistics.
- **Student Management**: Full CRUD for student directory.
- **Faculty Directory**: Full CRUD for instructors and departments.
- **Course Curriculum**: Create courses, assign instructors, configure semesters.
- **Attendance Oversight**: Institution-wide attendance monitoring.
- **Marks Ledger**: Institution-wide grade oversight.
- **Broadcast Notices**: System-wide notice announcements.
- **User Roles & Access**: Role elevation and user account management.

---

## ⚠️ Controlled Intentional Vulnerability Matrix (V1)

1. **VULN-001**: Broken Access Control (Client-side routing / API privilege boundary)
2. **VULN-002**: IDOR / BOLA (Direct student_id parameter lookup on Marks)
3. **VULN-003**: Supabase RLS Misconfiguration (Overly permissive table access policies)
4. **VULN-004**: Privilege Escalation (Profile update accepting role modifications)
5. **VULN-005**: Stored XSS (Raw HTML notice board rendering)
6. **VULN-006**: Mass Assignment (Direct unvalidated profile update payloads)
7. **VULN-007**: Storage Access Control (Direct storage object access across students)
8. **VULN-008**: Sensitive Data Exposure (Over-fetching contact & internal UUIDs in student rosters)
9. **VULN-009**: Business Logic Authorization (Attendance modification authorization)
10. **VULN-010**: Security Misconfiguration (Global window debug state and verbose logging)
