import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, Plus, Trash2, Edit3, Save, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Subject, MarkRecord } from '../../types';

export const TeacherMarks: React.FC = () => {
  const { teacherRecord } = useAuth();
  const [searchParams] = useSearchParams();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMarkId, setEditingMarkId] = useState<string | null>(null);
  const [targetStudentId, setTargetStudentId] = useState('');
  const [examType, setExamType] = useState<'Midterm' | 'Final' | 'Quiz' | 'Assignment'>('Midterm');
  const [score, setScore] = useState<number>(85);
  const [maxScore, setMaxScore] = useState<number>(100);
  const [remarks, setRemarks] = useState('');
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

  // 2. Load marks & enrolled students for selected subject
  const loadSubjectMarks = async () => {
    if (!selectedSubjectId) return;

    try {
      // Enrolled students
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student:students(*, profile:profiles(*))')
        .eq('subject_id', selectedSubjectId);

      const stuList = (enrollments || []).map((e: any) => e.student).filter(Boolean);
      setEnrolledStudents(stuList);
      if (stuList.length > 0 && !targetStudentId) {
        setTargetStudentId(stuList[0].id);
      }

      // Existing marks
      const { data: marksData } = await supabase
        .from('marks')
        .select('*, student:students(*, profile:profiles(*)), subject:subjects(*)')
        .eq('subject_id', selectedSubjectId)
        .order('created_at', { ascending: false });

      setMarks((marksData as MarkRecord[]) || []);
    } catch (err) {
      console.error('Error loading marks:', err);
    }
  };

  useEffect(() => {
    loadSubjectMarks();
  }, [selectedSubjectId]);

  const handleOpenAddModal = () => {
    setEditingMarkId(null);
    setExamType('Midterm');
    setScore(85);
    setMaxScore(100);
    setRemarks('');
    if (enrolledStudents.length > 0) {
      setTargetStudentId(enrolledStudents[0].id);
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (mark: MarkRecord) => {
    setEditingMarkId(mark.id);
    setTargetStudentId(mark.student_id);
    setExamType(mark.exam_type);
    setScore(Number(mark.score));
    setMaxScore(Number(mark.max_score));
    setRemarks(mark.remarks || '');
    setIsModalOpen(true);
  };

  const handleSaveMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !targetStudentId) return;

    setSaving(true);
    setMessage(null);

    try {
      if (editingMarkId) {
        // Update
        const { error } = await supabase
          .from('marks')
          .update({
            student_id: targetStudentId,
            subject_id: selectedSubjectId,
            exam_type: examType,
            score: Number(score),
            max_score: Number(maxScore),
            remarks: remarks,
          })
          .eq('id', editingMarkId);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Grade record updated successfully.' });
      } else {
        // Insert
        const { error } = await supabase.from('marks').insert({
          student_id: targetStudentId,
          subject_id: selectedSubjectId,
          exam_type: examType,
          score: Number(score),
          max_score: Number(maxScore),
          remarks: remarks,
        });

        if (error) throw error;
        setMessage({ type: 'success', text: 'New assessment score recorded.' });
      }

      setIsModalOpen(false);
      await loadSubjectMarks();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save grade record.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMark = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grade record?')) return;

    try {
      const { error } = await supabase.from('marks').delete().eq('id', id);
      if (error) throw error;
      await loadSubjectMarks();
    } catch (err) {
      console.error('Failed to delete mark:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading course grading module..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manage Student Marks</h1>
          <p className="text-sm text-slate-500 mt-1">Record, modify, and publish course assessment scores</p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={handleOpenAddModal}
          disabled={enrolledStudents.length === 0}
        >
          Add Assessment Score
        </Button>
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

      {/* Select Course */}
      <Card className="p-4">
        <div className="max-w-md">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Select Allocated Course
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
      </Card>

      {/* Marks Table */}
      <Card
        title={`Grade Records (${marks.length})`}
        subtitle="Graded evaluations for this course"
      >
        {marks.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No Marks Recorded"
            description="No grades have been entered for this subject yet. Click 'Add Assessment Score' to record grades."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Assessment Type</th>
                  <th className="px-4 py-3 text-right">Score / Max</th>
                  <th className="px-4 py-3 text-right">Percentage</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marks.map((mark) => {
                  const pct = Math.round((Number(mark.score) / Number(mark.max_score)) * 100);
                  return (
                    <tr key={mark.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{mark.student?.profile?.full_name}</div>
                        <div className="text-xs text-slate-400 font-mono">
                          {mark.student?.enrollment_no} • ID: {mark.student_id}
                        </div>
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
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(mark)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Score"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMark(mark.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMarkId ? 'Edit Student Grade' : 'Record New Assessment Score'}
      >
        <form onSubmit={handleSaveMark} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Student
            </label>
            <select
              required
              value={targetStudentId}
              onChange={(e) => setTargetStudentId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {enrolledStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.profile?.full_name} ({s.enrollment_no})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Assessment Type
            </label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Midterm">Midterm Examination</option>
              <option value="Final">Final Examination</option>
              <option value="Quiz">Quiz</option>
              <option value="Assignment">Assignment</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Obtained Score
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max={maxScore}
                required
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Maximum Score
              </label>
              <input
                type="number"
                min="1"
                required
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Remarks (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Excellent work / Needs improvement"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
            >
              Save Grade
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
