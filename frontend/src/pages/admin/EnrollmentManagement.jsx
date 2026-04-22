import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
    Users,
    BookOpen,
    Search,
    Plus,
    Trash2,
    Loader2,
    ChevronRight,
    UserPlus,
    Calendar,
    Filter,
    X,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

const EnrollmentManagement = () => {
    const { profile } = useAuth();
    const { showAlert, showConfirm } = useModal();
    const { createNotification } = useNotifications();

    // States for data
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [editions, setEditions] = useState([]);
    const [enrollments, setEnrollments] = useState([]);

    // States for UI
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [courseSearch, setCourseSearch] = useState('');

    // Selection states
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedEdition, setSelectedEdition] = useState('');

    // Filter states
    const [filterCourse, setFilterCourse] = useState('all');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Students (profiles with role 'student')
            const { data: studentsData, error: studentsError } = await supabase
                .schema('iavolution')
                .from('profiles')
                .select('*, roles(name)')
                .order('name', { ascending: true });

            if (studentsError) throw studentsError;

            // Filter only students (or anyone if you want to allow enrolling teachers too?)
            // Usually we only enroll users with role 'student'
            const onlyStudents = studentsData.filter(p => p.roles?.name === 'student');
            setStudents(onlyStudents);

            // 2. Fetch Courses
            const { data: coursesData, error: coursesError } = await supabase
                .schema('iavolution')
                .from('courses')
                .select('*')
                .eq('status', 'published')
                .order('title', { ascending: true });

            if (coursesError) throw coursesError;
            setCourses(coursesData);

            // 3. Fetch Enrollments with details
            const { data: enrollmentsData, error: enrollmentsError } = await supabase
                .schema('iavolution')
                .from('enrollments')
                .select(`
                    id,
                    enrolled_at,
                    progress,
                    user:profiles!enrollments_user_id_fkey (id, name, email),
                    course:courses!enrollments_course_id_fkey (id, title),
                    edition:course_editions!enrollments_edition_id_fkey (id, name)
                `)
                .order('enrolled_at', { ascending: false });

            if (enrollmentsError) throw enrollmentsError;
            setEnrollments(enrollmentsData || []);

        } catch (err) {
            console.error('Error fetching data:', err);
            showAlert('Error al cargar datos: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const fetchEditions = async (courseId) => {
        try {
            const { data, error } = await supabase
                .schema('iavolution')
                .from('course_editions')
                .select('*')
                .eq('course_id', courseId)
                .eq('status', 'active')
                .order('start_date', { ascending: true });

            if (error) throw error;
            setEditions(data || []);
            setSelectedEdition('');
        } catch (err) {
            console.error('Error fetching editions:', err);
        }
    };

    const handleSelectCourse = (course) => {
        setSelectedCourse(course);
        fetchEditions(course.id);
    };

    const handleEnroll = async () => {
        if (!selectedStudent || !selectedCourse) {
            showAlert('Por favor selecciona un alumno y un curso.', 'warning');
            return;
        }

        setActionLoading(true);
        try {
            const insertData = {
                user_id: selectedStudent.id,
                course_id: selectedCourse.id,
                edition_id: selectedEdition || null
            };

            const { error } = await supabase
                .schema('iavolution')
                .from('enrollments')
                .insert([insertData]);

            if (error) {
                if (error.code === '23505') {
                    throw new Error('El alumno ya está matriculado en este curso/edición.');
                }
                throw error;
            }

            // Notify student
            await createNotification({
                user_id: selectedStudent.id,
                type: 'enrollment',
                title: 'Nueva Matrícula',
                message: `Has sido matriculado en el curso "${selectedCourse.title}"${selectedEdition ? ` (${editions.find(e => e.id === selectedEdition)?.name})` : ''}.`,
                link: `/courses/${selectedCourse.id}`
            });

            await showAlert('Alumno matriculado con éxito.', 'success');

            // Reset selection
            setSelectedStudent(null);
            setSelectedCourse(null);
            setSelectedEdition('');
            setEditions([]);
            setSearchTerm('');
            setCourseSearch('');

            // Refresh list
            fetchData();
        } catch (err) {
            console.error('Error enrolling:', err);
            showAlert('Error al matricular: ' + err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnenroll = async (enrollmentId) => {
        const confirmed = await showConfirm(
            '¿Dar de baja?',
            'Esta acción eliminará el acceso del alumno al curso y borrará su progreso.',
            'warning'
        );

        if (!confirmed) return;

        setActionLoading(true);
        try {
            const { error } = await supabase
                .schema('iavolution')
                .from('enrollments')
                .delete()
                .eq('id', enrollmentId);

            if (error) throw error;

            await showAlert('Matrícula eliminada con éxito.', 'success');
            fetchData();
        } catch (err) {
            console.error('Error unenrolling:', err);
            showAlert('Error al dar de baja: ' + err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredStudents = students.filter(s => {
        const name = (s.name || '').toLowerCase();
        const email = (s.email || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        return name.includes(search) || email.includes(search);
    });

    const filteredCoursesList = courses.filter(c =>
        c.title?.toLowerCase().includes(courseSearch.toLowerCase())
    );

    const filteredEnrollments = enrollments.filter(e => {
        if (filterCourse === 'all') return true;
        return e.course?.id === filterCourse;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-slate-400 font-medium">Cargando sistema de matrículas...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <UserPlus className="w-8 h-8 text-indigo-400" /> Gestión de Matrículas
                </h1>
                <p className="text-slate-400 mt-2">
                    Inscribe alumnos en cursos y ediciones, o gestiona las matrículas existentes.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Section 1: Select Student & Course */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-indigo-400" /> Nueva Matrícula
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Student Selection */}
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">1. Seleccionar Alumno</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar alumno por nombre o email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                    />
                                </div>
                                <div className="max-h-[300px] overflow-y-auto bg-slate-950 rounded-2xl border border-slate-800 custom-scrollbar">
                                    {filteredStudents.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 italic text-sm">No hay alumnos que coincidan.</div>
                                    ) : (
                                        filteredStudents.map(student => (
                                            <button
                                                key={student.id}
                                                onClick={() => setSelectedStudent(student)}
                                                className={`w-full text-left p-4 border-b border-slate-900/50 last:border-0 transition-all flex items-center justify-between group ${selectedStudent?.id === student.id ? 'bg-indigo-600 border-indigo-500' : 'hover:bg-slate-900'}`}
                                            >
                                                <div className="min-w-0">
                                                    <p className={`font-bold truncate ${selectedStudent?.id === student.id ? 'text-white' : 'text-slate-200'}`}>
                                                        {student.name || 'Sin nombre'}
                                                    </p>
                                                    <p className={`text-xs truncate ${selectedStudent?.id === student.id ? 'text-indigo-200' : 'text-slate-500'}`}>
                                                        {student.email}
                                                    </p>
                                                </div>
                                                {selectedStudent?.id === student.id && <CheckCircle2 className="w-5 h-5 text-white shrink-0 ml-2" />}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Course & Edition Selection */}
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">2. Seleccionar Curso</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar curso por título..."
                                        value={courseSearch}
                                        onChange={(e) => setCourseSearch(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                    />
                                </div>
                                <div className="max-h-[300px] overflow-y-auto bg-slate-950 rounded-2xl border border-slate-800 custom-scrollbar">
                                    {filteredCoursesList.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 italic text-sm">No hay cursos publicados.</div>
                                    ) : (
                                        filteredCoursesList.map(course => (
                                            <button
                                                key={course.id}
                                                onClick={() => handleSelectCourse(course)}
                                                className={`w-full text-left p-4 border-b border-slate-900/50 last:border-0 transition-all flex items-center justify-between group ${selectedCourse?.id === course.id ? 'bg-indigo-600 border-indigo-500' : 'hover:bg-slate-900'}`}
                                            >
                                                <div className="min-w-0">
                                                    <p className={`font-bold truncate ${selectedCourse?.id === course.id ? 'text-white' : 'text-slate-200'}`}>
                                                        {course.title}
                                                    </p>
                                                    <p className={`text-xs ${selectedCourse?.id === course.id ? 'text-indigo-200' : 'text-slate-500'}`}>
                                                        {course.category}
                                                    </p>
                                                </div>
                                                {selectedCourse?.id === course.id && <CheckCircle2 className="w-5 h-5 text-white shrink-0 ml-2" />}
                                            </button>
                                        ))
                                    )}
                                </div>

                                {/* Edition Selection UI */}
                                {selectedCourse && (
                                    <div className="animate-in slide-in-from-top-2 duration-300 pt-4 border-t border-slate-800">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">3. Edición (Opcional)</label>
                                        {editions.length > 0 ? (
                                            <select
                                                value={selectedEdition}
                                                onChange={(e) => setSelectedEdition(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="">Curso Base (Sin edición específica)</option>
                                                {editions.map(ed => (
                                                    <option key={ed.id} value={ed.id}>{ed.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="bg-slate-950 text-slate-500 border border-slate-800 rounded-xl px-4 py-3 text-xs italic">
                                                Este curso no tiene ediciones activas.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Summary & Confirm Button */}
                        <div className="mt-8 pt-8 border-t border-slate-800">
                            {selectedStudent && selectedCourse ? (
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-xl">
                                            {selectedStudent.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold">Resumen de Matrícula</p>
                                            <p className="text-sm text-slate-400">
                                                <span className="text-indigo-400">{selectedStudent.name}</span> en el curso <span className="text-indigo-400">{selectedCourse.title}</span>
                                                {selectedEdition && <span className="text-slate-300"> ({editions.find(e => e.id === selectedEdition)?.name})</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleEnroll}
                                        disabled={actionLoading}
                                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                                        Matricular Alumno
                                    </button>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-slate-600 italic border border-dashed border-slate-800 rounded-2xl">
                                    Selecciona un alumno y un curso para habilitar la matrícula.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 2: Stats or Recent Activities */}
                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl overflow-hidden relative">
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold text-white mb-6">Estado de Alumnos</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm text-slate-300 font-medium">Alumnos Totales</span>
                                    </div>
                                    <span className="text-xl font-bold text-white tracking-widest">{students.length}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm text-slate-300 font-medium">Matrículas Activas</span>
                                    </div>
                                    <span className="text-xl font-bold text-white tracking-widest">{enrollments.length}</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 rounded-full"></div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/10 rounded-3xl p-8">
                        <AlertCircle className="w-8 h-8 text-indigo-400 mb-4" />
                        <h4 className="text-white font-bold mb-2">Ayuda</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Las matrículas vinculan a un alumno con un contenido específico. Si asignas una **Edición**, el alumno participará solo en ese grupo con sus fechas y calendario propios.
                        </p>
                    </div>
                </div>
            </div>

            {/* Enrollment History Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
                <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-950/30">
                    <div>
                        <h2 className="text-xl font-bold text-white">Historial de Matrículas</h2>
                        <p className="text-sm text-slate-500 mt-1">Lista detallada de todos los alumnos inscritos.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <select
                                value={filterCourse}
                                onChange={(e) => setFilterCourse(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                            >
                                <option value="all">Todos los cursos</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-950/50">
                            <tr>
                                <th className="text-left text-[10px] font-black uppercase text-slate-500 tracking-widest px-8 py-4">Alumno</th>
                                <th className="text-left text-[10px] font-black uppercase text-slate-500 tracking-widest px-8 py-4">Curso / Edición</th>
                                <th className="text-left text-[10px] font-black uppercase text-slate-500 tracking-widest px-8 py-4">Fecha</th>
                                <th className="text-center text-[10px] font-black uppercase text-slate-500 tracking-widest px-8 py-4">Progreso</th>
                                <th className="text-right text-[10px] font-black uppercase text-slate-500 tracking-widest px-8 py-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {filteredEnrollments.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <BookOpen className="w-12 h-12 text-slate-800 mb-4" />
                                            <p className="text-slate-500">No hay matrículas registradas para los filtros seleccionados.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredEnrollments.map((enrollment) => (
                                    <tr key={enrollment.id} className="hover:bg-slate-800/20 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400 group-hover:scale-110 transition-transform">
                                                    {enrollment.user?.name?.charAt(0) || 'U'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-white font-bold truncate text-sm">{enrollment.user?.name}</p>
                                                    <p className="text-slate-500 text-xs truncate">{enrollment.user?.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="min-w-0">
                                                <p className="text-white text-sm font-medium truncate">{enrollment.course?.title}</p>
                                                {enrollment.edition ? (
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <Calendar className="w-3 h-3 text-amber-500" />
                                                        <span className="text-xs text-amber-500/80 font-bold tracking-tight uppercase">{enrollment.edition.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter mt-1 block">Curso Libre</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-xs text-slate-400 tabular-nums">
                                                {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 transition-all duration-1000"
                                                        style={{ width: `${enrollment.progress}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500">{enrollment.progress}%</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button
                                                onClick={() => handleUnenroll(enrollment.id)}
                                                className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                                                title="Dar de baja"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EnrollmentManagement;
