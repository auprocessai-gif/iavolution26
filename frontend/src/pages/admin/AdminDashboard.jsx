import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BookOpen, Users, Video, FileText, Loader2, ArrowRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
    const { profile } = useAuth();
    const [stats, setStats] = useState({
        courses: 0,
        students: 0,
        lessons: 0,
        materials: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const [coursesRes, studentsRes, lessonsRes, materialsRes] = await Promise.all([
                supabase.schema('iavolution').from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
                supabase.schema('iavolution').from('profiles').select('id', { count: 'exact', head: true }),
                supabase.schema('iavolution').from('lessons').select('id', { count: 'exact', head: true }),
                supabase.schema('iavolution').from('materials').select('id', { count: 'exact', head: true })
            ]);

            setStats({
                courses: coursesRes.count || 0,
                students: studentsRes.count || 0,
                lessons: lessonsRes.count || 0,
                materials: materialsRes.count || 0
            });
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                    Panel de Control
                </h1>
                <p className="text-slate-400">
                    Bienvenido al centro de mando, {profile?.name}. Desde aquí gestionas el contenido de la academia.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Stats Cards */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">{loading ? '...' : stats.courses}</p>
                            <p className="text-sm text-slate-400 font-medium">Cursos Publicados</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">{loading ? '...' : stats.students}</p>
                            <p className="text-sm text-slate-400 font-medium">Alumnos Activos</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                            <Video className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">{loading ? '...' : stats.lessons}</p>
                            <p className="text-sm text-slate-400 font-medium">Lecciones Totales</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">{loading ? '...' : stats.materials}</p>
                            <p className="text-sm text-slate-400 font-medium">Materiales Base</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Getting Started */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col">
                    <h2 className="text-xl font-bold text-white mb-6">Accesos Rápidos</h2>
                    <div className="space-y-4 flex-1">
                        <Link to="/admin/courses/new" className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-indigo-500/50 group transition-all">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <span className="text-slate-200 font-medium">Crear Nuevo Curso</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                        </Link>
                        <Link to="/admin/enrollments" className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-orange-500/50 group transition-all">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                                    <Users className="w-5 h-5" />
                                </div>
                                <span className="text-slate-200 font-medium">Gestionar Matrículas</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 transition-colors" />
                        </Link>
                        <Link to="/admin/users" className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-500/50 group transition-all">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-500/10 rounded-lg text-slate-400">
                                    <Users className="w-5 h-5" />
                                </div>
                                <span className="text-slate-200 font-medium">Gestionar Alumnos</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                        </Link>
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 rounded-2xl p-8 flex flex-col justify-center">
                    <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Evoluciona tu Formación</h2>
                    <p className="text-slate-300 leading-relaxed mb-6">
                        Usa la inteligencia artificial para potenciar tus cursos. Recuerda que puedes añadir cuestionarios y tareas interactivas en cada lección para medir el progreso de tus alumnos.
                    </p>
                    <div className="flex items-center gap-4 text-indigo-400 font-bold text-sm bg-indigo-500/10 self-start px-4 py-2 rounded-full border border-indigo-500/20">
                        <Shield className="w-4 h-4" /> Administrador Certificado
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
