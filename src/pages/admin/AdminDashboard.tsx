import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  Briefcase,
  BookOpen,
  CalendarCheck,
  Award,
  Bell,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalSubjects: 0,
    totalAttendance: 0,
    totalMarks: 0,
    totalNotices: 0,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [
          { count: uCount },
          { count: sCount },
          { count: tCount },
          { count: subCount },
          { count: aCount },
          { count: mCount },
          { count: nCount },
        ] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('students').select('id', { count: 'exact', head: true }),
          supabase.from('teachers').select('id', { count: 'exact', head: true }),
          supabase.from('subjects').select('id', { count: 'exact', head: true }),
          supabase.from('attendance').select('id', { count: 'exact', head: true }),
          supabase.from('marks').select('id', { count: 'exact', head: true }),
          supabase.from('notices').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          totalUsers: uCount || 0,
          totalStudents: sCount || 0,
          totalTeachers: tCount || 0,
          totalSubjects: subCount || 0,
          totalAttendance: aCount || 0,
          totalMarks: mCount || 0,
          totalNotices: nCount || 0,
        });

        const { data: usersData } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentUsers(usersData || []);
      } catch (err) {
        console.error('Error fetching admin statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading institution management metrics..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-xs mb-3 text-rose-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Administrative Oversight Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">System Administration</h1>
            <p className="text-slate-300 text-sm mt-1">
              Complete oversight across students, faculty, subjects, and institutional data
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/admin/users"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
            >
              Manage Users
            </Link>
            <Link
              to="/admin/subjects"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors border border-white/20"
            >
              Manage Courses
            </Link>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Students</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.totalStudents}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Teachers</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.totalTeachers}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Subjects</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.totalSubjects}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Total Users</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.totalUsers}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Nav Cards */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Administrative Modules</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/admin/students"
              className="p-5 bg-white rounded-xl border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-slate-900 mt-3 text-base">Student Management</h3>
              <p className="text-xs text-slate-500 mt-1">Manage student profiles, enrollments, and academic details.</p>
            </Link>

            <Link
              to="/admin/teachers"
              className="p-5 bg-white rounded-xl border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Briefcase className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-slate-900 mt-3 text-base">Faculty Directory</h3>
              <p className="text-xs text-slate-500 mt-1">Manage instructors, departments, and course assignments.</p>
            </Link>

            <Link
              to="/admin/subjects"
              className="p-5 bg-white rounded-xl border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-slate-900 mt-3 text-base">Course Curriculum</h3>
              <p className="text-xs text-slate-500 mt-1">Create courses, assign instructors, and configure semesters.</p>
            </Link>

            <Link
              to="/admin/users"
              className="p-5 bg-white rounded-xl border border-slate-200/80 hover:border-rose-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-slate-900 mt-3 text-base">User Roles & Access</h3>
              <p className="text-xs text-slate-500 mt-1">Supervise all registered user profiles and role privileges.</p>
            </Link>
          </div>
        </div>

        {/* Recent Registrations */}
        <div>
          <Card
            title="Recent Registrations"
            subtitle="Latest accounts in the database"
            action={
              <Link to="/admin/users" className="text-xs font-semibold text-rose-600 hover:text-rose-700">
                View All
              </Link>
            }
          >
            <div className="divide-y divide-slate-100">
              {recentUsers.map((u) => (
                <div key={u.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{u.full_name}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  <Badge
                    variant={
                      u.role === 'admin'
                        ? 'danger'
                        : u.role === 'teacher'
                        ? 'primary'
                        : 'success'
                    }
                    size="sm"
                  >
                    {u.role}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
