import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  BookOpen,
  CalendarCheck,
  Award,
  Bell,
  FileText,
  Users,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { profile, signOut } = useAuth();
  const role = profile?.role || 'student';

  const studentLinks = [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/profile', label: 'My Profile', icon: User },
    { to: '/student/subjects', label: 'My Subjects', icon: BookOpen },
    { to: '/student/attendance', label: 'My Attendance', icon: CalendarCheck },
    { to: '/student/marks', label: 'My Marks', icon: Award },
    { to: '/student/notices', label: 'Notice Board', icon: Bell },
    { to: '/student/documents', label: 'Documents', icon: FileText },
  ];

  const teacherLinks = [
    { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/teacher/profile', label: 'My Profile', icon: User },
    { to: '/teacher/students', label: 'Assigned Students', icon: Users },
    { to: '/teacher/attendance', label: 'Manage Attendance', icon: CalendarCheck },
    { to: '/teacher/marks', label: 'Manage Marks', icon: Award },
    { to: '/teacher/notices', label: 'Notices', icon: Bell },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/students', label: 'Students', icon: GraduationCap },
    { to: '/admin/teachers', label: 'Teachers', icon: Briefcase },
    { to: '/admin/subjects', label: 'Subjects', icon: BookOpen },
    { to: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/admin/marks', label: 'Marks & Results', icon: Award },
    { to: '/admin/notices', label: 'Notices', icon: Bell },
    { to: '/admin/users', label: 'User Roles', icon: ShieldCheck },
  ];

  const currentLinks =
    role === 'admin'
      ? adminLinks
      : role === 'teacher'
      ? teacherLinks
      : studentLinks;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                EduPulse <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-400/30">SMS</span>
              </span>
            </div>
          </div>
        </div>

        {/* User preview */}
        <div className="px-4 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-semibold border border-slate-700">
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200 truncate">{profile?.full_name || 'Loading...'}</p>
              <p className="text-xs text-blue-400 capitalize font-mono">{profile?.role || 'user'}</p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {role.toUpperCase()} PORTAL
          </div>
          {currentLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Bottom footer & Sign out */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <div className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Version</span>
            <span className="font-mono text-amber-400 font-semibold">1.0.0 (V1)</span>
          </div>

          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
