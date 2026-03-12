import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, BookOpen, ChevronRight, Search, Calendar, Users, X, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useModal } from '../contexts/ModalContext';

const CourseCatalog = () => {
    const { user, profile } = useAuth();
    const { showAlert } = useModal();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todas');
    const [enrollingId, setEnrollingId] = useState(null);

    // Edition selection modal state
    const [editionModal, setEditionModal] = useState({ open: false, course: null, editions: [], loading: false });

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .schema('iavolution')
                .from('courses')
                .select(`
                    *,
                    instructor:profiles (name),
                    enrollments (user_id, edition_id)
                `)
                .eq('status', 'published')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCourses(data || []);
        } catch (err) {
            console.error('Error fetching courses:', err);
        } finally {
            setLoading(false);
        }
    };

    const openEditionSelector = async (course) => {
        if (!user) {
            window.location.href = '/login';
            return;
        }

        // Restrict self-enrollment for students
        const isStaff = profile?.role === 'admin' || profile?.role === 'teacher' || profile?.role === 'manager';
        if (!isStaff) {
            await showAlert(
                'Solicitud de Matrícula',
                'Para inscribirte en este curso, por favor ponte en contacto con la secretaría o administración del centro.',
                'info'
            );
            return;
        }

        setEditionModal({ open: true, course, editions: [], loading: true });

        try {
            const { data, error } = await supabase
                .schema('iavolution')
                .from('course_editions')
                .select('*')
                .eq('course_id', course.id)
                .eq('status', 'active')
                .order('start_date', { ascending: true });

            if (error) throw error;

            if (!data || data.length === 0) {
                // No editions: enroll directly without edition
                await handleEnroll(course.id, null);
                setEditionModal({ open: false, course: null, editions: [], loading: false });
            } else if (data.length === 1) {
                // Only one edition: enroll directly
                await handleEnroll(course.id, data[0].id);
                setEditionModal({ open: false, course: null, editions: [], loading: false });
            } else {
                // Multiple editions: show selector
                setEditionModal({ open: true, course, editions: data, loading: false });
            }
        } catch (err) {
            console.error('Error fetching editions:', err);
            // Fallback: enroll without edition
            await handleEnroll(course.id, null);
            setEditionModal({ open: false, course: null, editions: [], loading: false });
        }
    };

    const handleEnroll = async (courseId, editionId) => {
        setEnrollingId(courseId);
        try {
            const insertData = { user_id: user.id, course_id: courseId };
            if (editionId) insertData.edition_id = editionId;

            const { error } = await supabase
                .schema('iavolution')
                .from('enrollments')
                .insert([insertData]);

            if (error) {
                if (error.code === '23505') {
                    await showAlert('Ya estás inscrito en esta edición.', 'info');
                } else {
                    throw error;
                }
            } else {
                await showAlert('¡Inscripción exitosa! Ahora puedes acceder al curso desde tu Dashboard.', 'success');
                fetchCourses();
            }
        } catch (err) {
            console.error('Error enrolling:', err);
            await showAlert('Error al inscribirse. Inténtalo de nuevo.', 'error');
        } finally {
            setEnrollingId(null);
            setEditionModal({ open: false, course: null, editions: [], loading: false });
        }
    };

    const categories = ['Todas', ...new Set(courses.map(c => c.category))];

    const filteredCourses = courses.filter(course => {
        const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            course.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'Todas' || course.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Navigation */}
            <div className="mb-8">
                <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
                >
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-slate-700 transition-all">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">Volver al Dashboard</span>
                </Link>
            </div>

            {/* Header */}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
                    Explora nuestros <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Cursos de IA</span>
                </h1>
                <p className="mt-4 text-xl text-slate-400 max-w-2xl mx-auto">
                    Aprende a dominar la Inteligencia Artificial con programas prácticos diseñados para el mundo real.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-10">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar cursos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${selectedCategory === cat
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Course Grid */}
            {filteredCourses.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
                    <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">No se encontraron cursos con estos filtros.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredCourses.map(course => {
                        const isEnrolled = course.enrollments?.some(e => e.user_id === user?.id);

                        return (
                            <div key={course.id} className="group bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col h-full">
                                {/* Course Image */}
                                <div className="relative h-48 overflow-hidden">
                                    <img
                                        src={course.cover_image || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800'}
                                        alt={course.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-slate-950/80 backdrop-blur-md text-indigo-400 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-500/20">
                                            {course.category}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 flex flex-col flex-1">
                                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{course.title}</h3>
                                    <p className="text-slate-400 text-sm mb-4 line-clamp-3">
                                        {course.description}
                                    </p>

                                    <div className="mt-auto pt-6 border-t border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                                                {course.instructor?.name?.charAt(0) || 'I'}
                                            </div>
                                            <span className="text-xs text-slate-400">{course.instructor?.name || 'IAVolution Instructor'}</span>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        {isEnrolled ? (
                                            <Link
                                                to={`/courses/${course.id}`}
                                                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                                            >
                                                Continuar Aprendiendo <ChevronRight className="w-4 h-4" />
                                            </Link>
                                        ) : (
                                            <button
                                                onClick={() => openEditionSelector(course)}
                                                disabled={enrollingId === course.id}
                                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {enrollingId === course.id ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <>Inscribirse Gratis <ChevronRight className="w-4 h-4" /></>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Edition Selector Modal */}
            {editionModal.open && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white">Selecciona una Edición</h3>
                                <p className="text-sm text-slate-400 mt-1">{editionModal.course?.title}</p>
                            </div>
                            <button onClick={() => setEditionModal({ open: false, course: null, editions: [], loading: false })} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                            {editionModal.loading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                </div>
                            ) : (
                                editionModal.editions.map(edition => (
                                    <button
                                        key={edition.id}
                                        onClick={() => handleEnroll(editionModal.course.id, edition.id)}
                                        disabled={enrollingId}
                                        className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500 p-4 rounded-xl text-left transition-all group/ed disabled:opacity-50"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-bold text-white group-hover/ed:text-indigo-400 transition-colors">{edition.name}</h4>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {edition.start_date ? new Date(edition.start_date).toLocaleDateString() : 'Sin inicio'} -
                                                        {edition.end_date ? new Date(edition.end_date).toLocaleDateString() : 'Sin fin'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3.5 h-3.5" />
                                                        {edition.max_students ? `Cupo: ${edition.max_students}` : 'Ilimitado'}
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-600 group-hover/ed:text-indigo-400 transition-colors" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseCatalog;
