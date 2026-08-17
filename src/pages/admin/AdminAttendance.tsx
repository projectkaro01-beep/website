import React, { useEffect, useState } from 'react';
import { CalendarCheck, Trash2, Search, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { AttendanceRecord } from '../../types';

export const AdminAttendance: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, student:students(*, profile:profiles(*)), subject:subjects(*)')
        .order('date', { ascending: false });

      if (error) throw error;
      setAttendance((data as AttendanceRecord[]) || []);
    } catch (err) {
      console.error('Error fetching global attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    try {
      await supabase.from('attendance').delete().eq('id', id);
      await loadAttendance();
    } catch (err) {
      console.error('Failed to delete attendance record:', err);
    }
  };

  const filteredAttendance = attendance.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.student?.profile?.full_name?.toLowerCase().includes(q) ||
      a.student?.enrollment_no?.toLowerCase().includes(q) ||
      a.subject?.name?.toLowerCase().includes(q) ||
      a.subject?.code?.toLowerCase().includes(q) ||
      a.date.includes(q)
    );
  });

  if (loading) {
    return <LoadingSpinner message="Loading institution-wide attendance records..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institution Attendance Logs</h1>
          <p className="text-sm text-slate-500 mt-1">Audit and supervise campus-wide classroom attendance</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student or course..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <Card title={`Total Recorded Sessions (${filteredAttendance.length})`}>
        {filteredAttendance.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No Attendance Logs"
            description="No attendance entries match your search criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendance.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {new Date(rec.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{rec.student?.profile?.full_name}</div>
                      <div className="text-xs text-slate-400 font-mono">{rec.student?.enrollment_no}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-slate-700 mr-2">{rec.subject?.code}</span>
                      <span className="text-slate-600">{rec.subject?.name}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant={
                          rec.status === 'Present'
                            ? 'success'
                            : rec.status === 'Late'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {rec.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
