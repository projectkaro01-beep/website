import React, { useEffect, useState } from 'react';
import { BookOpen, User, Building, Plus, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Subject } from '../../types';

export const StudentSubjects: React.FC = () => {
  const { studentRecord } = useAuth();
  const [enrolledSubjects, setEnrolledSubjects] = useState<Subject[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const loadSubjects = async () => {
    if (!studentRecord?.id) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch enrolled subjects
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('subject:subjects(*, teacher:teachers(*, profile:profiles(*)))')
        .eq('student_id', studentRecord.id);

      const enrolled = (enrollmentsData || []).map((e: any) => e.subject).filter(Boolean);
      setEnrolledSubjects(enrolled);

      // 2. Fetch all subjects
      const { data: allSubs } = await supabase
        .from('subjects')
        .select('*, teacher:teachers(*, profile:profiles(*))');

      const enrolledIds = new Set(enrolled.map((s) => s.id));
      const available = (allSubs || []).filter((s: Subject) => !enrolledIds.has(s.id));
      setAvailableSubjects(available);
    } catch (err) {
      console.error('Error loading subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, [studentRecord]);

  const handleEnroll = async (subjectId: string) => {
    if (!studentRecord?.id) return;
    setEnrollingId(subjectId);

    try {
      const { error } = await supabase.from('enrollments').insert({
        student_id: studentRecord.id,
        subject_id: subjectId,
      });

      if (error) throw error;
      await loadSubjects();
    } catch (err) {
      console.error('Failed to enroll:', err);
    } finally {
      setEnrollingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading courses and subjects..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Subjects</h1>
        <p className="text-sm text-slate-500 mt-1">
          Courses enrolled for Semester {studentRecord?.semester || 1} • {studentRecord?.department || 'General'}
        </p>
      </div>

      {/* Enrolled Subjects */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span>My Enrolled Courses</span>
          <Badge variant="primary" size="sm">{enrolledSubjects.length}</Badge>
        </h2>

        {enrolledSubjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Courses Enrolled"
            description="You are currently not enrolled in any academic courses. Browse available subjects below to register."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledSubjects.map((sub) => (
              <Card key={sub.id} className="p-5 flex flex-col justify-between hover:border-blue-200 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                      {sub.code}
                    </span>
                    <Badge variant="success" size="sm">Active</Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">{sub.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
                    <Building className="w-3.5 h-3.5" />
                    <span>{sub.department}</span>
                  </p>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Faculty: <strong className="text-slate-800">{sub.teacher?.profile?.full_name || 'Unassigned'}</strong></span>
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Semester {sub.semester}</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Enrolled
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Available Subjects for Self-Registration */}
      {availableSubjects.length > 0 && (
        <div className="pt-4 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Available Courses to Register</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableSubjects.map((sub) => (
              <Card key={sub.id} className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {sub.code}
                    </span>
                    <Badge variant="gray" size="sm">Sem {sub.semester}</Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">{sub.name}</h3>
                  <p className="text-xs text-slate-500">{sub.department}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Faculty: {sub.teacher?.profile?.full_name || 'TBA'}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Plus}
                    isLoading={enrollingId === sub.id}
                    onClick={() => handleEnroll(sub.id)}
                  >
                    Enroll
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
