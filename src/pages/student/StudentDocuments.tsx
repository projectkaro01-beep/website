import React, { useEffect, useState } from 'react';
import { FileText, Upload, Download, Trash2, Eye, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { DocumentRecord } from '../../types';

export const StudentDocuments: React.FC = () => {
  const { profile, studentRecord } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [allDocuments, setAllDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Direct storage file path tester (VULN-007)
  const [testPath, setTestPath] = useState('');
  const [testUrlResult, setTestUrlResult] = useState<string | null>(null);

  const loadDocuments = async () => {
    if (!studentRecord?.id) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch own documents
      const { data: myDocs } = await supabase
        .from('documents')
        .select('*, student:students(*, profile:profiles(*))')
        .eq('student_id', studentRecord.id)
        .order('created_at', { ascending: false });

      setDocuments((myDocs as DocumentRecord[]) || []);

      // 2. VULN-007 / VULN-008: Fetch all documents records (accessible due to permissive select RLS)
      const { data: allDocs } = await supabase
        .from('documents')
        .select('*, student:students(*, profile:profiles(*))')
        .order('created_at', { ascending: false });

      setAllDocuments((allDocs as DocumentRecord[]) || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [studentRecord]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !profile || !studentRecord) return;

    setUploading(true);
    setStatusMessage(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentRecord.id}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

      // 1. Upload to Supabase Storage Bucket
      const { data: storageData, error: storageError } = await supabase.storage
        .from('student-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) throw storageError;

      // 2. Insert metadata into database
      const { error: dbError } = await supabase.from('documents').insert({
        title: docTitle,
        file_path: storageData.path,
        file_size: file.size,
        uploaded_by: profile.id,
        student_id: studentRecord.id,
      });

      if (dbError) throw dbError;

      setStatusMessage({ type: 'success', text: 'Document uploaded successfully.' });
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

  const getPublicFileUrl = (path: string) => {
    const { data } = supabase.storage.from('student-documents').getPublicUrl(path);
    return data.publicUrl;
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
          <p className="text-sm text-slate-500 mt-1">Upload and manage verification credentials and assignments</p>
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
      <Card title="My Uploaded Files" subtitle="Private documents stored for your student account">
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
            {documents.map((doc) => {
              const downloadUrl = getPublicFileUrl(doc.file_path);
              return (
                <div key={doc.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900">{doc.title}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{doc.file_path}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB • ` : ''}
                        Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Storage Access Control Test Section (VULN-007) */}
      <Card
        title="Direct Storage Access Explorer"
        subtitle="Test public / cross-tenant object access via direct storage path"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Enter any storage file key (e.g. uploaded by other students) to generate and test the direct object URL:
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={testPath}
              onChange={(e) => setTestPath(e.target.value)}
              placeholder="e.g. <other-student-uuid>/1700000000-assignment.pdf"
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (testPath) {
                  setTestUrlResult(getPublicFileUrl(testPath));
                }
              }}
            >
              Generate URL
            </Button>
          </div>

          {testUrlResult && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-semibold text-slate-700 block mb-1">Generated Object URL:</span>
              <a
                href={testUrlResult}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline font-mono break-all hover:text-blue-800"
              >
                {testUrlResult}
              </a>
            </div>
          )}

          {/* Quick list of database document keys */}
          {allDocuments.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-2">
                Available Document File Keys in Database ({allDocuments.length})
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-[11px]">
                {allDocuments.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-1.5 bg-white border rounded hover:bg-slate-50">
                    <span className="truncate max-w-[250px]">{d.file_path}</span>
                    <span className="text-slate-400">By: {d.student?.profile?.full_name || 'Student'}</span>
                    <button
                      onClick={() => {
                        setTestPath(d.file_path);
                        setTestUrlResult(getPublicFileUrl(d.file_path));
                      }}
                      className="text-blue-600 text-xs font-sans font-medium hover:underline ml-2"
                    >
                      Use Key
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
              Upload to Storage
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
