import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const AdminRoute = () => {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Comprobamos si el usuario tiene rango de admin, gestor o profesor
    const isAuthorized = profile?.roleName === 'admin' ||
        profile?.roleName === 'manager' ||
        profile?.roleName === 'teacher';

    if (!isAuthorized) {
        // Si es un simple "student", lo mandamos a su panel normal
        return <Navigate to="/dashboard" replace />;
    }

    // Permitido: renderizamos las rutas hijas
    return <Outlet />;
};

export default AdminRoute;
