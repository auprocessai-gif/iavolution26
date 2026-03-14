import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Loader2,
    ChevronLeft,
    ChevronRight,
    PlayCircle,
    FileText,
    ExternalLink,
    CheckCircle2,
    Menu,
    X,
    Lock,
    Download,
    BrainCircuit,
    Upload,
    Send,
    Calendar
} from 'lucide-react';
import { useModal } from '../contexts/ModalContext';
import CourseCalendar from '../components/CourseCalendar';
import CourseChat from '../components/CourseChat';
import CourseForum from '../components/CourseForum';
import AiTutorChat from '../components/AiTutorChat';

const CoursePlayer = () => {
    const { id } = useParams();
    const { user, profile } = useAuth();
    const [course, setCourse] = useState(null);
    const [enrollment, setEnrollment] = useState(null);
    const [modules, setModules] = useState([]);
    const [currentLesson, setCurrentLesson] = useState(null);
    const [completedLessons, setCompletedLessons] = useState(new Set());
    const [viewedMaterials, setViewedMaterials] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('lessons'); // 'lessons' | 'calendar'
    const { showAlert } = useModal();

    // Assignment Submission State
    const [submittingAssignment, setSubmittingAssignment] = useState(null);
    const [submissionText, setSubmissionText] = useState('');
    const [submissionFile, setSubmissionFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Quiz Taking State
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [quizResult, setQuizResult] = useState(null);
    const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
    const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
 
    // Final Project State
    const [project, setProject] = useState(null);
    const [projectSubmission, setProjectSubmission] = useState(null);
    const [showProject, setShowProject] = useState(false);
    const [projectFile, setProjectFile] = useState(null);
    const [projectLink, setProjectLink] = useState('');
    const [isSubmittingProject, setIsSubmittingProject] = useState(false);

    useEffect(() => {
        if (user) {
            fetchCourseContent();
            fetchProgress();
            fetchMaterialViews();
            fetchProjectInfo();
        }
    }, [id, user]);

    const fetchMaterialViews = async () => {
        try {
            const { data, error } = await supabase
                .schema('iavolution')
                .from('material_views')
                .select('material_id')
                .eq('user_id', user.id);

            if (error) {
                console.warn('material_views fetch error:', error.message);
                return;
            }
            setViewedMaterials(new Set(data.map(v => v.material_id)));
        } catch (err) {
            console.warn('Error fetching material views:', err);
        }
    };

    const trackMaterialView = async (materialId) => {
        if (viewedMaterials.has(materialId)) return;

        setViewedMaterials(prev => new Set(prev).add(materialId));

        try {
            const { error } = await supabase
                .schema('iavolution')
                .from('material_views')
                .upsert([{ user_id: user.id, material_id: materialId }], { onConflict: 'user_id,material_id' });
            if (error) {
                console.error('Error tracking material view (Supabase):', error);
                alert('No se pudo guardar el progreso: ' + error.message);
                // Revert state if save failed
                setViewedMaterials(prev => {
                    const next = new Set(prev);
                    next.delete(materialId);
                    return next;
                });
            }
        } catch (err) {
            console.error('Error tracking material view (Catch):', err);
            alert('Error de conexión al guardar el progreso.');
        }
    };

    const fetchProgress = async () => {
        try {
            const { data, error } = await supabase
                .schema('iavolution')
                .from('lesson_progress')
                .select('lesson_id')
                .eq('user_id', user.id);

            if (error) throw error;
            setCompletedLessons(new Set(data.map(p => p.lesson_id)));
        } catch (err) {
            console.error('Error fetching progress:', err);
        }
    };

    const fetchProjectInfo = async () => {
        if (!id) return;
        try {
            const { data: projData, error: projError } = await supabase
                .schema('iavolution')
                .from('course_projects')
                .select('*')
                .eq('course_id', id)
                .maybeSingle();

            if (projError) throw projError;
            setProject(projData);

            if (projData && user?.id) {
                const { data: subData, error: subError } = await supabase
                    .schema('iavolution')
                    .from('project_submissions')
                    .select('*')
                    .eq('project_id', projData.id)
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (subError) throw subError;
                setProjectSubmission(subData);
            }
        } catch (err) {
            console.error('Error fetching project info:', err);
        }
    };


    const toggleLessonCompletion = async (lessonId) => {
        const isCompleted = completedLessons.has(lessonId);

        try {
            if (isCompleted) {
                const { error } = await supabase
                    .schema('iavolution')
                    .from('lesson_progress')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('lesson_id', lessonId);

                if (error) throw error;
                setCompletedLessons(prev => {
                    const next = new Set(prev);
                    next.delete(lessonId);
                    return next;
                });
            } else {
                const { error } = await supabase
                    .schema('iavolution')
                    .from('lesson_progress')
                    .insert([{ user_id: user.id, lesson_id: lessonId }]);

                if (error) throw error;
                setCompletedLessons(prev => new Set(prev).add(lessonId));
            }
        } catch (err) {
            console.error('Error updating progress:', err);
        }
    };

    // --- Final Project Submission ---
    const handleSubmitProject = async () => {
        if (!projectLink.trim() && !projectFile) {
            await showAlert('Por favor, indica un enlace o adjunta un archivo para tu proyecto.', 'warning');
            return;
        }

        setIsSubmittingProject(true);
        try {
            let fileUrl = null;
            if (projectFile) {
                const fileExt = projectFile.name.split('.').pop();
                const fileName = `project-${project.id}-${user.id}.${fileExt}`;
                const filePath = `course-${id}/projects/${fileName}`;
                const { error: uploadErr } = await supabase.storage.from('course-content').upload(filePath, projectFile, { cacheControl: '3600', upsert: true });
                if (uploadErr) throw uploadErr;
                const { data: urlData } = supabase.storage.from('course-content').getPublicUrl(filePath);
                fileUrl = urlData.publicUrl;
            }

            const { error } = await supabase.schema('iavolution').from('project_submissions').upsert([{
                project_id: project.id,
                user_id: user.id,
                content: projectLink,
                file_url: fileUrl,
                status: 'pending'
            }]);

            if (error) throw error;

            await showAlert('¡Proyecto Final enviado correctamente! El profesor lo revisará pronto.', 'success');
            setProjectFile(null);
            setProjectLink('');
            await fetchProjectInfo();
        } catch (err) {
            console.error(err);
            await showAlert('Error al enviar el proyecto: ' + (err.message || 'Error desconocido'), 'error');
        } finally {
            setIsSubmittingProject(false);
        }
    };


    const fetchCourseContent = async () => {
        setLoading(true);
        try {
            // Fetch Course Basic Info
            const { data: courseData, error: courseError } = await supabase
                .schema('iavolution')
                .from('courses')
                .select('*')
                .eq('id', id)
                .single();

            if (courseError) throw courseError;
            setCourse(courseData);

            // Fetch enrollment - handle case where multiple records might exist
            const { data: enrollments } = await supabase
                .schema('iavolution')
                .from('enrollments')
                .select(`
                    id,
                    edition:course_editions(name, live_class_url)
                `)
                .eq('user_id', user.id)
                .eq('course_id', id);

            // Prioritize enrollment with an edition that has a live class URL
            const bestEnrollment = enrollments?.sort((a, b) => {
                if (a.edition?.live_class_url && !b.edition?.live_class_url) return -1;
                if (!a.edition?.live_class_url && b.edition?.live_class_url) return 1;
                return 0;
            })[0] || null;

            setEnrollment(bestEnrollment);

            // 3. Fallback for Live Class URL: If the current enrollment (or staff view) doesn't have a URL, 
            // fetch it from the latest active edition of the course.
            if (!bestEnrollment?.edition?.live_class_url) {
                const { data: latestEditions } = await supabase
                    .schema('iavolution')
                    .from('course_editions')
                    .select('name, live_class_url')
                    .eq('course_id', id)
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (latestEditions?.[0]?.live_class_url) {
                    setEnrollment(prev => ({
                        ...prev,
                        edition: {
                            ...prev?.edition,
                            live_class_url: latestEditions[0].live_class_url,
                            name: latestEditions[0].name
                        }
                    }));
                }
            }

            const { data: modulesData, error: modulesError } = await supabase
                .schema('iavolution')
                .from('modules')
                .select(`
                    *,
                    lessons (
                        *,
                        materials (*),
                        assignments (*, submissions (*)),
                        quizzes (*, quiz_attempts (*))
                    )
                `)
                .eq('course_id', id)
                .eq('lessons.assignments.submissions.user_id', user.id)
                .eq('lessons.quizzes.quiz_attempts.user_id', user.id)
                .order('order', { ascending: true });

            if (modulesError) throw modulesError;

            // Sort lessons within modules by order
            const sortedModules = (modulesData || []).map(mod => ({
                ...mod,
                lessons: (mod.lessons || []).sort((a, b) => a.order - b.order)
            }));

            setModules(sortedModules);

            // Set first lesson as current if none selected
            if (sortedModules.length > 0 && sortedModules[0].lessons.length > 0) {
                const firstLesson = sortedModules[0].lessons[0];
                setCurrentLesson(firstLesson);
            }
        } catch (err) {
            console.error('Error fetching course content:', err);
        } finally {
            setLoading(false);
        }
    };

    const renderMaterialContent = (lesson) => {
        if (!lesson) return null;

        // Priority 1: If it's a video type material, try to embed it
        const videoMaterial = lesson.materials?.find(m => m.type === 'video');
        if (videoMaterial) {
            const url = videoMaterial.file_url;

            // Basic YouTube detection for embedding
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                const videoId = url.split('v=')[1] || url.split('/').pop();
                const embedUrl = `https://www.youtube.com/embed/${videoId.split('&')[0]}`;
                return (
                    <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl bg-black">
                        <iframe
                            src={embedUrl}
                            className="w-full h-full"
                            allowFullScreen
                            title={lesson.title}
                        ></iframe>
                    </div>
                );
            }

            // Generic video element for direct file URLs
            return (
                <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl bg-black flex items-center justify-center">
                    <video controls className="w-full max-h-full">
                        <source src={url} />
                        Tu navegador no soporta el tag de video.
                    </video>
                </div>
            );
        }

        // Priority 2: PDF or SCORM - Try to embed in iframe if PDF
        const pdfMaterial = lesson.materials?.find(m => m.type === 'pdf');
        if (pdfMaterial) {
            return (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
                    <FileText className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">{pdfMaterial.title}</h2>
                    <p className="text-slate-400 mb-6">Esta lección contiene un documento PDF para su estudio.</p>
                    <a
                        href={pdfMaterial.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all"
                    >
                        <Download className="w-5 h-5" /> Descargar / Ver Documento
                    </a>
                </div>
            );
        }

        // Default: If no materials or unknown
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-20 text-center">
                <PlayCircle className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 italic">Esta lección no tiene contenido visual. Consulta los materiales adjuntos.</p>
            </div>
        );
    };

    // --- Assignment Submission ---
    const handleSubmitAssignment = async () => {
        if (!submissionText.trim() && !submissionFile) {
            await showAlert('Escribe algo o adjunta un archivo para entregar.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            let fileUrl = null;
            if (submissionFile) {
                const fileExt = submissionFile.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                const filePath = `course-${id}/submissions/${fileName}`;
                const { error: uploadErr } = await supabase.storage.from('course-content').upload(filePath, submissionFile, { cacheControl: '3600', upsert: false });
                if (uploadErr) throw uploadErr;
                const { data: urlData } = supabase.storage.from('course-content').getPublicUrl(filePath);
                fileUrl = urlData.publicUrl;
            }

            const { error } = await supabase.schema('iavolution').from('submissions').insert([{
                assignment_id: submittingAssignment.id,
                user_id: user.id,
                content: submissionText,
                file_url: fileUrl
            }]);
            if (error) throw error;

            await showAlert('¡Entrega realizada con éxito!', 'success');
            setSubmittingAssignment(null);
            setSubmissionText('');
            setSubmissionFile(null);
            await fetchCourseContent();
        } catch (err) {
            console.error(err);
            await showAlert('Error al entregar: ' + (err.message || 'Error desconocido'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Quiz Taking ---
    const handleStartQuiz = async (quiz) => {
        setIsLoadingQuiz(true);
        setQuizResult(null);
        setQuizAnswers({});
        setCurrentQuestionIdx(0);
        try {
            const { data, error } = await supabase.schema('iavolution').from('quiz_questions').select('*').eq('quiz_id', quiz.id).order('id');
            if (error) throw error;
            if (!data || data.length === 0) {
                await showAlert('Este cuestionario no tiene preguntas aún.', 'info');
                return;
            }
            setQuizQuestions(data);
            setActiveQuiz(quiz);
        } catch (err) {
            console.error(err);
            await showAlert('Error al cargar el cuestionario: ' + (err.message || 'Error desconocido'), 'error');
        } finally {
            setIsLoadingQuiz(false);
        }
    };

    const handleSubmitQuiz = async () => {
        setIsSubmittingQuiz(true);
        try {
            let correctCount = 0;
            quizQuestions.forEach(q => {
                if (quizAnswers[q.id] === q.correct_answer) correctCount++;
            });
            const score = Math.round((correctCount / quizQuestions.length) * 100);
            const passed = score >= activeQuiz.passing_score;

            const { error } = await supabase.schema('iavolution').from('quiz_attempts').insert([{
                quiz_id: activeQuiz.id,
                user_id: user.id,
                score,
                passed
            }]);
            if (error) throw error;

            setQuizResult({ score, passed, correctCount, total: quizQuestions.length });
        } catch (err) {
            console.error(err);
            await showAlert('Error al enviar el cuestionario: ' + (err.message || 'Error desconocido'), 'error');
        } finally {
            setIsSubmittingQuiz(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                <p className="text-red-400 mb-4">No se pudo cargar el curso.</p>
                <Link to="/dashboard" className="text-indigo-400 hover:underline">Volver al Dashboard</Link>
            </div>
        );
    }

    const isStaff = profile?.role === 'admin' || profile?.role === 'teacher' || profile?.role === 'manager';
    const isRestricted = !isStaff && !enrollment;

    if (isRestricted) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
                    <div className="w-20 h-20 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                        <Lock className="w-10 h-10 text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Acceso Restringido</h2>
                    <p className="text-slate-400 mb-8">
                        No pareces estar matriculado en este curso. Si crees que esto es un error, por favor contacta con administración.
                    </p>
                    <div className="space-y-4">
                        <Link
                            to="/dashboard"
                            className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                        >
                            Volver al Dashboard
                        </Link>
                        <Link
                            to="/explorar"
                            className="block w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all"
                        >
                            Explorar Otros Cursos
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row overflow-hidden h-screen">
                {/* Main Player Area */}
                <div className="flex-1 overflow-y-auto px-4 py-6 lg:p-10">
                    <div className="max-w-4xl mx-auto">
                        {/* Header */}
                        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <Link to="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group w-fit">
                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                <span className="hidden sm:inline">Volver a mis cursos</span>
                            </Link>
                            <div className="flex items-center gap-3">
                                <div className="hidden sm:flex bg-slate-900 border border-slate-800 p-1 rounded-xl mr-2">
                                    <button
                                        onClick={() => setActiveTab('lessons')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'lessons' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Clases
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('forum')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'forum' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Foro
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('chat')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Chat
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('calendar')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'calendar' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Calendario
                                    </button>
                                </div>
                                {enrollment?.edition?.live_class_url && (
                                    <a
                                        href={enrollment.edition.live_class_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-rose-900/50 transition-all animate-pulse hover:animate-none"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
                                        Unirse a la Clase en Vivo
                                    </a>
                                )}
                                <button
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                    className="lg:hidden p-2 bg-slate-900 rounded-lg text-white"
                                >
                                    {sidebarOpen ? <X /> : <Menu />}
                                </button>
                            </div>
                        </div>

                        {/* Project / Lesson / Calendar Content Wrapper */}
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {activeTab === 'lessons' ? (
                                <>
                                    {showProject ? (
                                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 lg:p-12 shadow-2xl relative overflow-hidden">
                                            {/* Decorative background */}
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32"></div>
                                            
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                        <BrainCircuit className="w-8 h-8 text-white" />
                                                    </div>
                                                    <div>
                                                        <h1 className="text-3xl font-black text-white tracking-tight">{project?.title || 'Proyecto Final'}</h1>
                                                        <p className="text-indigo-400 font-bold tracking-widest uppercase text-xs mt-1">Culminación del programa</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                                    {/* Instructions Side */}
                                                    <div className="lg:col-span-2 space-y-8">
                                                        <section>
                                                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                                                <FileText className="w-5 h-5 text-indigo-400" />
                                                                Instrucciones del Proyecto
                                                            </h3>
                                                            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                                {project?.instructions || 'El profesor no ha proporcionado instrucciones detalladas para este proyecto aún.'}
                                                            </div>
                                                        </section>

                                                        {project?.rubric && (
                                                            <section>
                                                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                                    Rúbrica de Evaluación
                                                                </h3>
                                                                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 text-slate-300 text-sm whitespace-pre-wrap">
                                                                    {project.rubric}
                                                                </div>
                                                            </section>
                                                        )}
                                                    </div>

                                                    {/* Submission Side */}
                                                    <div className="space-y-6">
                                                        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
                                                            <h3 className="text-white font-bold mb-4">Estado de Entrega</h3>
                                                            
                                                            {projectSubmission ? (
                                                                <div className="space-y-4">
                                                                    <div className={`p-4 rounded-xl border ${projectSubmission.status === 'graded' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${projectSubmission.status === 'graded' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                                                {projectSubmission.status === 'graded' ? 'CALIFICADO' : 'PENDIENTE'}
                                                                            </span>
                                                                            {projectSubmission.grade !== null && (
                                                                                <span className="text-2xl font-black text-white">{projectSubmission.grade}<span className="text-sm text-slate-500">/10</span></span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-slate-400 italic">Entregado el {new Date(projectSubmission.submitted_at).toLocaleDateString()}</p>
                                                                    </div>

                                                                    {projectSubmission.feedback && (
                                                                        <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                                                                            <p className="text-[10px] font-black text-indigo-400 mb-2 uppercase tracking-widest">FEEDBACK:</p>
                                                                            <p className="text-sm text-slate-300 italic">"{projectSubmission.feedback}"</p>
                                                                        </div>
                                                                    )}

                                                                    {projectSubmission.status !== 'graded' && (
                                                                        <button 
                                                                            onClick={() => {
                                                                                setProjectLink(projectSubmission.content || '');
                                                                                setProjectSubmission(null); // Allow re-submission while pending
                                                                            }}
                                                                            className="w-full text-slate-400 hover:text-white text-xs font-bold transition-all py-2 border border-dashed border-slate-700 rounded-xl hover:border-slate-500"
                                                                        >
                                                                            Modificar Entrega
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">Enlace del Proyecto (GitHub/Google Drive)</label>
                                                                        <input 
                                                                            type="url" 
                                                                            value={projectLink}
                                                                            onChange={e => setProjectLink(e.target.value)}
                                                                            placeholder="https://github.com/tu-usuario/proyecto..."
                                                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">Archivo Adjunto</label>
                                                                        <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-2xl py-6 cursor-pointer transition-all group">
                                                                            <Upload className="w-6 h-6 text-slate-600 group-hover:text-indigo-400 mb-2 transition-colors" />
                                                                            <span className="text-xs text-slate-500 group-hover:text-slate-300 px-4 text-center">
                                                                                {projectFile ? projectFile.name : 'Haz clic para subir (ZIP/PDF)'}
                                                                            </span>
                                                                            <input type="file" className="hidden" onChange={e => setProjectFile(e.target.files[0])} />
                                                                        </label>
                                                                    </div>
                                                                    <button 
                                                                        onClick={handleSubmitProject}
                                                                        disabled={isSubmittingProject || (!projectLink.trim() && !projectFile)}
                                                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 group disabled:opacity-50"
                                                                    >
                                                                        {isSubmittingProject ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                                                        {isSubmittingProject ? 'ENVIANDO...' : 'ENVIAR PROYECTO FINAL'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {project?.min_passing_grade && (
                                                            <div className="flex items-center gap-3 px-6 py-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                                                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                                                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                                                                </div>
                                                                <span className="text-xs text-indigo-300 font-bold">Nota mínima para aprobar: {project.min_passing_grade}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {renderMaterialContent(currentLesson)}

                                    <div className="mt-8">
                                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{currentLesson?.title}</h1>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                                <span className="bg-slate-800 px-3 py-1 rounded-full">{course.category}</span>
                                                {completedLessons.has(currentLesson?.id) && (
                                                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                                        <CheckCircle2 className="w-4 h-4" /> Lección completada
                                                    </span>
                                                )}
                                            </div>
                                            {(() => {
                                                const lessonMaterials = currentLesson?.materials || [];
                                                const allViewed = lessonMaterials.length === 0 || lessonMaterials.every(m => viewedMaterials.has(m.id));
                                                const isCompleted = completedLessons.has(currentLesson?.id);
                                                const canComplete = allViewed || isCompleted;
                                                
                                                return (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <button
                                                            onClick={() => canComplete && toggleLessonCompletion(currentLesson.id)}
                                                            disabled={!canComplete}
                                                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${isCompleted
                                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                : canComplete
                                                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                                                                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                                }`}
                                                        >
                                                            {isCompleted ? (
                                                                <><CheckCircle2 className="w-5 h-5" /> Completada</>
                                                            ) : (
                                                                <>Marcar como completada</>
                                                            )}
                                                        </button>
                                                        {!canComplete && (
                                                            <span className="text-xs text-amber-400/80">
                                                                ⚠ Revisa todos los materiales primero
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                                            <h3 className="text-lg font-semibold text-white mb-3">Materiales de soporte</h3>
                                            {currentLesson?.materials?.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {currentLesson.materials.map(mat => {
                                                        const isViewed = viewedMaterials.has(mat.id);
                                                        return (
                                                            <a
                                                                key={mat.id}
                                                                href={mat.file_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                onClick={() => trackMaterialView(mat.id)}
                                                                className={`flex items-center justify-between p-3 rounded-xl transition-all text-sm group ${
                                                                    isViewed
                                                                        ? 'bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10'
                                                                        : 'bg-slate-950 border border-slate-800 hover:bg-slate-800'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    {isViewed
                                                                        ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                                        : mat.type === 'video' ? <PlayCircle className="w-5 h-5 text-blue-400" /> : <FileText className="w-5 h-5 text-emerald-400" />
                                                                    }
                                                                    <span className={`font-medium ${isViewed ? 'text-emerald-300' : 'text-slate-300'}`}>{mat.title}</span>
                                                                </div>
                                                                <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-slate-500 text-sm italic">No hay archivos adicionales para esta lección.</p>
                                            )}
                                        </div>

                                        {/* Evaluación: Tareas y Cuestionarios */}
                                        {(currentLesson?.assignments?.length > 0 || currentLesson?.quizzes?.length > 0) && (
                                            <div className="mt-6 space-y-4">
                                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                    <BrainCircuit className="w-5 h-5 text-purple-400" />
                                                    Actividades de Evaluación
                                                </h3>

                                                {/* Assignments */}
                                                {currentLesson.assignments?.map(asn => {
                                                    const submission = asn.submissions?.[0]; // Get the student's submission
                                                    return (
                                                        <div key={asn.id} className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div>
                                                                    <h4 className="font-bold text-white text-lg">{asn.title}</h4>
                                                                    <p className="text-slate-400 text-sm mt-1 whitespace-pre-wrap">{asn.instructions}</p>
                                                                </div>
                                                                <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                                                                    Máx: {asn.max_points} pts
                                                                </span>
                                                            </div>

                                                            {submission ? (
                                                                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Tu Entrega</span>
                                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${ (submission.status === 'graded' || submission.grade !== null) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                                                             }`}>
                                                                             {(submission.status === 'graded' || submission.grade !== null) ? `Calificado: ${submission.grade}/${asn.max_points}` : 'Pendiente de corrección'}
                                                                         </span>
                                                                    </div>
                                                                    <p className="text-sm text-slate-300 italic">"Entregado el {new Date(submission.submitted_at).toLocaleDateString()}"</p>
                                                                    {submission.feedback && (
                                                                        <div className="mt-3 pt-3 border-t border-slate-800">
                                                                            <p className="text-xs font-bold text-indigo-400 mb-1">Feedback del profesor:</p>
                                                                            <p className="text-sm text-slate-300">{submission.feedback}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => { setSubmittingAssignment(asn); setSubmissionText(''); setSubmissionFile(null); }} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20">
                                                                    Realizar Entrega
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Quizzes */}
                                                {currentLesson.quizzes?.map(quiz => {
                                                    const attempt = quiz.quiz_attempts?.[0]; // Get the student's attempt
                                                    return (
                                                        <div key={quiz.id} className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div>
                                                                    <h4 className="font-bold text-white text-lg">{quiz.title}</h4>
                                                                    <p className="text-slate-400 text-sm mt-1">Cuestionario interactivo</p>
                                                                </div>
                                                                <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                                                                    Mín: {quiz.passing_score}%
                                                                </span>
                                                            </div>

                                                            {attempt ? (
                                                                <div className={`rounded-xl p-4 border ${attempt.passed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                                                    <div className="flex items-center justify-between font-bold">
                                                                        <span className={attempt.passed ? 'text-emerald-400' : 'text-red-400'}>
                                                                            {attempt.passed ? 'APROBADO' : 'NO SUPERADO'}
                                                                        </span>
                                                                        <span className="text-white text-lg">{attempt.score}%</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-500 mt-1">Realizado el {new Date(attempt.attempted_at).toLocaleDateString()}</p>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => handleStartQuiz(quiz)} disabled={isLoadingQuiz} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50">
                                                                    {isLoadingQuiz ? 'Cargando...' : 'Comenzar Cuestionario'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                            ) : activeTab === 'forum' ? (
                                <CourseForum courseId={id} />
                            ) : activeTab === 'chat' ? (
                                <CourseChat courseId={id} />
                            ) : (
                                <CourseCalendar
                                    courseId={id}
                                    editionId={enrollment?.edition_id}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Curriculum */}
                <aside className={`w-full lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col fixed inset-0 lg:static z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                        <h2 className="font-bold text-white text-lg">Contenido del Curso</h2>
                        <button className="lg:hidden p-2 text-slate-400" onClick={() => setSidebarOpen(false)}><X /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {modules.map((module) => (
                            <div key={module.id} className="mb-4">
                                <h3 className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">{module.title}</h3>
                                <div className="space-y-1">
                                    {module.lessons?.map((lesson) => {
                                        const isActive = currentLesson?.id === lesson.id;
                                        return (
                                            <button
                                                key={lesson.id}
                                                onClick={() => {
                                                    setActiveTab('lessons');
                                                    setCurrentLesson(lesson);
                                                    setShowProject(false);
                                                    if (window.innerWidth < 1024) setSidebarOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${isActive
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                                    }`}
                                            >
                                                <div className={`p-1.5 rounded-lg border ${isActive ? 'bg-white/20 border-white/20' : 'bg-slate-950 border-slate-700'}`}>
                                                    {completedLessons.has(lesson.id) ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : (lesson.materials?.[0]?.type === 'video' ? <PlayCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold truncate leading-tight">{lesson.title}</p>
                                                    <p className={`text-[10px] mt-0.5 ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                                                        {lesson.materials?.length || 0} recursos
                                                    </p>
                                                </div>
                                                {completedLessons.has(lesson.id) && !isActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/50" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {project && (
                            <div className="mt-2 pt-2 border-t border-slate-800/50">
                                <button
                                    onClick={() => {
                                        setActiveTab('lessons');
                                        setShowProject(true);
                                        setCurrentLesson(null);
                                        if (window.innerWidth < 1024) setSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all text-left ${showProject
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20'
                                        : 'text-indigo-400 hover:bg-slate-800'
                                        }`}
                                >
                                    <div className={`p-1.5 rounded-lg border ${showProject ? 'bg-white/20 border-white/20' : 'bg-slate-950 border-indigo-500/30'}`}>
                                        <BrainCircuit className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black truncate leading-tight uppercase tracking-wider">PROYECTO FINAL</p>
                                        <p className={`text-[10px] mt-0.5 ${showProject ? 'text-indigo-200' : 'text-slate-500'}`}>
                                            {projectSubmission ? (projectSubmission.status === 'graded' ? 'Calificado' : 'Entregado') : 'Pendiente de entrega'}
                                        </p>
                                    </div>
                                    {projectSubmission?.status === 'graded' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-950 border-t border-slate-800 mt-auto">
                        {(() => {
                            const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
                            const completedCount = Array.from(completedLessons).filter(id =>
                                modules.some(m => m.lessons.some(l => l.id === id))
                            ).length;
                            const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

                            return (
                                <>
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
                                        <span>Tu progreso: {percent}%</span>
                                        <span>{completedCount}/{totalLessons} lecciones</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </aside>
            </div>

            {/* Assignment Submission Modal */}
            {
                submittingAssignment && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg">
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Entregar: {submittingAssignment.title}</h3>
                                    <p className="text-slate-400 text-sm mt-1">{submittingAssignment.instructions}</p>
                                </div>
                                <button onClick={() => setSubmittingAssignment(null)} className="text-slate-400 hover:text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Tu respuesta</label>
                                    <textarea
                                        value={submissionText}
                                        onChange={e => setSubmissionText(e.target.value)}
                                        placeholder="Escribe tu respuesta aquí..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white h-32 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Adjuntar archivo (opcional)</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.zip,.rar,.pptx,.xlsx"
                                            onChange={(e) => setSubmissionFile(e.target.files[0])}
                                            className="text-xs text-slate-400 file:bg-indigo-600 file:text-white file:border-0 file:rounded file:px-3 file:py-1.5 cursor-pointer"
                                        />
                                        {submissionFile && <span className="text-xs text-emerald-400">✓ {submissionFile.name}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                                <button onClick={() => setSubmittingAssignment(null)} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm">Cancelar</button>
                                <button
                                    onClick={handleSubmitAssignment}
                                    disabled={isSubmitting || (!submissionText.trim() && !submissionFile)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {isSubmitting ? 'Enviando...' : 'Enviar Entrega'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Quiz Taking Modal */}
            {
                activeQuiz && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-800">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-white">{activeQuiz.title}</h3>
                                    {!quizResult && (
                                        <button onClick={() => { setActiveQuiz(null); setQuizResult(null); }} className="text-slate-400 hover:text-white">
                                            <X className="w-6 h-6" />
                                        </button>
                                    )}
                                </div>
                                {!quizResult && (
                                    <div className="mt-3">
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>Pregunta {currentQuestionIdx + 1} de {quizQuestions.length}</span>
                                            <span>{Object.keys(quizAnswers).length}/{quizQuestions.length} respondidas</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-800 rounded-full">
                                            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${((currentQuestionIdx + 1) / quizQuestions.length) * 100}%` }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {quizResult ? (
                                    /* Results Screen */
                                    <div className="text-center py-8 space-y-6">
                                        <div className={`text-6xl font-black ${quizResult.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {quizResult.score}%
                                        </div>
                                        <div className={`inline-block px-6 py-2 rounded-full font-bold text-lg ${quizResult.passed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                            {quizResult.passed ? '¡APROBADO!' : 'NO SUPERADO'}
                                        </div>
                                        <p className="text-slate-400">
                                            Respondiste correctamente {quizResult.correctCount} de {quizResult.total} preguntas.
                                            <br />Mínimo para aprobar: {activeQuiz.passing_score}%
                                        </p>
                                        <button
                                            onClick={() => { setActiveQuiz(null); setQuizResult(null); fetchCourseContent(); }}
                                            className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl font-bold"
                                        >
                                            Cerrar
                                        </button>
                                    </div>
                                ) : (
                                    /* Question Screen */
                                    quizQuestions.length > 0 && (
                                        <div className="space-y-6">
                                            <h4 className="text-lg font-bold text-white">
                                                {currentQuestionIdx + 1}. {quizQuestions[currentQuestionIdx].question_text}
                                            </h4>
                                            <div className="space-y-3">
                                                {quizQuestions[currentQuestionIdx].options.map((opt, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setQuizAnswers({ ...quizAnswers, [quizQuestions[currentQuestionIdx].id]: idx })}
                                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium ${quizAnswers[quizQuestions[currentQuestionIdx].id] === idx
                                                            ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                                                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                                                            }`}
                                                    >
                                                        <span className="mr-3 text-slate-500 font-bold">{String.fromCharCode(65 + idx)}.</span>
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>

                            {!quizResult && (
                                <div className="p-6 border-t border-slate-800 flex justify-between">
                                    <button
                                        onClick={() => setCurrentQuestionIdx(Math.max(0, currentQuestionIdx - 1))}
                                        disabled={currentQuestionIdx === 0}
                                        className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-30 flex items-center gap-2"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Anterior
                                    </button>
                                    {currentQuestionIdx < quizQuestions.length - 1 ? (
                                        <button
                                            onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                                            className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
                                        >
                                            Siguiente <ChevronRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSubmitQuiz}
                                            disabled={isSubmittingQuiz || Object.keys(quizAnswers).length < quizQuestions.length}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isSubmittingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            {isSubmittingQuiz ? 'Enviando...' : `Finalizar (${Object.keys(quizAnswers).length}/${quizQuestions.length})`}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
            
            {user && <AiTutorChat courseId={id} user={user} />}
        </>
    );
};

export default CoursePlayer;
