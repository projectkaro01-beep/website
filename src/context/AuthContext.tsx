import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, Student, Teacher, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  studentRecord: Student | null;
  teacherRecord: Teacher | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole, extra?: any) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [studentRecord, setStudentRecord] = useState<Student | null>(null);
  const [teacherRecord, setTeacherRecord] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfileAndRoleRecords = async (userId: string) => {
    try {
      // 1. Fetch Profile
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profError) {
        console.warn('Error fetching profile:', profError);
      } else if (prof) {
        setProfile(prof as Profile);

        // 2. Fetch specific role records
        if (prof.role === 'student') {
          const { data: stu } = await supabase
            .from('students')
            .select('*')
            .eq('user_id', userId)
            .single();
          setStudentRecord(stu || null);
          setTeacherRecord(null);
        } else if (prof.role === 'teacher') {
          const { data: tea } = await supabase
            .from('teachers')
            .select('*')
            .eq('user_id', userId)
            .single();
          setTeacherRecord(tea || null);
          setStudentRecord(null);
        } else {
          setStudentRecord(null);
          setTeacherRecord(null);
        }
      }
    } catch (err) {
      console.error('Failed to load user profile & role record:', err);
    }
  };

  useEffect(() => {
    // Check current active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndRoleRecords(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen to Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfileAndRoleRecords(session.user.id);
      } else {
        setProfile(null);
        setStudentRecord(null);
        setTeacherRecord(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndRoleRecords(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    extra?: { enrollmentNo?: string; employeeId?: string; department?: string; semester?: number; designation?: string }
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });

    if (!error && data.user) {
      const userId = data.user.id;

      // Ensure profile row exists
      await supabase.from('profiles').upsert({
        id: userId,
        email,
        full_name: fullName,
        role: role,
      });

      // Insert role specific record
      if (role === 'student') {
        await supabase.from('students').upsert({
          user_id: userId,
          enrollment_no: extra?.enrollmentNo || `STU-${Date.now().toString().slice(-6)}`,
          department: extra?.department || 'Computer Science',
          semester: extra?.semester || 1,
        });
      } else if (role === 'teacher') {
        await supabase.from('teachers').upsert({
          user_id: userId,
          employee_id: extra?.employeeId || `EMP-${Date.now().toString().slice(-6)}`,
          department: extra?.department || 'Computer Science',
          designation: extra?.designation || 'Assistant Professor',
        });
      }

      await fetchProfileAndRoleRecords(userId);
    }

    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setStudentRecord(null);
    setTeacherRecord(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        studentRecord,
        teacherRecord,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
