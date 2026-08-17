import React, { useEffect, useState } from 'react';
import { Users, Search, Mail, Phone, BookOpen, GraduationCap, Building } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Student } from '../../types';

export const TeacherStudents: React.FC = () => {
  const { teacherRecord } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadStudents = async () => {
      if (!teacherRecord?.id) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch teacher subjects
        const { data: subs } = await supabase
          .from('subjects')
          .select('id')
          .eq('teacher_id', teacherRecord.id);

        const subIds = (subs || []).map((s) => s.id);

        // VULN-008: Fetching full profile metadata & contact details
        const { data: enrollmentsData } = await supabase
          .from('enrollments')
          .select('student:students(*, profile:profiles(*)), subject:subjects(name, code)')
          .in('subject_id', subIds);

        // Group by student
        const studentMap = new Map();
        (enrollmentsData || []).forEach((item: any) => {
          if (item.student) {
            const sid = item.student.id;
            if (!studentMap.has(sid)) {
              studentMap.set(sid, {
                ...item.student,
                enrolledCourses: [],
              });
            }
            if (item.subject) {
              studentMap.get(sid).enrolledCourses.push(item.subject);
            }
          }
        });

        setStudents(Array.from(studentMap.values()));
      } catch (err) {
        console.error('Error fetching students:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [teacherRecord]);

  const filteredStudents = students.filter((s) => {
    const query = search.toLowerCase();
    return (
      s.profile?.full_name?.toLowerCase().includes(query) ||
      s.enrollment_no?.toLowerCase().includes(query) ||
      s.profile?.email?.toLowerCase().includes(query) ||
      s.department?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return <LoadingSpinner message="Retrieving student rosters..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assigned Students Roster</h1>
          <p className="text-sm text-slate-500 mt-1">Students enrolled in courses under your instruction</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or enrollment..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <Card>
        {filteredStudents.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Students Found"
            description="No students are currently enrolled in your courses or match your search."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Enrollment No.</th>
                  <th className="px-4 py-3">Department & Sem</th>
                  <th className="px-4 py-3">Contact (Exposed)</th>
                  <th className="px-4 py-3">Enrolled Course</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{stu.profile?.full_name}</div>
                      <div className="text-xs text-slate-400 font-mono">ID: {stu.id}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-medium text-slate-700">
                      {stu.enrollment_no}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-slate-800">{stu.department}</span>
                      <span className="text-slate-400 block text-xs">Sem {stu.semester}</span>
                    </td>
                    {/* VULN-008 Sensitive Data Exposure in UI/API */}
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{stu.profile?.email}</span>
                      </div>
                      {stu.profile?.phone && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{stu.profile?.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {stu.enrolledCourses?.map((c: any, i: number) => (
                          <span key={i} className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {c.code}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
