import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarCheck, Save, CheckCircle2, AlertCircle, Users, Check, X, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Subject, Student } from '../../types';

export const TeacherAttendance: React.FC = () => {
  const { teacherRecord } = useAuth();
  const [searchParams] = useSearchParams();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<string, 'Present' | 'Absent' | 'Late'>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Load allocated subjects
  useEffect(() => {
    const loadSubjects = async () => {
      if (!teacherRecord?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data: subs } = await supabase
          .from('subjects')
          .select('*')
          .eq('teacher_id', teacherRecord.id);

        const subList = (subs as Subject[]) || [];
        setSubjects(subList);

        const paramSubId = searchParams.get('subject_id');
        if (paramSubId && subList.some((s) => s.id === paramSubId)) {
          setSelectedSubjectId(paramSubId);
        } else if (subList.length > 0) {
          setSelectedSubjectId(subList[0].id);
        }
      } catch (err) {
        console.error('Error loading subjects:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSubjects();
  }, [teacherRecord, searchParams]);

  // 2. Load enrolled students and existing attendance for selected subject & date
  useEffect(() => {
    const loadClassAttendance = async () => {
      if (!selectedSubjectId) return;

      try {
        // Fetch enrolled students
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('student:students(*, profile:profiles(*))')
          .eq('subject_id', selectedSubjectId);

        const stuList = (enrollments || []).map((e: any) => e.student).filter(Boolean);
        setStudents(stuList);

        // Fetch existing attendance records for date
        const { data: existingAtt } = await supabase
          .from('attendance')
          .select('*')
          .eq('subject_id', selectedSubjectId)
          .eq('date', selectedDate);

        const stateMap: Record<string, 'Present' | 'Absent' | 'Late'> = {};
        stuList.forEach((stu: any) => {
          const match = (existingAtt || []).find((a: any) => a.student_id === stu.id);
          stateMap[stu.id] = match ? match.status : 'Present';
        });

        setAttendanceState(stateMap);
      } catch (err) {
        console.error('Error loading attendance list:', err);
      }
    };

    loadClassAttendance();
  }, [selectedSubjectId, selectedDate]);

  const handleStatusChange = (studentId: string, status: 'Present' | 'Absent' | 'Late') => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAll = (status: 'Present' | 'Absent' | 'Late') => {
    const updated: Record<string, 'Present' | 'Absent' | 'Late'> = {};
    students.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendanceState(updated);
  };

  const handleSaveAttendance = async () => {
    if (!selectedSubjectId || !teacherRecord) return;
    setSaving(true);
    setMessage(null);

    try {
      const recordsToUpsert = students.map((stu) => ({
        student_id: stu.id,
        subject_id: selectedSubjectId,
        date: selectedDate,
        status: attendanceState[stu.id] || 'Present',
        marked_by: teacherRecord.id,
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(recordsToUpsert, { onConflict: 'student_id,subject_id,date' });

      if (error) throw error;
      setMessage({ type: 'success', text: `Attendance saved for ${selectedDate}.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save attendance.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading course attendance module..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mark Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">Record and manage daily classroom session attendance</p>
        </div>

        {students.length > 0 && (
          <Button
            variant="primary"
            icon={Save}
            onClick={handleSaveAttendance}
            isLoading={saving}
          >
            Save Attendance
          </Button>
        )}
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter Controls */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Course
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name} (Sem {s.semester})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Session Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col justify-end">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleMarkAll('Present')}
                className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll('Absent')}
                className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold"
              >
                Mark All Absent
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Student List */}
      <Card
        title={`Enrolled Students (${students.length})`}
        subtitle="Mark attendance status for each enrolled student"
      >
        {students.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Students Enrolled"
            description="There are currently no students registered in this course."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Enrollment No.</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-right">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((stu) => {
                  const currentStatus = attendanceState[stu.id] || 'Present';
                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{stu.profile?.full_name}</div>
                        <div className="text-xs text-slate-400 font-mono">ID: {stu.id}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-medium text-slate-700">
                        {stu.enrollment_no}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {stu.department}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                          {(['Present', 'Absent', 'Late'] as const).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleStatusChange(stu.id, status)}
                              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                                currentStatus === status
                                  ? status === 'Present'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : status === 'Late'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-rose-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
