import React, { useEffect, useState } from 'react';
import { CalendarCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { AttendanceRecord } from '../../types';

export const StudentAttendance: React.FC = () => {
  const { studentRecord } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<string>('all');

  useEffect(() => {
    const loadAttendance = async () => {
      if (!studentRecord?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('attendance')
          .select('*, subject:subjects(*)')
          .eq('student_id', studentRecord.id)
          .order('date', { ascending: false });

        if (error) throw error;
        setAttendance((data as AttendanceRecord[]) || []);
      } catch (err) {
        console.error('Error fetching attendance:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [studentRecord]);

  if (loading) {
    return <LoadingSpinner message="Calculating your attendance logs..." />;
  }

  // Calculate statistics
  const total = attendance.length;
  const present = attendance.filter((a) => a.status === 'Present').length;
  const absent = attendance.filter((a) => a.status === 'Absent').length;
  const late = attendance.filter((a) => a.status === 'Late').length;
  const overallPct = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 100;

  // Extract unique subjects for filter dropdown
  const uniqueSubjects = Array.from(
    new Map(
      attendance
        .filter((a) => a.subject)
        .map((a) => [a.subject!.id, a.subject!])
    ).values()
  );

  const filteredAttendance =
    filterSubject === 'all'
      ? attendance
      : attendance.filter((a) => a.subject_id === filterSubject);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Record</h1>
        <p className="text-sm text-slate-500 mt-1">Review your classroom attendance history and percentages</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase">Overall Attendance</p>
          <p className={`text-3xl font-extrabold mt-1 ${overallPct >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {overallPct}%
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Min required: 75%</p>
        </Card>

        <Card className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase">Total Classes</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{total}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Conducted</p>
        </Card>

        <Card className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase">Present</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{present}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Sessions attended</p>
        </Card>

        <Card className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase">Absent</p>
          <p className="text-3xl font-bold text-rose-600 mt-1">{absent}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Sessions missed</p>
        </Card>
      </div>

      {/* Attendance Log Table */}
      <Card
        title="Attendance Session Logs"
        action={
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Subjects ({attendance.length})</option>
            {uniqueSubjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.code} — {sub.name}
              </option>
            ))}
          </select>
        }
      >
        {filteredAttendance.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No Attendance Records"
            description="There are no attendance sessions marked for the selected course yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendance.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {new Date(record.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-slate-700 mr-2">
                        {record.subject?.code}
                      </span>
                      <span className="text-slate-600">{record.subject?.name}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant={
                          record.status === 'Present'
                            ? 'success'
                            : record.status === 'Late'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {record.status}
                      </Badge>
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
