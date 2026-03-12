import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, ArrowLeft, Plus, Edit3, Trash2, Video, FileText, ChevronDown, ChevronUp, BookOpen, BrainCircuit, X, Upload, Users, Calendar, Shield, Save } from 'lucide-react';
import { useModal } from '../../contexts/ModalContext';
import CourseCalendar from '../../components/CourseCalendar';

const CourseBuilder = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const { showAlert, showConfirm } = useModal();

    const [course, setCourse] = useState(null);
    const [modules, setModules] = useState([]);
    const [editions, setEditions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Tab State
    const [activeTab, setActiveTab] = useState('curriculum'); // 'curriculum', 'editions', or 'settings'

    // Edition Form States
    const [isCreatingEdition, setIsCreatingEdition] = useState(false);
    const [newEdition, setNewEdition] = useState({ name: '', start_date: '', end_date: '', max_students: '', live_class_url: '' });

    // Form States
    const [newModuleTitle, setNewModuleTitle] = useState('');
    const [expandedModule, setExpandedModule] = useState(null);
    const [isCreatingModule, setIsCreatingModule] = useState(false);

    // Lesson Form States
    const [addingLessonTo, setAddingLessonTo] = useState(null);
    const [newLessonTitle, setNewLessonTitle] = useState('');
    const [isCreatingLesson, setIsCreatingLesson] = useState(false);

    // Material Form States
    const [editingLessonId, setEditingLessonId] = useState(null);
    const [newMaterial, setNewMaterial] = useState({ title: '', type: 'video', url: '' });
    const [selectedFile, setSelectedFile] = useState(null);
    const [isCreatingMaterial, setIsCreatingMaterial] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
    const [newQuiz, setNewQuiz] = useState({ title: '', passing_score: 70 });
    const [isImportingCSV, setIsImportingCSV] = useState(false);
    
    // Assignment Form States
    const [newAssignment, setNewAssignment] = useState({ title: '', instructions: '', max_points: 100 });
    const [assignmentFile, setAssignmentFile] = useState(null);
    const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);

    // Quiz Questions States
    const [editingQuiz, setEditingQuiz] = useState(null);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState({
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: 0,
        points: 10
    });
    const [isSavingQuestion, setIsSavingQuestion] = useState(false);

    // Instructor Assignment States
    const [teachers, setTeachers] = useState([]);
    const [isSavingInstructor, setIsSavingInstructor] = useState(false);
    const [loadingTeachers, setLoadingTeachers] = useState(false);


    useEffect(() => {
        fetchCourseData();
        fetchTeachers();
    }, [id]);

    const fetchTeachers = async () => {
        setLoadingTeachers(true);
        try {
            // Fetch users with 'teacher' role
            const { data, error: teacherError } = await supabase
                .schema('iavolution')
                .from('profiles')
                .select(`
                    id, 
                    name, 
                    email,
                    roles!inner(name)
                `)
                .eq('roles.name', 'teacher');

            if (teacherError) throw teacherError;
            setTeachers(data || []);
        } catch (err) {
            console.error('Error fetching teachers:', err);
        } finally {
            setLoadingTeachers(false);
        }
    };

    const fetchCourseData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Course Basic Info
            const { data: courseData, error: courseError } = await supabase
                .schema('iavolution')
                .from('courses')
                .select('*')
                .eq('id', id)
                .single();

            if (courseError) throw courseError;
            setCourse(courseData);

            // 2. Stage 1: Fetch Modules and Lessons (Core Structure)
            // We fetch the backbone            // 2. Fetch Modules (with lessons)
            const { data: modulesData, error: modulesError } = await supabase
                .schema('iavolution')
                .from('modules')
                .select(`
                    *,
                    lessons (*)
                `)
                .eq('course_id', id)
                .order('order');
            if (modulesError) throw modulesError;

            // 2.5 Fetch Course Editions
            const { data: editionsData, error: editionsError } = await supabase
                .schema('iavolution')
                .from('course_editions')
                .select('*')
                .eq('course_id', id)
                .order('created_at', { ascending: false });
            if (editionsError) throw editionsError;
            setEditions(editionsData || []);

            // 3. Stage 2: Fetch optional nested content in parallel but isolated
            // This prevents a single table "relationship" error from crashing the whole page
            const lessonIds = (modulesData || []).flatMap(m => (m.lessons || []).map(l => l.id));

            let allMaterials = [];
            let allAssignments = [];
            let allQuizzes = [];

            if (lessonIds.length > 0) {
                // Fetch Materials (usually safe)
                try {
                    const { data: matData, error: matError } = await supabase.schema('iavolution').from('materials').select('*').in('lesson_id', lessonIds);
                    if (!matError) allMaterials = matData || [];
                    else console.warn('Materials fetch error (non-fatal):', matError);
                } catch (e) { console.warn('Materials fetch crash:', e); }

                // Fetch Assignments (suspect for schema cache errors)
                try {
                    const { data: asnData, error: asnError } = await supabase.schema('iavolution').from('assignments').select('*').in('lesson_id', lessonIds);
                    if (!asnError) allAssignments = asnData || [];
                    else console.warn('Assignments fetch error (non-fatal):', asnError);
                } catch (e) { console.warn('Assignments fetch crash:', e); }

                // Fetch Quizzes (suspect for schema cache errors)
                try {
                    const { data: qzData, error: qzError } = await supabase.schema('iavolution').from('quizzes').select('*').in('lesson_id', lessonIds);
                    if (!qzError) allQuizzes = qzData || [];
                    else console.warn('Quizzes fetch error (non-fatal):', qzError);
                } catch (e) { console.warn('Quizzes fetch crash:', e); }
            }

            // 4. Merge everything in memory with safety guards
            const sortedModules = (modulesData || []).map(mod => ({
                ...mod,
                lessons: (mod.lessons || []).map(lesson => ({
                    ...lesson,
                    materials: allMaterials.filter(m => m.lesson_id === lesson.id),
                    assignments: allAssignments.filter(a => a.lesson_id === lesson.id),
                    quizzes: allQuizzes.filter(q => q.lesson_id === lesson.id)
                })).sort((a, b) => a.order - b.order)
            }));

            setModules(sortedModules);
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.message || 'Error al cargar la información del curso');
        } finally {
            setLoading(false);
        }
    };

    // --- Course Editions Actions ---
    const handleCreateEdition = async (e) => {
        e.preventDefault();
        if (!newEdition.name.trim()) return;
        setIsCreatingEdition(true);
        try {
            const { error: insertError } = await supabase.schema('iavolution').from('course_editions').insert([{
                course_id: id,
                name: newEdition.name,
                start_date: newEdition.start_date || null,
                end_date: newEdition.end_date || null,
                max_students: newEdition.max_students ? parseInt(newEdition.max_students) : null,
                live_class_url: newEdition.live_class_url || null,
                status: 'active'
            }]);
            if (insertError) throw insertError;
            setNewEdition({ name: '', start_date: '', end_date: '', max_students: '', live_class_url: '' });
            await fetchCourseData();
        } catch (err) {
            console.error('Error creating edition:', err);
            await showAlert('Error al crear la edición: ' + (err.message || ''), 'error');
        } finally {
            setIsCreatingEdition(false);
        }
    };

    const handleUpdateEditionUrl = async (editionId, newUrl) => {
        try {
            const { error } = await supabase
                .schema('iavolution')
                .from('course_editions')
                .update({ live_class_url: newUrl || null })
                .eq('id', editionId);
            if (error) throw error;
            await fetchCourseData();
        } catch (err) {
            console.error('Error updating live class URL:', err);
            await showAlert('Error al actualizar la URL de la clase en vivo', 'error');
        }
    };

    const handleUpdateInstructor = async (teacherId) => {
        setIsSavingInstructor(true);
        try {
            const { error: updateError } = await supabase
                .schema('iavolution')
                .from('courses')
                .update({ teacher_id: teacherId || null })
                .eq('id', id);

            if (updateError) throw updateError;

            setCourse(prev => ({ ...prev, teacher_id: teacherId }));
            await showAlert('Instructor actualizado con éxito', 'success');
        } catch (err) {
            console.error('Error updating instructor:', err);
            await showAlert('Error al actualizar el instructor', 'error');
        } finally {
            setIsSavingInstructor(false);
        }
    };

    const handleDeleteEdition = async (editionId) => {
        const confirmed = await showConfirm(
            '¿Seguro que quieres eliminar esta edición?',
            'Las matrículas asociadas se borrarán permanentemente.',
            'warning'
        );
        if (!confirmed) return;
        try {
            const { error } = await supabase.schema('iavolution').from('course_editions').delete().eq('id', editionId);
            if (error) throw error;
            await fetchCourseData();
        } catch (err) {
            console.error('Error deleting edition:', err);
            await showAlert('Error al eliminar la edición', 'error');
        }
    };

    const handleCreateModule = async (e) => {
        e.preventDefault();
        if (!newModuleTitle.trim()) return;

        setIsCreatingModule(true);
        try {
            const nextOrder = modules.length > 0 ? Math.max(...modules.map(m => m.order)) + 1 : 1;

            const { error: insertError } = await supabase
                .schema('iavolution')
                .from('modules')
                .insert([{
                    title: newModuleTitle,
                    course_id: id,
                    order: nextOrder
                }]);

            if (insertError) throw insertError;

            setNewModuleTitle('');
            await fetchCourseData();
        } catch (err) {
            console.error('Error creating module:', err);
            await showAlert('Error al crear el módulo', 'error');
        } finally {
            setIsCreatingModule(false);
        }
    };

    const handleDeleteModule = async (moduleId) => {
        const confirmed = await showConfirm(
            '¿Seguro que quieres eliminar este módulo?',
            'Se borrarán todas sus lecciones y materiales asociados.',
            'warning'
        );
        if (!confirmed) return;
        try {
            const { error } = await supabase
                .schema('iavolution')
                .from('modules')
                .delete()
                .eq('id', moduleId);

            if (error) throw error;
            fetchCourseData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateLesson = async (e, moduleId) => {
        e.preventDefault();
        if (!newLessonTitle.trim()) return;

        setIsCreatingLesson(true);
        try {
            // Encontrar el módulo actual para saber el orden
            const currentModule = modules.find(m => m.id === moduleId);
            const nextOrder = (currentModule?.lessons?.length || 0) > 0
                ? Math.max(...currentModule.lessons.map(l => l.order)) + 1
                : 1;

            const { error: insertError } = await supabase
                .schema('iavolution')
                .from('lessons')
                .insert([{
                    title: newLessonTitle,
                    module_id: moduleId,
                    order: nextOrder
                }]);

            if (insertError) throw insertError;

            setNewLessonTitle('');
            setAddingLessonTo(null);
            await fetchCourseData();
        } catch (err) {
            console.error('Error creating lesson:', err);
            await showAlert('Error al crear la lección', 'error');
        } finally {
            setIsCreatingLesson(false);
        }
    };

    const handleCreateMaterial = async (e, lessonId) => {
        e.preventDefault();

        // Validar que tengamos o URL o archivo
        if (!newMaterial.title.trim()) return;
        if (!newMaterial.url.trim() && !selectedFile) {
            await showAlert('Debes proporcionar una URL o seleccionar un archivo.', 'warning');
            return;
        }

        setIsCreatingMaterial(true);
        // setUploadProgress(0);

        try {
            let fileUrl = newMaterial.url;

            // Si hay un archivo seleccionado, subirlo primero
            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                const filePath = `course-${id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('course-content')
                    .upload(filePath, selectedFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    // Si el error es que el bucket no existe, avisamos
                    if (uploadError.message.includes('bucket not found')) {
                        throw new Error('El sistema de almacenamiento no está configurado (Bucket "course-content" no encontrado).');
                    }
                    throw uploadError;
                }

                // Obtener URL pública
                const { data: publicUrlData } = supabase.storage
                    .from('course-content')
                    .getPublicUrl(filePath);

                fileUrl = publicUrlData.publicUrl;
            }

            const { error: insertError } = await supabase
                .schema('iavolution')
                .from('materials')
                .insert([{
                    title: newMaterial.title,
                    type: newMaterial.type,
                    file_url: fileUrl,
                    lesson_id: lessonId
                }]);

            if (insertError) throw insertError;

            setNewMaterial({ title: '', type: 'video', url: '' });
            setSelectedFile(null);
            await fetchCourseData();
        } catch (err) {
            console.error('Error creating material:', err);
            await showAlert(err.message || 'Error al añadir el material', 'error');
        } finally {
            setIsCreatingMaterial(false);
            setUploadProgress(0);
        }
    };

    const handleDeleteMaterial = async (materialId) => {
        const confirmed = await showConfirm('¿Seguro que quieres eliminar este material?', 'Esta acción no se puede deshacer.', 'warning');
        if (!confirmed) return;
        try {
            const { error } = await supabase
                .schema('iavolution')
                .from('materials')
                .delete()
                .eq('id', materialId);

            if (error) throw error;
            fetchCourseData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateAssignment = async (e, lessonId) => {
        e.preventDefault();
        if (!newAssignment.title.trim()) return;

        setIsCreatingAssignment(true);
        try {
            let fileUrl = null;

            // Upload attachment file if selected
            if (assignmentFile) {
                const fileExt = assignmentFile.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                const filePath = `course-${id}/assignments/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('course-content')
                    .upload(filePath, assignmentFile, { cacheControl: '3600', upsert: false });

                if (uploadError) {
                    if (uploadError.message.includes('bucket not found')) {
                        throw new Error('El bucket "course-content" no existe. Créalo en Supabase Storage.');
                    }
                    throw uploadError;
                }

                const { data: publicUrlData } = supabase.storage.from('course-content').getPublicUrl(filePath);
                fileUrl = publicUrlData.publicUrl;
            }

            const { error } = await supabase
                .schema('iavolution')
                .from('assignments')
                .insert([{
                    ...newAssignment,
                    lesson_id: lessonId,
                    file_url: fileUrl
                }]);

            if (error) throw error;
            setNewAssignment({ title: '', instructions: '', max_points: 100 });
            setAssignmentFile(null);
            await fetchCourseData();
        } catch (err) {
            console.error(err);
            await showAlert('Error al crear la tarea: ' + (err.message || 'Error desconocido'), 'error');
        } finally {
            setIsCreatingAssignment(false);
        }
    };

    const handleCreateQuiz = async (e, lessonId) => {
        e.preventDefault();
        if (!newQuiz.title.trim()) return;

        setIsCreatingQuiz(true);
        try {
            const { error } = await supabase
                .schema('iavolution')
                .from('quizzes')
                .insert([{
                    ...newQuiz,
                    lesson_id: lessonId
                }]);

            if (error) throw error;
            setNewQuiz({ title: '', passing_score: 70 });
            await fetchCourseData();
        } catch (err) {
            console.error(err);
            await showAlert('Error al crear el cuestionario: ' + (err.message || 'Error desconocido'), 'error');
        } finally {
            setIsCreatingQuiz(false);
        }
    };

    const handleDeleteAssignment = async (assignmentId) => {
        const confirmed = await showConfirm('¿Eliminar esta tarea?', 'Se perderán las entregas de los alumnos.', 'warning');
        if (!confirmed) return;
        try {
            const { error } = await supabase.schema('iavolution').from('assignments').delete().eq('id', assignmentId);
            if (error) throw error;
            fetchCourseData();
        } catch (err) { console.error(err); }
    };

    const handleDeleteQuiz = async (quizId) => {
        const confirmed = await showConfirm('¿Eliminar este cuestionario?', 'Se perderán los intentos de los alumnos.', 'warning');
        if (!confirmed) return;
        try {
            const { error } = await supabase.schema('iavolution').from('quizzes').delete().eq('id', quizId);
            if (error) throw error;
            fetchCourseData();
        } catch (err) { console.error(err); }
    };

    const fetchQuizQuestions = async (quizId) => {
        try {
            const { data, error } = await supabase.schema('iavolution').from('quiz_questions').select('*').eq('quiz_id', quizId).order('id');
            if (error) throw error;
            setQuizQuestions(data || []);
        } catch (err) { console.error(err); }
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        if (!newQuestion.question_text.trim()) return;
        setIsSavingQuestion(true);
        try {
            const { error } = await supabase.schema('iavolution').from('quiz_questions').insert([{
                ...newQuestion,
                quiz_id: editingQuiz.id
            }]);
            if (error) throw error;
            setNewQuestion({ question_text: '', options: ['', '', '', ''], correct_answer: 0, points: 10 });
            await fetchQuizQuestions(editingQuiz.id);
        } catch (err) { console.error(err); await showAlert(err.message, 'error'); }
        finally { setIsSavingQuestion(false); }
    };

    const handleDeleteQuestion = async (id) => {
        try {
            const { error } = await supabase.schema('iavolution').from('quiz_questions').delete().eq('id', id);
            if (error) throw error;
            fetchQuizQuestions(editingQuiz.id);
        } catch (err) { console.error(err); }
    };

    // CSV Import for Quiz Questions
    const handleImportCSV = async (e) => {
        const file = e.target.files[0];
        if (!file || !editingQuiz) return;
        setIsImportingCSV(true);

        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());

            // Skip header if it looks like one
            const startIdx = lines[0].toLowerCase().includes('pregunta') ? 1 : 0;

            const questions = [];
            for (let i = startIdx; i < lines.length; i++) {
                // Parse CSV line (handle commas inside quotes)
                const parts = lines[i].match(/("[^"]*"|[^,]+)/g);
                if (!parts || parts.length < 6) continue;

                const clean = parts.map(p => p.replace(/^"|"$/g, '').trim());
                questions.push({
                    quiz_id: editingQuiz.id,
                    question_text: clean[0],
                    options: [clean[1], clean[2], clean[3], clean[4]],
                    correct_answer: parseInt(clean[5]) || 0,
                    points: parseInt(clean[6]) || 10
                });
            }

            if (questions.length === 0) {
                await showAlert('No se encontraron preguntas válidas en el CSV.\nFormato: pregunta,opcion1,opcion2,opcion3,opcion4,respuesta_correcta,puntos', 'warning');
                return;
            }

            const { error } = await supabase.schema('iavolution').from('quiz_questions').insert(questions);
            if (error) throw error;

            await showAlert(`¡${questions.length} preguntas importadas correctamente!`, 'success');
            await fetchQuizQuestions(editingQuiz.id);
        } catch (err) {
            console.error(err);
            await showAlert('Error al importar CSV: ' + (err.message || 'Error desconocido'), 'error');
        } finally {
            setIsImportingCSV(false);
            e.target.value = ''; // Reset file input
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="text-center py-20">
                <p className="text-red-400 mb-4">{error || 'Curso no encontrado'}</p>
                <Link to="/admin/courses" className="text-indigo-400 hover:underline">Volver a mis cursos</Link>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header Miga de Pan */}
            <div className="mb-8">
                <Link to="/admin/courses" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Mis Cursos
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${course.status === 'published'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                }`}>
                                {course.status === 'published' ? 'Publicado' : 'Borrador'}
                            </span>
                            <span className="text-slate-500 text-sm">{course.category}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">{course.title}</h1>
                        <p className="text-slate-400 mt-2 max-w-2xl">{course.description}</p>
                    </div>
                    {/* Course Actions here (like Publish) later */}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tabs */}
                    <div className="flex space-x-1 bg-slate-900 border border-slate-800 rounded-xl p-1 mb-6">
                        <button
                            onClick={() => setActiveTab('curriculum')}
                            className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'curriculum' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            <BookOpen className="w-4 h-4" /> Temario del Curso
                        </button>
                        <button
                            onClick={() => setActiveTab('editions')}
                            className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'editions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <Users className="w-4 h-4" /> Ediciones
                        </button>
                        <button
                            onClick={() => setActiveTab('calendar')}
                            className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'calendar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <Calendar className="w-4 h-4" /> Calendario
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <Shield className="w-4 h-4" /> Ajustes
                        </button>
                    </div>

                    {/* Curriculume Tab Content */}
                    {activeTab === 'curriculum' && (
                        <>
                            <div className="space-y-4">
                                {modules.map((module) => (
                                    <div key={module.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                                        <div
                                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
                                            onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 font-bold">
                                                    {module.order}
                                                </div>
                                                <h3 className="font-semibold text-white">{module.title}</h3>
                                                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
                                                    {module.lessons?.length || 0} lecciones
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteModule(module.id); }}
                                                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                {expandedModule === module.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                            </div>
                                        </div>

                                        {/* Lessons Accordion Body */}
                                        {expandedModule === module.id && (
                                            <div className="border-t border-slate-800 p-4 bg-slate-950/50">
                                                {module.lessons?.length === 0 ? (
                                                    <p className="text-sm text-slate-500 text-center py-4">No hay lecciones en este módulo. Comienza añadiendo una.</p>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {module.lessons.map(lesson => (
                                                            <div key={lesson.id} className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                                                                <div className="flex items-center justify-between p-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <Video className="w-4 h-4 text-slate-400" />
                                                                        <span className="text-sm text-slate-200 font-medium">{lesson.order}. {lesson.title}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {lesson.materials?.length > 0 && (
                                                                            <span className="flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md">
                                                                                <FileText className="w-3 h-3" /> {lesson.materials.length} material(es)
                                                                            </span>
                                                                        )}
                                                                        <button
                                                                            onClick={() => setEditingLessonId(editingLessonId === lesson.id ? null : lesson.id)}
                                                                            className={`p-1.5 rounded-md transition-colors ${editingLessonId === lesson.id ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10'}`}
                                                                        >
                                                                            <Edit3 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Material, Assignment & Quiz Builder (Visible when editing lesson) */}
                                                                {editingLessonId === lesson.id && (
                                                                    <div className="p-4 bg-slate-950/50 border-t border-slate-800 space-y-8">
                                                                        {/* Materials Section */}
                                                                        <section>
                                                                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Materiales de la Lección</h4>
                                                                            {/* List of existing materials */}
                                                                            {lesson.materials?.length > 0 && (
                                                                                <div className="space-y-2 mb-4">
                                                                                    {lesson.materials.map(mat => (
                                                                                        <div key={mat.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 p-2 rounded text-sm">
                                                                                            <div className="flex items-center gap-2">
                                                                                                {mat.type === 'video' ? <Video className="w-4 h-4 text-blue-400" /> : <FileText className="w-4 h-4 text-emerald-400" />}
                                                                                                <span className="text-slate-300">{mat.title}</span>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-3">
                                                                                                <a href={mat.file_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline text-xs">Ver</a>
                                                                                                <button onClick={() => handleDeleteMaterial(mat.id)} className="text-slate-500 hover:text-red-400">
                                                                                                    <Trash2 className="w-4 h-4" />
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}

                                                                            {/* Add new material form */}
                                                                            <form onSubmit={(e) => handleCreateMaterial(e, lesson.id)} className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="Nombre Material"
                                                                                        required value={newMaterial.title}
                                                                                        onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                                                                                        className="bg-slate-950 border border-slate-700 text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                                    />
                                                                                    <select
                                                                                        value={newMaterial.type}
                                                                                        onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value })}
                                                                                        className="bg-slate-950 border border-slate-700 text-slate-300 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                                    >
                                                                                        <option value="video">Vídeo (URL/YouTube)</option>
                                                                                        <option value="pdf">Documento PDF</option>
                                                                                    </select>
                                                                                    <input
                                                                                        type="url"
                                                                                        placeholder="O pega una URL..."
                                                                                        required={!selectedFile} disabled={!!selectedFile}
                                                                                        value={newMaterial.url}
                                                                                        onChange={(e) => setNewMaterial({ ...newMaterial, url: e.target.value })}
                                                                                        className="bg-slate-950 border border-slate-700 text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                                                                                    />
                                                                                </div>
                                                                                <div className="mt-3 flex items-center justify-between">
                                                                                    <input
                                                                                        type="file"
                                                                                        onChange={(e) => setSelectedFile(e.target.files[0])}
                                                                                        className="text-xs text-slate-400 file:bg-indigo-600 file:text-white file:border-0 file:rounded file:px-2 file:py-1 cursor-pointer"
                                                                                    />
                                                                                    <button type="submit" disabled={isCreatingMaterial} className="bg-indigo-600 px-3 py-1 text-xs rounded text-white font-bold">
                                                                                        {isCreatingMaterial ? '...' : 'Añadir Material'}
                                                                                    </button>
                                                                                </div>
                                                                            </form>
                                                                        </section>

                                                                        {/* Assignments Section */}
                                                                        <section className="pt-4 border-t border-slate-800">
                                                                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tareas (Assignments)</h4>
                                                                            {lesson.assignments?.map(asn => (
                                                                                <div key={asn.id} className="flex items-center justify-between bg-purple-500/5 border border-purple-500/20 p-2 rounded mb-2 text-sm">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <FileText className="w-4 h-4 text-purple-400" />
                                                                                        <span className="text-purple-100">{asn.title} ({asn.max_points} pts)</span>
                                                                                        {asn.file_url && (
                                                                                            <a href={asn.file_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline text-xs">📎 Adjunto</a>
                                                                                        )}
                                                                                    </div>
                                                                                    <button onClick={() => handleDeleteAssignment(asn.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                                                                </div>
                                                                            ))}
                                                                            <form onSubmit={(e) => handleCreateAssignment(e, lesson.id)} className="grid grid-cols-1 gap-3">
                                                                                <div className="flex gap-2">
                                                                                    <input
                                                                                        type="text" placeholder="Título de la tarea" value={newAssignment.title}
                                                                                        onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                                                                                        className="flex-1 bg-slate-900 border border-slate-800 text-sm p-2 rounded text-white"
                                                                                    />
                                                                                    <input
                                                                                        type="number" placeholder="Pts" value={newAssignment.max_points}
                                                                                        onChange={e => setNewAssignment({ ...newAssignment, max_points: e.target.value })}
                                                                                        className="w-20 bg-slate-900 border border-slate-800 text-sm p-2 rounded text-white"
                                                                                    />
                                                                                </div>
                                                                                <textarea
                                                                                    placeholder="Instrucciones para el alumno..." value={newAssignment.instructions}
                                                                                    onChange={e => setNewAssignment({ ...newAssignment, instructions: e.target.value })}
                                                                                    className="bg-slate-900 border border-slate-800 text-sm p-2 rounded text-white h-20"
                                                                                />
                                                                                <div className="flex items-center justify-between">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Upload className="w-4 h-4 text-slate-400" />
                                                                                        <input
                                                                                            type="file"
                                                                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.zip,.rar"
                                                                                            onChange={(e) => setAssignmentFile(e.target.files[0])}
                                                                                            className="text-xs text-slate-400 file:bg-purple-600 file:text-white file:border-0 file:rounded file:px-2 file:py-1 cursor-pointer"
                                                                                        />
                                                                                        {assignmentFile && (
                                                                                            <span className="text-xs text-emerald-400">✓ {assignmentFile.name}</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <button type="submit" disabled={isCreatingAssignment} className="bg-purple-600 text-white px-4 py-1.5 rounded text-xs font-bold disabled:opacity-50">
                                                                                        {isCreatingAssignment ? 'Creando...' : 'Crear Tarea'}
                                                                                    </button>
                                                                                </div>
                                                                            </form>
                                                                        </section>

                                                                        {/* Quizzes Section */}
                                                                        <section className="pt-4 border-t border-slate-800">
                                                                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cuestionarios (Quizzes)</h4>
                                                                            {lesson.quizzes?.map(q => (
                                                                                <div key={q.id} className="flex items-center justify-between bg-amber-500/5 border border-amber-500/20 p-2 rounded mb-2 text-sm">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <BrainCircuit className="w-4 h-4 text-amber-400" />
                                                                                        <span className="text-amber-100">{q.title} (Aprobado: {q.passing_score}%)</span>
                                                                                    </div>
                                                                                    <div className="flex gap-3">
                                                                                        <button
                                                                                            onClick={() => { setEditingQuiz(q); fetchQuizQuestions(q.id); }}
                                                                                            className="text-indigo-400 text-xs hover:underline"
                                                                                        >
                                                                                            Editar Preguntas
                                                                                        </button>
                                                                                        <button onClick={() => handleDeleteQuiz(q.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                            <form onSubmit={(e) => handleCreateQuiz(e, lesson.id)} className="flex gap-2">
                                                                                <input
                                                                                    type="text" placeholder="Título del Cuestionario" value={newQuiz.title}
                                                                                    onChange={e => setNewQuiz({ ...newQuiz, title: e.target.value })}
                                                                                    className="flex-1 bg-slate-900 border border-slate-800 text-sm p-2 rounded text-white"
                                                                                />
                                                                                <input
                                                                                    type="number" placeholder="%" value={newQuiz.passing_score}
                                                                                    onChange={e => setNewQuiz({ ...newQuiz, passing_score: e.target.value })}
                                                                                    className="w-20 bg-slate-900 border border-slate-800 text-sm p-2 rounded text-white"
                                                                                />
                                                                                <button type="submit" className="bg-amber-600 text-white px-4 py-1.5 rounded text-xs font-bold">Crear</button>
                                                                            </form>
                                                                        </section>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Create Lesson Form / Button */}
                                                {addingLessonTo === module.id ? (
                                                    <form onSubmit={(e) => handleCreateLesson(e, module.id)} className="mt-4 flex gap-2">
                                                        <input
                                                            type="text"
                                                            required
                                                            autoFocus
                                                            placeholder="Título de la lección..."
                                                            className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            value={newLessonTitle}
                                                            onChange={(e) => setNewLessonTitle(e.target.value)}
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={isCreatingLesson || !newLessonTitle.trim()}
                                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                                                        >
                                                            {isCreatingLesson ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setAddingLessonTo(null); setNewLessonTitle(''); }}
                                                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </form>
                                                ) : (
                                                    <button
                                                        onClick={() => setAddingLessonTo(module.id)}
                                                        className="mt-4 w-full py-2.5 border border-dashed border-slate-700 hover:border-indigo-500 rounded-lg text-sm text-slate-400 hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <Plus className="w-4 h-4" /> Añadir nueva lección
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Create Module Form */}
                            <form onSubmit={handleCreateModule} className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex gap-3 mt-4">
                                <input
                                    type="text"
                                    placeholder="Nombre del nuevo módulo..."
                                    required
                                    value={newModuleTitle}
                                    onChange={(e) => setNewModuleTitle(e.target.value)}
                                    className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                                />
                                <button
                                    type="submit"
                                    disabled={isCreatingModule}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {isCreatingModule ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                    Crear Módulo
                                </button>
                            </form>
                        </>
                    )}

                    {/* Editions Tab Content */}
                    {activeTab === 'editions' && (
                        <div className="space-y-6">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-white mb-2">Crear Nueva Edición</h3>
                                <p className="text-sm text-slate-400 mb-4">Abre una nueva edición para recibir alumnos en un periodo específico.</p>

                                <form onSubmit={handleCreateEdition} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de la edición *</label>
                                        <input
                                            type="text" required placeholder="Ej. Enero 2026" value={newEdition.name}
                                            onChange={e => setNewEdition({ ...newEdition, name: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha inicio</label>
                                        <input
                                            type="date" value={newEdition.start_date}
                                            onChange={e => setNewEdition({ ...newEdition, start_date: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha fin</label>
                                        <input
                                            type="date" value={newEdition.end_date}
                                            onChange={e => setNewEdition({ ...newEdition, end_date: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Límite de alumnos (Opcional)</label>
                                        <input
                                            type="number" min="1" placeholder="Ej. 30" value={newEdition.max_students}
                                            onChange={e => setNewEdition({ ...newEdition, max_students: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm"
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex items-end gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Video className="w-3.5 h-3.5" /> URL de Clase en Vivo (Zoom/Meet)</label>
                                            <input
                                                type="url" placeholder="https://zoom.us/j/123456789" value={newEdition.live_class_url}
                                                onChange={e => setNewEdition({ ...newEdition, live_class_url: e.target.value })}
                                                className="w-full bg-slate-950 border border-indigo-700/50 rounded-lg p-2.5 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                        <button type="submit" disabled={isCreatingEdition} className="bg-indigo-600 hover:bg-indigo-500 transition-colors text-white font-bold py-2.5 px-6 rounded-lg whitespace-nowrap h-[42px]">
                                            {isCreatingEdition ? 'Creando...' : 'Crear Edición'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-lg font-bold text-white mb-4">Ediciones Actuales ({editions.length})</h3>
                                {editions.length === 0 ? (
                                    <p className="text-slate-500 text-center py-8 bg-slate-900/50 rounded-xl border border-slate-800">
                                        Aún no hay ediciones. Crea una para empezar a matricular alumnos.
                                    </p>
                                ) : (
                                    editions.map(edition => (
                                        <div key={edition.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className="font-bold text-white">{edition.name}</h4>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${edition.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                                                        }`}>
                                                        {edition.status === 'active' ? 'Activa' : 'Cerrada'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                                                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />
                                                        {edition.start_date ? new Date(edition.start_date).toLocaleDateString() : 'Sin inicio'} -
                                                        {edition.end_date ? new Date(edition.end_date).toLocaleDateString() : 'Sin fin'}
                                                    </span>
                                                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />
                                                        {edition.max_students ? `Cupo: ${edition.max_students}` : 'Ilimitado'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 max-w-sm">
                                                    <Video className="w-4 h-4 text-indigo-400" />
                                                    <input
                                                        type="url"
                                                        placeholder="Pegar URL de Zoom / Meet..."
                                                        defaultValue={edition.live_class_url || ''}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== (edition.live_class_url || '')) {
                                                                handleUpdateEditionUrl(edition.id, e.target.value);
                                                            }
                                                        }}
                                                        className="flex-1 bg-slate-950 border border-slate-700/50 rounded px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                                                    />
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteEdition(edition.id)} className="text-slate-500 hover:text-red-400 p-2">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'calendar' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-6">
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-indigo-400" /> Gestión del Calendario
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">Crea eventos, tutorías o sesiones en vivo para este curso y sus ediciones.</p>
                            </div>

                            <CourseCalendar
                                courseId={id}
                                isAdminView={true}
                            />
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-8">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                <Shield className="w-6 h-6 text-indigo-400" /> Configuración del Curso
                            </h2>

                            <div className="max-w-xl space-y-6">
                                <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-xl">
                                    <label className="block text-sm font-bold text-white mb-2">Instructor Principal</label>
                                    <p className="text-xs text-slate-500 mb-4">
                                        Asigna a un profesor para que pueda gestionar las calificaciones y el seguimiento de los alumnos de este curso.
                                    </p>

                                    <div className="flex gap-4">
                                        <select
                                            value={course?.teacher_id || ''}
                                            onChange={(e) => handleUpdateInstructor(e.target.value)}
                                            disabled={isSavingInstructor || loadingTeachers}
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                        >
                                            <option value="">-- Sin instructor asignado --</option>
                                            {teachers.map(teacher => (
                                                <option key={teacher.id} value={teacher.id}>
                                                    {teacher.name || teacher.email}
                                                </option>
                                            ))}
                                        </select>

                                        {loadingTeachers && <Loader2 className="w-5 h-5 animate-spin text-slate-500 self-center" />}
                                    </div>

                                    {course?.teacher_id && (
                                        <div className="mt-4 flex items-center gap-2 text-xs text-indigo-400 bg-indigo-400/5 p-2 rounded-lg border border-indigo-400/10">
                                            <Shield className="w-3.5 h-3.5" />
                                            <span>Este profesor tendrá acceso al panel de calificaciones de este curso.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
                        <h3 className="font-bold text-white mb-2">Editor de Cursos</h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Estructura tu temario creando Módulos. Dentro de cada módulo podrás añadir lecciones en el formato que prefieras (Vídeos, SCORM, PDFs).
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400 cursor-not-allowed">Configuración del Curso</span>
                                <Edit3 className="w-4 h-4 text-slate-600" />
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400 cursor-not-allowed">Alumnos Matriculados</span>
                                <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-xs">0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quiz Question Editor Modal */}
            {
                editingQuiz && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Editar Preguntas: {editingQuiz.title}</h3>
                                    <p className="text-slate-400 text-sm">Añade preguntas de opción múltiple o importa desde CSV</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer transition-colors ${isImportingCSV ? 'bg-slate-700 text-slate-400' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                                        <Upload className="w-4 h-4" />
                                        {isImportingCSV ? 'Importando...' : 'Importar CSV'}
                                        <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" disabled={isImportingCSV} />
                                    </label>
                                    <button onClick={() => setEditingQuiz(null)} className="text-slate-400 hover:text-white">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Form to add a new question */}
                                <form onSubmit={handleAddQuestion} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Texto de la pregunta</label>
                                        <input
                                            type="text" required value={newQuestion.question_text}
                                            onChange={e => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                            placeholder="Ej: ¿Cuál es la capital de Francia?"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {newQuestion.options.map((opt, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <input
                                                    type="radio" name="correct" checked={newQuestion.correct_answer === idx}
                                                    onChange={() => setNewQuestion({ ...newQuestion, correct_answer: idx })}
                                                    className="w-4 h-4 accent-indigo-500"
                                                />
                                                <input
                                                    type="text" required value={opt}
                                                    onChange={e => {
                                                        const newOpts = [...newQuestion.options];
                                                        newOpts[idx] = e.target.value;
                                                        setNewQuestion({ ...newQuestion, options: newOpts });
                                                    }}
                                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    placeholder={`Opción ${idx + 1}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-slate-400">Puntos:</label>
                                            <input
                                                type="number" value={newQuestion.points}
                                                onChange={e => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) })}
                                                className="w-16 bg-slate-900 border border-slate-700 rounded p-1 text-sm text-white"
                                            />
                                        </div>
                                        <button
                                            type="submit" disabled={isSavingQuestion}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                                        >
                                            {isSavingQuestion ? 'Guardando...' : 'Añadir Pregunta'}
                                        </button>
                                    </div>
                                </form>

                                {/* List of existing questions */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                        Preguntas Actuales ({quizQuestions.length})
                                    </h4>
                                    {quizQuestions.length === 0 ? (
                                        <p className="text-slate-500 text-center py-8 italic border-2 border-dashed border-slate-800 rounded-xl">No hay preguntas aún.</p>
                                    ) : (
                                        quizQuestions.map((q, idx) => (
                                            <div key={q.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl group relative">
                                                <button
                                                    onClick={() => handleDeleteQuestion(q.id)}
                                                    className="absolute top-4 right-4 text-slate-600 hover:text-red-400"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <p className="font-medium text-white pr-8">{idx + 1}. {q.question_text}</p>
                                                <div className="grid grid-cols-2 gap-2 mt-3">
                                                    {q.options.map((opt, oIdx) => (
                                                        <div key={oIdx} className={`text-xs p-2 rounded ${oIdx === q.correct_answer ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}>
                                                            {opt}
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest font-bold">Valor: {q.points} puntos</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-end">
                                <button
                                    onClick={() => setEditingQuiz(null)}
                                    className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                                >
                                    Listo
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default CourseBuilder;
