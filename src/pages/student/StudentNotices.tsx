import React, { useEffect, useState } from 'react';
import { Bell, Calendar, User } from 'lucide-react';
import DOMPurify from 'dompurify';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Notice } from '../../types';

export const StudentNotices: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  const loadNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*, author:profiles(*)')
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

  if (loading) {
    return <LoadingSpinner message="Fetching campus bulletin notices..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notice Board</h1>
        <p className="text-sm text-slate-500 mt-1">Official institutional updates, schedules, and circulars</p>
      </div>

      {notices.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Notices Available"
          description="There are currently no active announcements or bulletins posted for students."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notices.map((notice) => (
            <Card
              key={notice.id}
              className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer border-slate-200"
              onClick={() => setSelectedNotice(notice)}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge
                    variant={
                      notice.priority === 'urgent'
                        ? 'danger'
                        : notice.priority === 'normal'
                        ? 'primary'
                        : 'gray'
                    }
                    size="sm"
                  >
                    {notice.priority} priority
                  </Badge>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(notice.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base mb-2">{notice.title}</h3>

                {/* Secure V2: Sanitize HTML content with DOMPurify (Fixes VULN-005) */}
                <div
                  className="text-sm text-slate-600 line-clamp-3 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(notice.content, {
                      USE_PROFILES: { html: true },
                      FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
                      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
                    }),
                  }}
                />
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Posted by: {notice.author?.full_name || 'Administration'}</span>
                </span>
                <span className="text-blue-600 font-semibold hover:underline">Read Full</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Notice Detail Modal */}
      <Modal
        isOpen={Boolean(selectedNotice)}
        onClose={() => setSelectedNotice(null)}
        title={selectedNotice?.title || 'Notice Details'}
        maxWidth="lg"
      >
        {selectedNotice && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    selectedNotice.priority === 'urgent'
                      ? 'danger'
                      : selectedNotice.priority === 'normal'
                      ? 'primary'
                      : 'gray'
                  }
                >
                  {selectedNotice.priority}
                </Badge>
                <span>Target: {selectedNotice.target_role.toUpperCase()}</span>
              </div>
              <span>{new Date(selectedNotice.created_at).toLocaleString()}</span>
            </div>

            {/* Secure V2: Sanitized HTML content */}
            <div
              className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[100px]"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(selectedNotice.content, {
                  USE_PROFILES: { html: true },
                  FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
                  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
                }),
              }}
            />

            <div className="pt-2 text-xs text-slate-400 flex items-center justify-between">
              <span>Author: {selectedNotice.author?.full_name || 'College Admin'}</span>
              <span>Notice ID: <code className="font-mono text-[11px]">{selectedNotice.id}</code></span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
