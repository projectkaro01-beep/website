import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CalendarCheck, Award, Bell, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Notice, Subject, AttendanceRecord, MarkRecord } from '../../types';

export const StudentDashboard: React.FC = () => {
  const { profile, studentRecord } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!studentRecord?.id) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch enrolled subjects
        const { data: enrollmentsData } = await supabase
          .from('enrollments')
          .select('subject:subjects(*, teacher:teachers(*, profile:profiles(*)))')
          .eq('student_id', studentRecord.id);

        const subList = (enrollmentsData || []).map((e: any) => e.subject).filter(Boolean);
        setSubjects(subList);

        // 2. Fetch attendance
        const { data: attData } = await supabase
          .from('attendance')
          .select('*, subject:subjects(*)')
          .eq('student_id', studentRecord.id)
          .order('date', { ascending: false });
        setAttendance((attData as AttendanceRecord[]) || []);

        // 3. Fetch marks
        const { data: marksData } = await supabase
          .from('marks')
          .select('*, subject:subjects(*)')
          .eq('student_id', studentRecord.id);
        setMarks((marksData as MarkRecord[]) || []);

        // 4. Fetch notices (targeted to all or student)
        const { data: noticesData } = await supabase
          .from('notices')
          .select('*, author:profiles(*)')
          .in('target_role', ['all', 'student'])
          .order('created_at', { ascending: false })
          .limit(5);
        setNotices((noticesData as Notice[]) || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [studentRecord]);

  if (loading) {
    return <LoadingSpinner message="Loading your student overview..." />;
  }

  // Calculate attendance percentage
  const totalClasses = attendance.length;
  const presentClasses = attendance.filter((a) => a.status === 'Present').length;
  const attendancePct = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 100;

  // Calculate average marks
  const totalMarksEarned = marks.reduce((acc, m) => acc + Number(m.score), 0);
  const totalMaxMarks = marks.reduce((acc, m) => acc + Number(m.max_score), 0);
  const avgMarksPct = totalMaxMarks > 0 ? Math.round((totalMarksEarned / totalMaxMarks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-xs mb-3">
              <span>{studentRecord?.department || 'Engineering'}</span>
              <span>•</span>
              <span>Semester {studentRecord?.semester || 1}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {profile?.full_name}!
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              Enrollment No: <span className="font-mono font-semibold">{studentRecord?.enrollment_no || 'N/A'}</span>
            </p>
          </div>
          <Link
            to="/student/profile"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-colors border border-white/20"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4 p-5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Enrolled Courses</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{subjects.length}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attendance</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{attendancePct}%</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Score</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{avgMarksPct}%</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Announcements</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{notices.length}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrolled Subjects List */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Enrolled Subjects"
            subtitle="Your current academic subjects and faculty"
            action={
              <Link to="/student/subjects" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {subjects.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                No subjects enrolled currently. Contact your administrator or advisor.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {subjects.slice(0, 4).map((sub) => (
                  <div key={sub.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {sub.code}
                        </span>
                        <h4 className="font-semibold text-sm text-slate-800">{sub.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Instructor: {sub.teacher?.profile?.full_name || 'Assigned Faculty'}
                      </p>
                    </div>
                    <Badge variant="primary" size="sm">Semester {sub.semester}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Marks */}
          <Card
            title="Recent Performance"
            subtitle="Recent graded assessments and exams"
            action={
              <Link to="/student/marks" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                All Marks <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {marks.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No marks recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {marks.slice(0, 4).map((mark) => (
                  <div key={mark.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{mark.subject?.name || 'Subject'}</p>
                      <p className="text-xs text-slate-500">{mark.exam_type} {mark.remarks && `• ${mark.remarks}`}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900">{mark.score} / {mark.max_score}</span>
                      <p className="text-[11px] text-emerald-600 font-semibold">
                        {Math.round((Number(mark.score) / Number(mark.max_score)) * 100)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Notices Sidebar */}
        <div>
          <Card
            title="Campus Bulletins"
            subtitle="Official announcements"
            action={
              <Link to="/student/notices" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                View Board
              </Link>
            }
          >
            {notices.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No active notices.</p>
            ) : (
              <div className="space-y-4">
                {notices.map((notice) => (
                  <div key={notice.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <Badge
                        variant={
                          notice.priority === 'urgent'
                            ? 'danger'
                            : notice.priority === 'normal'
                            ? 'primary'
                            : 'gray'
                        }
                        size="sm"
                      >
                        {notice.priority}
                      </Badge>
                      <span className="text-[11px] text-slate-400">
                        {new Date(notice.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h5 className="font-semibold text-sm text-slate-800">{notice.title}</h5>
                    {/* VULN-005 preview */}
                    <div
                      className="text-xs text-slate-600 mt-1 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: notice.content }}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
