import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';

const CourseCreation = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('IA Básica');
    const [coverUrl, setCoverUrl] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const { data, error: insertError } = await supabase
                .schema('iavolution')
                .from('courses')
                .insert([
                    {
                        title,
                        description,
                        category,
                        cover_image_url: coverUrl,
                        teacher_id: profile.id,
                        status: 'draft' // Always draft when creating
                    }
                ])
                .select()
                .single();

            if (insertError) throw insertError;

            // Redirigir al "CourseBuilder" para añadir módulos y lecciones
            navigate(`/admin/courses/${data.id}`);
        } catch (err) {
            console.error(err);
            setError(err.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <Link to="/admin/courses" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver a mis cursos
            </Link>

            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Crear Nueva Sala</h1>
                <p className="text-slate-400">Define los detalles básicos del curso antes de empezar a subir el temario.</p>
            </header>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Título del Curso</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            placeholder="Ej: Automatización de Procesos con IA"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Descripción Corta</label>
                        <textarea
                            required
                            rows="4"
                            className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                            placeholder="¿De qué trata este curso? ¿Qué van a aprender los alumnos?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Categoría</label>
                            <select
                                className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <option value="IA Básica">IA Básica</option>
                                <option value="Automatización">Automatización</option>
                                <option value="Programación">Programación</option>
                                <option value="Marketing">Marketing y Diseño</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">URL de la Imagen de Portada</label>
                            <input
                                type="url"
                                className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                placeholder="https://ejemplo.com/imagen.png"
                                value={coverUrl}
                                onChange={(e) => setCoverUrl(e.target.value)}
                            />
                            <p className="text-xs text-slate-500 mt-2">Puedes dejarlo en blanco por ahora o usar un enlace online.</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-800 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center min-w-[150px] disabled:opacity-70"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear y Continuar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CourseCreation;
