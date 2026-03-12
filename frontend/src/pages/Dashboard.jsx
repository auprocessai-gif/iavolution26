import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    LogOut,
    BookOpen,
    LayoutDashboard,
    BrainCircuit,
    Loader2,
    ChevronRight,
    CheckCircle2,
    Calendar,
    Settings,
    Clock,
    Play
} from 'lucide-react';
import { Link } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';

const Dashboard = () => {
    const { user, profile, logout } = useAuth();
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchEnrollments();
        }
    }, [user]);

    const [error, setError] = useState(null);

    const fetchEnrollments = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch basic enrollments (student view)
            const { data: enrData, error: enrError } = await supabase
                .schema('iavolution')
                .from('enrollments')
                .select(`
                    *,
                    course:courses(id, title, description, cover_image_url),
                    edition:course_editions(name, start_date, end_date)
                `)
                .eq('user_id', user.id);

            if (enrError) throw enrError;

            // 2. Fetch courses where user is the teacher
            const { data: teacherCourses, error: teacherError } = await supabase
                .schema('iavolution')
                .from('courses')
                .select('id, title, description, cover_image_url, status')
                .eq('teacher_id', user.id);

            if (teacherError) throw teacherError;

            // 3. Fetch all lesson progress for this user
            const { data: progData, error: progError } = await supabase
                .schema('iavolution')
                .from('lesson_progress')
                .select('lesson_id')
                .eq('user_id', user.id);

            if (progError) throw progError;
            const completedLessonIds = new Set(progData.map(p => p.lesson_id));

            // 3b. Fetch material views (Separate try/catch to avoid breaking everything)
            let viewedMaterialIds = new Set();
            try {
                const { data: mvData, error: mvError } = await supabase
                    .schema('iavolution')
                    .from('material_views')
                    .select('material_id')
                    .eq('user_id', user.id);
                if (!mvError) {
                    viewedMaterialIds = new Set((mvData || []).map(v => v.material_id));
                }
            } catch (e) {
                console.warn('material_views fetch error:', e);
            }

            // 3c. Fetch metadata for all courses (to get stats)
            // We do this to avoid deep nested joins that fail with RLS errors
            const allCourseIds = [
                ...(enrData || []).map(e => e.course_id),
                ...(teacherCourses || []).map(c => c.id)
            ];

            const { data: courseMeta, error: metaError } = await supabase
                .schema('iavolution')
                .from('courses')
                .select('id, modules(id, lessons(id, materials(id)))')
                .in('id', allCourseIds);

            const courseStatsMap = {};
            if (!metaError && courseMeta) {
                courseMeta.forEach(c => {
                    const allLessons = c.modules?.flatMap(m => m.lessons) || [];
                    const allMaterials = allLessons.flatMap(l => l.materials || []);
                    
                    const totalItems = allLessons.length + allMaterials.length;
                    const completedLessonsCount = allLessons.filter(l => completedLessonIds.has(l.id)).length;
                    const viewedMaterialsCount = allMaterials.filter(m => viewedMaterialIds.has(m.id)).length;
                    const completedItems = completedLessonsCount + viewedMaterialsCount;

                    courseStatsMap[c.id] = {
                        totalLessons: allLessons.length,
                        completedInCourse: completedLessonsCount,
                        percent: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
                    };
                });
            }

            // 4. Process enrollments from student view
            const processedEnrollments = (enrData || []).map(enr => ({
                ...enr,
                isTeacherRole: false,
                stats: courseStatsMap[enr.course_id] || { totalLessons: 0, completedInCourse: 0, percent: 0 }
            }));

            // 5. Process courses from teacher view
            const enrolledCourseIds = new Set(processedEnrollments.map(e => e.course.id));
            const teacherEnrollments = (teacherCourses || [])
                .filter(c => !enrolledCourseIds.has(c.id))
                .map(course => ({
                    id: `teacher-${course.id}`,
                    course: course,
                    isTeacherRole: true,
                    stats: courseStatsMap[course.id] || { totalLessons: 0, completedInCourse: 0, percent: 0 }
                }));

            setEnrollments([...processedEnrollments, ...teacherEnrollments]);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    const handleLogout = async () => {
        await logout();
    };

    if (!profile) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="bg-slate-900 border border-red-500/30 p-8 rounded-2xl max-w-md text-center">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <LogOut className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Perfil No Encontrado</h2>
                <p className="text-slate-400 mb-6 font-medium leading-relaxed">
                    Tu cuenta existe en el sistema base, pero no tiene un perfil configurado en la academia <span className="text-blue-400">IAVolution</span>.
                    <br /><br />
                    Esto suele ocurrir si usaste una cuenta de otro proyecto del servidor. Por favor, crea una cuenta nueva.
                </p>
                <button
                    onClick={handleLogout}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-xl transition-all"
                >
                    Volver al Inicio y Cerrar Sesión
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <BrainCircuit className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white font-bold text-xl tracking-tight">IAVolution</span>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 bg-blue-500/10 text-blue-400 rounded-lg transition-colors font-medium">
                        <LayoutDashboard className="w-5 h-5" />
                        Mi Progreso
                    </Link>
                    <Link to="/courses" className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors font-medium">
                        <BookOpen className="w-5 h-5" />
                        Explorar Cursos
                    </Link>
                    <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors font-medium">
                        <Settings className="w-5 h-5" />
                        Mi Perfil
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-2 py-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-slate-300 font-medium">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                            ) : (
                                profile.name?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{profile.name}</p>
                            <p className="text-xs text-slate-400 truncate capitalize">{profile.roleName || 'Student'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Bienvenido, {profile.name}</h1>
                        <p className="text-slate-400 mt-1 text-lg">Aquí tienes un resumen de tu actividad.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        {profile.roleName !== 'student' && (
                            <Link
                                to="/admin"
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20"
                            >
                                Ir al Panel de Control
                            </Link>
                        )}
                    </div>
                </header>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                        <h3 className="text-slate-500 text-sm font-medium mb-2 uppercase tracking-wider">Cursos Activos</h3>
                        <p className="text-4xl font-black text-white">{enrollments.length}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                        <h3 className="text-slate-500 text-sm font-medium mb-2 uppercase tracking-wider">Certificados</h3>
                        <p className="text-4xl font-black text-white">0</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                        <h3 className="text-slate-500 text-sm font-medium mb-2 uppercase tracking-wider">Puntos de IA</h3>
                        <p className="text-4xl font-black text-white">--</p>
                    </div>
                </div>

                {/* Active Courses Grid */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-400" />
                            Mis Cursos en Curso
                        </h2>
                        {enrollments.length > 0 && (
                            <Link to="/courses" className="text-sm text-blue-400 hover:underline">Explorar más</Link>
                        )}
                    </div>
                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm font-medium flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                <LogOut className="w-4 h-4" />
                            </div>
                            <p>No se pudieron cargar todos los datos: {error}. Los cursos pueden no mostrarse correctamente.</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : enrollments.length === 0 ? (
                        <div className="text-center py-16 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
                            <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-300 text-lg font-medium">Aún no te has inscrito en ningún curso.</p>
                            <Link
                                to="/courses"
                                className="mt-6 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all"
                            >
                                Ver Catálogo de Cursos <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {enrollments.map(enr => (
                                <Link
                                    key={enr.id}
                                    to={`/courses/${enr.course.id}`}
                                    className="group bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-blue-500/50 transition-all flex flex-col sm:flex-row h-full"
                                >
                                    <div className="sm:w-48 h-32 sm:h-auto overflow-hidden">
                                        <img
                                            src={enr.course.cover_image_url || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=400'}
                                            alt={enr.course.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                                        />
                                    </div>
                                    <div className="p-6 flex flex-col flex-1">
                                        <span className="text-[10px] uppercase font-bold text-blue-400 mb-1 tracking-widest">{enr.course.category}</span>
                                        <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{enr.course.title}</h3>
                                        <div className="flex flex-wrap gap-2 mb-1">
                                            {enr.isTeacherRole && (
                                                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full inline-block">
                                                    Instructor
                                                </span>
                                            )}
                                            {enr.edition && (
                                                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-widest bg-purple-500/10 px-2 py-0.5 rounded-full inline-block">
                                                    {enr.edition.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-auto flex items-center justify-between pt-4">
                                            <div className="flex-1 mr-4">
                                                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-bold">
                                                    <span>PROGRESO</span>
                                                    <span>{enr.stats.percent}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                                                        style={{ width: `${enr.stats.percent}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center group-hover:bg-indigo-500 group-hover:scale-110 transition-all shadow-lg shadow-indigo-600/20">
                                                <Play className="w-4 h-4 fill-current ml-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
