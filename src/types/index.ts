export type UserRole = 'student' | 'teacher' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Student {
  id: string;
  user_id: string;
  enrollment_no: string;
  department: string;
  semester: number;
  created_at?: string;
  profile?: Profile;
}

export interface Teacher {
  id: string;
  user_id: string;
  employee_id: string;
  department: string;
  designation: string;
  created_at?: string;
  profile?: Profile;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
  teacher_id?: string | null;
  teacher?: Teacher;
  created_at?: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  subject_id: string;
  enrolled_at?: string;
  student?: Student;
  subject?: Subject;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  subject_id: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late';
  marked_by?: string | null;
  created_at?: string;
  student?: Student;
  subject?: Subject;
}

export interface MarkRecord {
  id: string;
  student_id: string;
  subject_id: string;
  exam_type: 'Midterm' | 'Final' | 'Quiz' | 'Assignment';
  score: number;
  max_score: number;
  remarks?: string | null;
  created_at?: string;
  student?: Student;
  subject?: Subject;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  posted_by?: string | null;
  target_role: 'all' | 'student' | 'teacher';
  priority: 'low' | 'normal' | 'urgent';
  created_at: string;
  author?: Profile;
}

export interface DocumentRecord {
  id: string;
  title: string;
  file_path: string;
  file_size?: number | null;
  uploaded_by?: string;
  student_id?: string;
  created_at: string;
  student?: Student;
}
