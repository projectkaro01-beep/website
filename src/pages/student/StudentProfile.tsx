import React, { useState } from 'react';
import { User, Mail, Phone, Building, GraduationCap, Save, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const StudentProfile: React.FC = () => {
  const { profile, studentRecord, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [department, setDepartment] = useState(studentRecord?.department || 'Computer Science');
  const [semester, setSemester] = useState(studentRecord?.semester || 1);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // VULN-006 & VULN-004: Direct object pass to update query
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setMessage(null);

    try {
      // 1. Update Profile (Vulnerable to mass assignment if extra fields are attached)
      const profileUpdatePayload: Record<string, any> = {
        full_name: fullName,
        phone: phone,
        updated_at: new Date().toISOString(),
      };

      const { error: profError } = await supabase
        .from('profiles')
        .update(profileUpdatePayload)
        .eq('id', profile.id);

      if (profError) throw profError;

      // 2. Update Student metadata
      if (studentRecord) {
        const { error: stuError } = await supabase
          .from('students')
          .update({
            department,
            semester: Number(semester),
          })
          .eq('id', studentRecord.id);

        if (stuError) throw stuError;
      }

      await refreshProfile();
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your student credentials and personal information</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left ID Card */}
        <Card className="text-center p-6 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-blue-600 text-white font-bold text-3xl flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4">
            {profile?.full_name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <h2 className="text-lg font-bold text-slate-900">{profile?.full_name}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{profile?.email}</p>

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <Badge variant="primary" size="sm">
              Role: {profile?.role?.toUpperCase()}
            </Badge>
            <Badge variant="info" size="sm">
              Sem {studentRecord?.semester || 1}
            </Badge>
          </div>

          <div className="w-full mt-6 pt-6 border-t border-slate-100 text-left space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block uppercase font-semibold text-[10px]">Enrollment No</span>
              <span className="font-mono font-medium text-slate-800">{studentRecord?.enrollment_no || 'STU-0000'}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-semibold text-[10px]">Department</span>
              <span className="font-medium text-slate-800">{studentRecord?.department || 'Computer Science'}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-semibold text-[10px]">User Identifier (UUID)</span>
              <span className="font-mono text-[10px] text-slate-600 break-all">{profile?.id}</span>
            </div>
          </div>
        </Card>

        {/* Right Edit Form */}
        <div className="md:col-span-2">
          <Card title="Personal Information" subtitle="Update your profile records in the institution database">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ''}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" variant="primary" icon={Save} isLoading={loading}>
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
