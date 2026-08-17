import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const DashboardRedirect: React.FC = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Directing to your portal..." size="lg" />
      </div>
    );
  }

  const role = profile?.role || 'student';

  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (role === 'teacher') {
    return <Navigate to="/teacher/dashboard" replace />;
  } else {
    return <Navigate to="/student/dashboard" replace />;
  }
};
