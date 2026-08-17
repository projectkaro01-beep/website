import React, { useEffect, useState } from 'react';
import { Award, Trash2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { MarkRecord } from '../../types';

export const AdminMarks: React.FC = () => {
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadMarks = async () => {
    try {
      const { data, error } = await supabase
        .from('marks')
        .select('*, student:students(*, profile:profiles(*)), subject:subjects(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMarks((data as MarkRecord[]) || []);
    } catch (err) {
      console.error('Error fetching global marks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarks();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grade record?')) return;
    try {
      await supabase.from('marks').delete().eq('id', id);
      await loadMarks();
    } catch (err) {
      console.error('Failed to delete grade record:', err);
    }
  };

  const filteredMarks = marks.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.student?.profile?.full_name?.toLowerCase().includes(q) ||
      m.student?.enrollment_no?.toLowerCase().includes(q) ||
      m.subject?.name?.toLowerCase().includes(q) ||
      m.subject?.code?.toLowerCase().includes(q) ||
      m.exam_type.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <LoadingSpinner message="Loading institution-wide grade records..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Grade Ledger</h1>
          <p className="text-sm text-slate-500 mt-1">Audit and supervise institutional evaluations and exam scores</p>
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

      <Card title={`Total Assessment Scores (${filteredMarks.length})`}>
        {filteredMarks.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No Marks Found"
            description="No grade entries match your search criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Exam Type</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Percentage</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMarks.map((mark) => {
                  const pct = Math.round((Number(mark.score) / Number(mark.max_score)) * 100);
                  return (
                    <tr key={mark.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{mark.student?.profile?.full_name}</div>
                        <div className="text-xs text-slate-400 font-mono">{mark.student?.enrollment_no}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-bold text-slate-700 mr-2">{mark.subject?.code}</span>
                        <span className="text-slate-600">{mark.subject?.name}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="primary" size="sm">{mark.exam_type}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        {mark.score} <span className="text-slate-400 font-normal">/ {mark.max_score}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold">
                        <span
                          className={
                            pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-blue-600' : 'text-rose-600'
                          }
                        >
                          {pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{mark.remarks || '—'}</td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleDelete(mark.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Grade Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
