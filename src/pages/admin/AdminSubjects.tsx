import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Edit3, Trash2, User, Building, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Subject, Teacher } from '../../types';

export const AdminSubjects: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [semester, setSemester] = useState(1);
  const [teacherId, setTeacherId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      const [
        { data: subData, error: subError },
        { data: teaData, error: teaError },
      ] = await Promise.all([
        supabase
          .from('subjects')
          .select('*, teacher:teachers(*, profile:profiles(*))')
          .order('code', { ascending: true }),
        supabase
          .from('teachers')
          .select('*, profile:profiles(*)')
          .order('created_at', { ascending: false }),
      ]);

      if (subError) throw subError;
      if (teaError) throw teaError;

      setSubjects((subData as Subject[]) || []);
      setTeachers(teaData || []);
    } catch (err) {
      console.error('Error loading subject data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setCode('');
    setName('');
    setDepartment('Computer Science');
    setSemester(1);
    setTeacherId(teachers.length > 0 ? teachers[0].id : '');
    setModalOpen(true);
  };

  const handleOpenEdit = (sub: Subject) => {
    setEditingSubject(sub);
    setCode(sub.code);
    setName(sub.name);
    setDepartment(sub.department);
    setSemester(sub.semester);
    setTeacherId(sub.teacher_id || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (editingSubject) {
        // Update
        const { error } = await supabase
          .from('subjects')
          .update({
            code,
            name,
            department,
            semester: Number(semester),
            teacher_id: teacherId || null,
          })
          .eq('id', editingSubject.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Course updated successfully.' });
      } else {
        // Create
        const { error } = await supabase.from('subjects').insert({
          code,
          name,
          department,
          semester: Number(semester),
          teacher_id: teacherId || null,
        });

        if (error) throw error;
        setMessage({ type: 'success', text: 'New course created successfully.' });
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save subject.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course? This will cascade to enrollments, marks, and attendance.')) {
      return;
    }

    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Failed to delete subject:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading course curriculum..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Courses & Curriculum</h1>
          <p className="text-sm text-slate-500 mt-1">Manage academic subjects and instructor allocations</p>
        </div>

        <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
          Create New Course
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

      <Card>
        {subjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Courses Found"
            description="No academic courses have been created yet. Click 'Create New Course' to add subjects."
            actionLabel="Add First Course"
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Course Code</th>
                  <th className="px-4 py-3">Course Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Semester</th>
                  <th className="px-4 py-3">Assigned Faculty</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-800">
                      {sub.code}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {sub.name}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {sub.department}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="primary" size="sm">Sem {sub.semester}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-slate-800">
                      {sub.teacher?.profile?.full_name ? (
                        <span className="font-medium">{sub.teacher.profile.full_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unallocated</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(sub)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Course"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSubject ? 'Edit Academic Course' : 'Create New Academic Course'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Course Code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CS101"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Course Title / Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Database Management Systems"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Assign Instructor / Faculty
            </label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- No Faculty Assigned --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.profile?.full_name} ({t.employee_id} • {t.department})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
            >
              Save Course
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
