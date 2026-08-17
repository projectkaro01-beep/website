import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, CalendarCheck, Award, Bell, Plus, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Subject, Notice } from '../../types';

export const TeacherDashboard: React.FC = () => {
  const { profile, teacherRecord } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeacherData = async () => {
      if (!teacherRecord?.id) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch assigned subjects
        const { data: subs } = await supabase
          .from('subjects')
          .select('*')
          .eq('teacher_id', teacherRecord.id);

        const subList = (subs as Subject[]) || [];
        setSubjects(subList);

        // 2. Fetch enrolled students count
        if (subList.length > 0) {
          const subIds = subList.map((s) => s.id);
          const { count } = await supabase
            .from('enrollments')
            .select('id', { count: 'exact', head: true })
            .in('subject_id', subIds);

          setTotalStudents(count || 0);
        }

        // 3. Fetch recent notices
        const { data: noticeData } = await supabase
          .from('notices')
          .select('*, author:profiles(*)')
          .order('created_at', { ascending: false })
          .limit(4);

        setNotices((noticeData as Notice[]) || []);
      } catch (err) {
        console.error('Error loading teacher dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTeacherData();
  }, [teacherRecord]);

  if (loading) {
    return <LoadingSpinner message="Loading faculty portal..." />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-xs mb-3 text-indigo-200">
              <span>{teacherRecord?.designation || 'Faculty'}</span>
              <span>•</span>
              <span>{teacherRecord?.department || 'Engineering'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome, Prof. {profile?.full_name}
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              Employee ID: <span className="font-mono font-semibold text-white">{teacherRecord?.employee_id || 'N/A'}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/teacher/attendance"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
            >
              Mark Attendance
            </Link>
            <Link
              to="/teacher/marks"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors border border-white/20"
            >
              Grade Students
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4 p-5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Courses</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{subjects.length}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Enrolled Students</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalStudents}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Bulletins</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{notices.length}</p>
          </div>
        </Card>
      </div>

      {/* Courses and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="My Allocated Subjects"
            subtitle="Courses assigned to your instruction"
            action={
              <Link to="/teacher/students" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Student Roster <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {subjects.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                No subjects assigned yet. The Administrator can assign subjects from the admin portal.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {subjects.map((sub) => (
                  <div key={sub.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {sub.code}
                        </span>
                        <h4 className="font-semibold text-sm text-slate-800">{sub.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{sub.department} • Semester {sub.semester}</p>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        to={`/teacher/attendance?subject_id=${sub.id}`}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        Attendance
                      </Link>
                      <Link
                        to={`/teacher/marks?subject_id=${sub.id}`}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                      >
                        Marks
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Notices */}
        <div>
          <Card
            title="Department Notices"
            action={
              <Link to="/teacher/notices" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                Post Notice
              </Link>
            }
          >
            {notices.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No notices posted.</p>
            ) : (
              <div className="space-y-3">
                {notices.map((n) => (
                  <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <Badge variant="primary" size="sm">{n.priority}</Badge>
                      <span>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <h5 className="font-semibold text-sm text-slate-800">{n.title}</h5>
                    <div
                      className="text-xs text-slate-600 mt-1 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: n.content }}
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
