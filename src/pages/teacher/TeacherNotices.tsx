import React, { useEffect, useState } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Notice } from '../../types';

export const TeacherNotices: React.FC = () => {
  const { profile } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // Post modal
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'urgent'>('normal');
  const [targetRole, setTargetRole] = useState<'all' | 'student' | 'teacher'>('student');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*, author:profiles(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices((data as Notice[]) || []);
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.from('notices').insert({
        title,
        content,
        priority,
        target_role: targetRole,
        posted_by: profile.id,
      });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Notice published successfully.' });
      setTitle('');
      setContent('');
      setModalOpen(false);
      await loadNotices();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to post notice.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;

    try {
      const { error } = await supabase.from('notices').delete().eq('id', id);
      if (error) throw error;
      await loadNotices();
    } catch (err) {
      console.error('Failed to delete notice:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading faculty announcements..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Notices</h1>
          <p className="text-sm text-slate-500 mt-1">Publish circulars and exam schedules for students</p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setMessage(null);
            setModalOpen(true);
          }}
        >
          Post New Notice
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
          <span>{message.text}</span>
        </div>
      )}

      {/* Notices Grid */}
      {notices.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Notices"
          description="There are currently no active notices posted."
          actionLabel="Post First Notice"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notices.map((n) => (
            <Card key={n.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        n.priority === 'urgent'
                          ? 'danger'
                          : n.priority === 'normal'
                          ? 'primary'
                          : 'gray'
                      }
                      size="sm"
                    >
                      {n.priority}
                    </Badge>
                    <Badge variant="info" size="sm">
                      Target: {n.target_role}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base mb-2">{n.title}</h3>

                {/* Secure V2: Sanitize rendered notice HTML */}
                <div
                  className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-3 rounded-lg border border-slate-100 font-sans"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(n.content, {
                      USE_PROFILES: { html: true },
                      FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
                      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
                    }),
                  }}
                />
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>By: {n.author?.full_name || 'Faculty'}</span>
                <button
                  onClick={() => handleDeleteNotice(n.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                  title="Delete Notice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Post Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Post New Campus Notice"
        maxWidth="lg"
      >
        <form onSubmit={handlePostNotice} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Notice Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Schedule Announcement"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Audience
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All (Students & Teachers)</option>
                <option value="student">Students Only</option>
                <option value="teacher">Teachers Only</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Notice Content
            </label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter announcement details..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
            />
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
              Publish Notice
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
