import React, { useEffect, useState } from 'react';
import { FileText, Upload, Download, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { DocumentRecord } from '../../types';

export const StudentDocuments: React.FC = () => {
  const { profile, studentRecord, user } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDocuments = async () => {
    if (!studentRecord?.id || !user) {
      setLoading(false);
      return;
    }

    try {
      // Secure V2: Query strictly owned documents
      const { data: myDocs, error } = await supabase
        .from('documents')
        .select('*')
        .eq('student_id', studentRecord.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((myDocs as DocumentRecord[]) || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [studentRecord, user]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !profile || !studentRecord || !user) return;

    setUploading(true);
    setStatusMessage(null);

    try {
      // Secure V2: File path prefixed with user's unique auth UUID (Fixes VULN-007)
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user.id}/${Date.now()}-${cleanFileName}`;

      // Upload to private bucket
      const { data: storageData, error: storageError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) throw storageError;

      // Insert metadata into database
      const { error: dbError } = await supabase.from('documents').insert({
        title: docTitle.trim(),
        file_path: storageData.path,
        file_size: file.size,
        uploaded_by: user.id,
        student_id: studentRecord.id,
      });

      if (dbError) throw dbError;

      setStatusMessage({ type: 'success', text: 'Document uploaded securely.' });
      setDocTitle('');
      setFile(null);
      setUploadModalOpen(false);
      await loadDocuments();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to upload document.' });
    } finally {
      setUploading(false);
    }
  };

  // Secure V2: Generate short-lived signed URL for authorized access
  const handleDownload = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('student-documents')
        .createSignedUrl(filePath, 60); // 60 seconds expiry

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      alert('Failed to generate secure download link: ' + err.message);
    }
  };

  const handleDelete = async (doc: DocumentRecord) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await supabase.storage.from('student-documents').remove([doc.file_path]);
      await supabase.from('documents').delete().eq('id', doc.id);
      await loadDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your submitted documents..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Documents</h1>
          <p className="text-sm text-slate-500 mt-1">Upload and securely manage your academic credentials and assignments</p>
        </div>

        <Button
          variant="primary"
          icon={Upload}
          onClick={() => {
            setStatusMessage(null);
            setUploadModalOpen(true);
          }}
        >
          Upload Document
        </Button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* My Uploaded Documents */}
      <Card title="My Uploaded Files" subtitle="Encrypted and isolated in your private student storage vault">
        {documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Documents Uploaded"
            description="You haven't uploaded any documents yet. Upload your assignment or identity records."
            actionLabel="Upload First Document"
            onAction={() => setUploadModalOpen(true)}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <div key={doc.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900">{doc.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB • ` : ''}
                      Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(doc.file_path)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Secure Download
                  </button>
                  <button
                    onClick={() => handleDelete(doc)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Student Document"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Document Title
            </label>
            <input
              type="text"
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. Identity Proof / Semester Assignment"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Choose File
            </label>
            <input
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={uploading}
              icon={Upload}
            >
              Upload Securely
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
