import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, Search, TrendingUp, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { MarkRecord } from '../../types';

export const StudentMarks: React.FC = () => {
  const { studentRecord } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Target student_id defaults to logged-in student, but can be overridden via query param (VULN-002 IDOR)
  const queryStudentId = searchParams.get('student_id') || studentRecord?.id || '';
  const [targetStudentId, setTargetStudentId] = useState(queryStudentId);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Midterm' | 'Final' | 'Quiz' | 'Assignment'>('All');

  const fetchMarksForStudent = async (stuId: string) => {
    if (!stuId) return;
    setLoading(true);

    try {
      // Fetch target student info
      const { data: sInfo } = await supabase
        .from('students')
        .select('*, profile:profiles(*)')
        .eq('id', stuId)
        .single();
      setStudentInfo(sInfo);

      // VULN-002 / VULN-003: Direct query filtering solely on student_id without server-side ownership enforcement
      const { data: marksData, error } = await supabase
        .from('marks')
        .select('*, subject:subjects(*)')
        .eq('student_id', stuId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMarks((marksData as MarkRecord[]) || []);
    } catch (err) {
      console.error('Error fetching marks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryStudentId) {
      setTargetStudentId(queryStudentId);
      fetchMarksForStudent(queryStudentId);
    } else if (studentRecord?.id) {
      setTargetStudentId(studentRecord.id);
      fetchMarksForStudent(studentRecord.id);
    }
  }, [queryStudentId, studentRecord]);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetStudentId) {
      setSearchParams({ student_id: targetStudentId });
      fetchMarksForStudent(targetStudentId);
    }
  };

  const filteredMarks =
    activeTab === 'All'
      ? marks
      : marks.filter((m) => m.exam_type === activeTab);

  const totalScore = marks.reduce((acc, m) => acc + Number(m.score), 0);
  const totalMax = marks.reduce((acc, m) => acc + Number(m.max_score), 0);
  const overallPercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Grades & Marks</h1>
          <p className="text-sm text-slate-500 mt-1">
            Viewing records for:{' '}
            <strong className="text-slate-800 font-semibold">
              {studentInfo?.profile?.full_name || 'Loading student...'}
            </strong>{' '}
            ({studentInfo?.enrollment_no || 'N/A'})
          </p>
        </div>

        {/* Resource ID Lookup Form (Direct IDOR & RLS Testing Interface) */}
        <form onSubmit={handleLookupSubmit} className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={targetStudentId}
              onChange={(e) => setTargetStudentId(e.target.value)}
              placeholder="Query Student ID (UUID)"
              className="pl-3 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" icon={Search}>
            Lookup
          </Button>
        </form>
      </div>

      {/* Target Student Notice if viewing another student ID */}
      {studentRecord?.id && targetStudentId && targetStudentId !== studentRecord.id && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              Target identifier active: <strong className="font-mono">{targetStudentId}</strong>
            </span>
          </div>
          <button
            onClick={() => {
              setSearchParams({});
              setTargetStudentId(studentRecord.id);
              fetchMarksForStudent(studentRecord.id);
            }}
            className="underline font-semibold hover:text-amber-900"
          >
            Reset to My Records
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Retrieving grade reports..." />
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase">Cumulative Score</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-slate-900">{totalScore}</span>
                <span className="text-sm font-semibold text-slate-400">/ {totalMax}</span>
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase">Performance Grade</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className={`text-3xl font-extrabold ${
                    overallPercentage >= 80
                      ? 'text-emerald-600'
                      : overallPercentage >= 60
                      ? 'text-blue-600'
                      : 'text-amber-600'
                  }`}
                >
                  {overallPercentage}%
                </span>
                <span className="text-xs text-slate-500">
                  {overallPercentage >= 80 ? 'Distinction' : overallPercentage >= 60 ? 'First Class' : 'Pass'}
                </span>
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase">Total Assessments</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{marks.length}</p>
            </Card>
          </div>

          {/* Assessment Filter Tabs & Table */}
          <Card>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex gap-1">
                {(['All', 'Midterm', 'Final', 'Quiz', 'Assignment'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {filteredMarks.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No Marks Found"
                description="No assessment marks match the selected category for this student."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Assessment Type</th>
                      <th className="px-4 py-3 text-right">Score</th>
                      <th className="px-4 py-3 text-right">Percentage</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMarks.map((mark) => {
                      const pct = Math.round((Number(mark.score) / Number(mark.max_score)) * 100);
                      return (
                        <tr key={mark.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-900">{mark.subject?.name}</div>
                            <div className="text-xs font-mono text-slate-400">{mark.subject?.code}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge variant="primary" size="sm">
                              {mark.exam_type}
                            </Badge>
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
                          <td className="px-4 py-3.5 text-xs text-slate-500">
                            {mark.remarks || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
