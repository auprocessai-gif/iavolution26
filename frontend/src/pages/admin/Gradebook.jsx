import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Search,
    Filter,
    BookOpen,
    Users,
    CheckCircle2,
    Clock,
    AlertCircle,
    MoreHorizontal,
    GraduationCap,
    Calendar,
    ChevronRight,
    Loader2,
    X,
    FileText,
    Send,
    ExternalLink
} from 'lucide-react';
import { useModal } from '../../contexts/ModalContext';
import { useNotifications } from '../../contexts/NotificationContext';

const Gradebook = () => {
    const { showAlert } = useModal();
    const { createNotification } = useNotifications();
    const [courses, setCourses] = useState([]);
    const [editions, setEditions] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedEdition, setSelectedEdition] = useState('');
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingEditions, setLoadingEditions] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isGrading, setIsGrading] = useState(false);
    const [gradingData, setGradingData] = useState({ grade: '', feedback: '', submissionId: '' });

    // Placeholder for user and profile data - in a real app, these would come from auth context or similar
    const [user, setUser] = useState({ id: 'some-user-id' }); // Replace with actual user ID
    const [profile, setProfile] = useState({ roles: { name: 'admin' } }); // Replace with actual profile/role

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            let query = supabase
                .schema('iavolution')
                .from('courses')
                .select('id, title, teacher_id')
                .eq('status', 'published');

            // If user is a teacher, only show courses assigned to them
            if (profile?.roles?.name === 'teacher') {
                query = query.eq('teacher_id', user.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            setCourses(data || []);

            if (data?.length > 0) {
                const firstId = data[0].id;
                setSelectedCourse(firstId);
                fetchEditions(firstId);
            }
        } catch (err) {
            console.error('Error fetching courses:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchEditions = async (courseId) => {
        setLoadingEditions(true);
        setSelectedEdition('');
        try {
            const { data, error } = await supabase
                .schema('iavolution')
                .from('course_editions')
                .select('*')
                .eq('course_id', courseId)
                .order('start_date', { ascending: false });
            if (error) throw error;
            setEditions(data || []);

            if (data?.length > 0) {
                setSelectedEdition(data[0].id);
                fetchStudents(courseId, data[0].id);
            } else {
                fetchStudents(courseId, null);
            }
        } catch (err) {
            console.error('Error fetching editions:', err);
        } finally {
            setLoadingEditions(false);
        }
    };

    const fetchStudents = async (courseId, editionId) => {
        if (!courseId) return;
        setLoadingStudents(true);
        try {
            // First, get all modules and lessons for this course to calculate progress later
            const { data: moduleData } = await supabase
                .schema('iavolution')
                .from('modules')
                .select('id, lessons(id)')
                .eq('course_id', courseId);

            const totalLessons = moduleData?.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0) || 0;

            // Get students enrolled in this course/edition
            let query = supabase
                .schema('iavolution')
                .from('enrollments')
                .select(`
                    user_id,
                    profiles:user_id (id, name, email),
                    edition_id
                `)
                .eq('course_id', courseId);

            if (editionId) {
                query = query.eq('edition_id', editionId);
            } else {
                query = query.is('edition_id', null);
            }

            const { data: enrolledData, error: enrollError } = await query;
            if (enrollError) throw enrollError;

            // For each student, get their progress and submissions
            const studentPromises = (enrolledData || []).map(async (enrollment) => {
                const userId = enrollment.user_id;

                // Get progress
                const { data: progressData } = await supabase
                    .schema('iavolution')
                    .from('lesson_progress')
                    .select('lesson_id')
                    .eq('user_id', userId);

                // Get submissions
                const { data: submissionData } = await supabase
                    .schema('iavolution')
                    .from('submissions')
                    .select('*, assignments(title, max_points, lesson_id)')
                    .eq('user_id', userId);

                // Get quiz attempts
                const { data: attemptData } = await supabase
                    .schema('iavolution')
                    .from('quiz_attempts')
                    .select('*, quizzes(title, passing_score, lesson_id)')
                    .eq('user_id', userId);

                const completedCount = progressData?.length || 0;
                const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

                return {
                    ...enrollment.profiles,
                    progress: progressPercent,
                    completedCount,
                    totalLessons,
                    submissions: submissionData || [],
                    attempts: attemptData || []
                };
            });

            const resolvedStudents = await Promise.all(studentPromises);
            setStudents(resolvedStudents);
        } catch (err) {
            console.error('Error fetching students:', err);
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleCourseChange = (courseId) => {
        setSelectedCourse(courseId);
        fetchEditions(courseId);
    };

    const handleEditionChange = (editionId) => {
        setSelectedEdition(editionId);
        fetchStudents(selectedCourse, editionId);
    };

    const handleGradeSubmission = async () => {
        if (!gradingData.grade || isGrading) return;

        setIsGrading(true);
        try {
            const { error } = await supabase
                .schema('iavolution')
                .from('submissions')
                .update({
                    grade: parseInt(gradingData.grade),
                    feedback: gradingData.feedback,
                    status: 'graded',
                    graded_at: new Date().toISOString()
                })
                .eq('id', gradingData.submissionId);

            if (error) throw error;

            // Send notification to student
            const targetSubmission = selectedStudent.submissions.find(s => s.id === gradingData.submissionId);
            await createNotification({
                user_id: selectedStudent.id,
                type: 'grade',
                title: 'Tarea Calificada',
                message: `Tu entrega para "${targetSubmission?.assignments?.title || 'una tarea'}" ha sido calificada con ${gradingData.grade}/100.`,
                link: `/courses/${selectedCourse}`
            });

            await showAlert('Calificación guardada con éxito.', 'success');
            // Update local state instead of refetching everything
            const updatedStudents = students.map(s => {
                if (s.id === selectedStudent.id) {
                    return {
                        ...s,
                        submissions: s.submissions.map(sub =>
                            sub.id === gradingData.submissionId
                                ? { ...sub, grade: parseInt(gradingData.grade), feedback: gradingData.feedback, status: 'graded' }
                                : sub
                        )
                    };
                }
                return s;
            });
            setStudents(updatedStudents);

            // Update selected student in modal
            const updatedStudent = updatedStudents.find(s => s.id === selectedStudent.id);
            setSelectedStudent(updatedStudent);

            setGradingData({ grade: '', feedback: '', submissionId: '' });
        } catch (err) {
            console.error('Error grading:', err);
            await showAlert('Error al guardar la calificación.', 'error');
        } finally {
            setIsGrading(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Calificaciones</h2>
                    <p className="text-slate-400 mt-1">Sigue el progreso y evalúa las entregas de tus alumnos.</p>
                </div>
            </header>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Curso</label>
                    <div className="relative">
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <select
                            value={selectedCourse}
                            onChange={(e) => handleCourseChange(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                        >
                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Edición</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <select
                            value={selectedEdition}
                            onChange={(e) => handleEditionChange(e.target.value)}
                            disabled={loadingEditions || editions.length === 0}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none disabled:opacity-50"
                        >
                            {editions.length === 0 ? (
                                <option value="">Sin ediciones</option>
                            ) : (
                                editions.map(ed => (
                                    <option key={ed.id} value={ed.id}>
                                        {ed.name} {ed.start_date ? `(${new Date(ed.start_date).toLocaleDateString()})` : ''}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Buscar Alumno</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-950/50 border-b border-slate-800">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Alumno</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Progreso</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Evaluaciones</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {loadingStudents ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                                    Cargando datos de alumnos...
                                </td>
                            </tr>
                        ) : filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-slate-500 italic">
                                    No se encontraron alumnos para esta búsqueda.
                                </td>
                            </tr>
                        ) : (
                            filteredStudents.map(student => {
                                const pendingGrading = student.submissions.filter(s => !s.grade).length;
                                const avgQuizScore = student.attempts.length > 0
                                    ? Math.round(student.attempts.reduce((acc, at) => acc + at.score, 0) / student.attempts.length)
                                    : null;

                                return (
                                    <tr key={student.id} className="hover:bg-indigo-500/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                                                    {student.name?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white leading-tight">{student.name}</p>
                                                    <p className="text-xs text-slate-500 leading-tight">{student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-full max-w-[120px]">
                                                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-bold">
                                                    <span>{student.progress}%</span>
                                                    <span>{student.completedCount}/{student.totalLessons}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 transition-all duration-500"
                                                        style={{ width: `${student.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {pendingGrading > 0 && (
                                                    <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                                                        {pendingGrading} Tareas Pendientes
                                                    </span>
                                                )}
                                                {avgQuizScore !== null && (
                                                    <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                                                        Quiz: {avgQuizScore}%
                                                    </span>
                                                )}
                                                {pendingGrading === 0 && student.submissions.length > 0 && (
                                                    <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                        Todo Corregido
                                                    </span>
                                                )}
                                                {student.submissions.length === 0 && student.attempts.length === 0 && (
                                                    <span className="text-[10px] text-slate-600 italic">Sin entregas</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedStudent(student)}
                                                className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-all"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Student Detail Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xl font-bold font-mono">
                                    {selectedStudent.name?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{selectedStudent.name}</h3>
                                    <p className="text-slate-400 text-sm">{selectedStudent.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Lecciones</p>
                                    <p className="text-2xl font-bold text-white">{selectedStudent.completedCount}/{selectedStudent.totalLessons}</p>
                                    <div className="mt-2 h-1 w-full bg-slate-900 rounded-full">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${selectedStudent.progress}%` }} />
                                    </div>
                                </div>
                                <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Tareas Entregadas</p>
                                    <p className="text-2xl font-bold text-white">{selectedStudent.submissions.length}</p>
                                    <p className="text-[10px] text-amber-500 mt-1 font-bold">
                                        {selectedStudent.submissions.filter(s => !s.grade).length} pendientes de corregir
                                    </p>
                                </div>
                                <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Nota Media Quiz</p>
                                    <p className="text-2xl font-bold text-white">
                                        {selectedStudent.attempts.length > 0
                                            ? `${Math.round(selectedStudent.attempts.reduce((acc, at) => acc + at.score, 0) / selectedStudent.attempts.length)}%`
                                            : '--'}
                                    </p>
                                    <p className="text-[10px] text-indigo-400 mt-1 font-bold">{selectedStudent.attempts.length} cuestionarios hechos</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Assignments List */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-indigo-400" /> Entregas de Tareas
                                    </h4>
                                    <div className="space-y-3">
                                        {selectedStudent.submissions.length === 0 ? (
                                            <p className="text-slate-500 text-sm italic">No hay tareas entregadas aún.</p>
                                        ) : (
                                            selectedStudent.submissions.map(sub => (
                                                <div key={sub.id} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <h5 className="font-bold text-slate-200 text-sm">{sub.assignments?.title}</h5>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.grade ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                                            {sub.grade ? `${sub.grade}/${sub.assignments?.max_points}` : 'Pendiente'}
                                                        </span>
                                                    </div>

                                                    <div className="bg-slate-900 rounded-lg p-3 text-sm text-slate-400 whitespace-pre-wrap border border-slate-800/50">
                                                        {sub.content || <span className="italic text-slate-600">Sin contenido de texto</span>}
                                                    </div>

                                                    {sub.file_url && (
                                                        <a
                                                            href={sub.file_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-xs font-bold w-fit transition-colors"
                                                        >
                                                            <ExternalLink className="w-3 h-3" /> Ver archivo adjunto
                                                        </a>
                                                    )}

                                                    {/* Grading Form */}
                                                    <div className="pt-3 border-t border-slate-800/50 space-y-3">
                                                        <div className="grid grid-cols-4 gap-3">
                                                            <div className="col-span-1">
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Nota</label>
                                                                <input
                                                                    type="number"
                                                                    max={sub.assignments?.max_points}
                                                                    min="0"
                                                                    placeholder={`/ ${sub.assignments?.max_points}`}
                                                                    value={gradingData.submissionId === sub.id ? gradingData.grade : (sub.grade || '')}
                                                                    onChange={(e) => setGradingData({
                                                                        ...gradingData,
                                                                        submissionId: sub.id,
                                                                        grade: e.target.value,
                                                                        feedback: gradingData.submissionId === sub.id ? gradingData.feedback : (sub.feedback || '')
                                                                    })}
                                                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                                                                />
                                                            </div>
                                                            <div className="col-span-3">
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Feedback del tutor</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Buen trabajo..."
                                                                    value={gradingData.submissionId === sub.id ? gradingData.feedback : (sub.feedback || '')}
                                                                    onChange={(e) => setGradingData({
                                                                        ...gradingData,
                                                                        submissionId: sub.id,
                                                                        feedback: e.target.value,
                                                                        grade: gradingData.submissionId === sub.id ? gradingData.grade : (sub.grade || '')
                                                                    })}
                                                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                        {gradingData.submissionId === sub.id && (
                                                            <button
                                                                onClick={handleGradeSubmission}
                                                                disabled={!gradingData.grade || isGrading}
                                                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-all"
                                                            >
                                                                {isGrading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                                Guardar Nota
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Quizzes List */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <GraduationCap className="w-5 h-5 text-amber-400" /> Cuestionarios Realizados
                                    </h4>
                                    <div className="space-y-3">
                                        {selectedStudent.attempts.length === 0 ? (
                                            <p className="text-slate-500 text-sm italic">No ha realizado cuestionarios aún.</p>
                                        ) : (
                                            selectedStudent.attempts.map(at => (
                                                <div key={at.id} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <h5 className="font-bold text-slate-200 text-sm">{at.quizzes?.title}</h5>
                                                            <p className="text-[10px] text-slate-500 mt-1">Realizado el {new Date(at.attempted_at).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`text-sm font-bold ${at.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                {at.score}%
                                                            </div>
                                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${at.passed ? 'text-emerald-500/50' : 'text-red-500/50'}`}>
                                                                {at.passed ? 'Aprobado' : 'Fallo'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-950/80 border-t border-slate-800 flex justify-end">
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-2.5 rounded-xl font-bold transition-all"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Gradebook;
