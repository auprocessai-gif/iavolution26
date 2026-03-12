import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BrainCircuit, BookOpen, Users, Settings, LogOut, LayoutDashboard, BarChart3, Bell } from 'lucide-react';
import NotificationBell from './NotificationBell';

const AdminLayout = () => {
    const { profile, logout } = useAuth();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
    };

    const navItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Resumen' },
        { path: '/admin/courses', icon: BookOpen, label: 'Gestión de Cursos' },
        { path: '/admin/grades', icon: BrainCircuit, label: 'Calificaciones' },
        { path: '/admin/analytics', icon: BarChart3, label: 'Analíticas' },
        { path: '/admin/enrollments', icon: Users, label: 'Matrículas' },
        { path: '/admin/users', icon: Users, label: 'Alumnos' },
        { path: '/admin/settings', icon: Settings, label: 'Ajustes' },
    ];

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col hidden md:flex">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <BrainCircuit className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-white tracking-tight">IAVolution Admin</span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-orange-500/10 text-orange-400 font-medium'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <Link to="/profile" className="flex items-center gap-3 px-4 py-3 mb-2 group">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-medium border border-slate-700 overflow-hidden group-hover:border-indigo-500 transition-colors">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                            ) : (
                                profile?.name?.[0]?.toUpperCase() || 'A'
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate group-hover:text-indigo-400 transition-colors">{profile?.name}</p>
                            <p className="text-xs text-orange-400 capitalize">{profile?.roleName}</p>
                        </div>
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">Cerrar Sesión</span>
                    </button>

                    <Link
                        to="/dashboard"
                        className="w-full flex justify-center text-xs text-slate-500 hover:text-slate-300 mt-4 transition-colors"
                    >
                        Ver vista de Alumno &rarr;
                    </Link>
                </div>
            </aside>

            {/* Main Content (Outlet) */}
            <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-8">
                    <div className="md:hidden text-white font-bold">Admin</div>
                    <div className="hidden md:block"></div> {/* Spacer for desktop */}
                    <NotificationBell />
                </header>
                <div className="flex-1 p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
