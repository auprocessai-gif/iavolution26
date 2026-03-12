import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit3, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useModal } from '../../contexts/ModalContext';

const CourseList = () => {
    const { profile } = useAuth();
    const { showConfirm } = useModal();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            // Un admin (o un teacher) de momento ve todos. Más adelante podemos filtrar por 'teacher_id'.
            const { data, error } = await supabase
                .schema('iavolution')
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCourses(data);
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (courseId, currentStatus) => {
        const newStatus = currentStatus === 'draft' ? 'published' : 'draft';
        try {
            const { error } = await supabase
                .schema('iavolution')
                .from('courses')
                .update({ status: newStatus })
                .eq('id', courseId);

            if (error) throw error;
            fetchCourses();
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleDelete = async (courseId) => {
        const confirmed = await showConfirm(
            '¿Seguro que quieres eliminar este curso?',
            'Esta acción es irreversible y borrará todo el contenido asociado.',
            'warning'
        );
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .schema('iavolution')
                .from('courses')
                .delete()
                .eq('id', courseId);

            if (error) throw error;
            fetchCourses();
        } catch (error) {
            console.error("Error deleting course:", error);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Mis Cursos</h1>
                    <p className="text-slate-400">Gestiona y crea tus salas de formación.</p>
                </div>
                <Link
                    to="/admin/courses/new"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Crear Nuevo Curso
                </Link>
            </header>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            ) : courses.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Edit3 className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Aún no tienes cursos</h3>
                    <p className="text-slate-400 mb-6">Empieza creando tu primera sala de contenido formativo.</p>
                    <Link
                        to="/admin/courses/new"
                        className="inline-flex bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                    >
                        Comenzar ahora
                    </Link>
                </div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="bg-slate-950/50 text-xs uppercase text-slate-300 border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Curso</th>
                                    <th className="px-6 py-4 font-medium">Estado</th>
                                    <th className="px-6 py-4 font-medium">Fecha Creación</th>
                                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {courses.map((course) => (
                                    <tr key={course.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-white text-base">{course.title}</span>
                                                <span className="text-xs text-slate-500 mt-1 line-clamp-1">{course.description}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleStatus(course.id, course.status)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${course.status === 'published'
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                                                    }`}
                                            >
                                                {course.status === 'published' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                                {course.status === 'published' ? 'Publicado' : 'Borrador'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            {new Date(course.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/admin/courses/${course.id}`}
                                                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                                    title="Editar Temario"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(course.id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseList;
