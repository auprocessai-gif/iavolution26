import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Plus, Loader2, User, ChevronRight, Pin, ArrowLeft, Send, Sparkles, Brain, ShieldCheck, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getGeminiResponse } from '../lib/gemini';
import { useModal } from '../contexts/ModalContext';

const CourseForum = ({ courseId }) => {
    const { user, profile } = useAuth();
    const [topics, setTopics] = useState([]);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [showNewTopicForm, setShowNewTopicForm] = useState(false);
    
    // Form States
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [newTopicContent, setNewTopicContent] = useState('');
    const [newReplyContent, setNewReplyContent] = useState('');
    const { showAlert } = useModal();

    // AI States
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [topicSummary, setTopicSummary] = useState('');
    const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
    const [moderating, setModerating] = useState(false);

    useEffect(() => {
        fetchTopics();
    }, [courseId]);

    useEffect(() => {
        if (selectedTopic) {
            fetchPosts(selectedTopic.id);
        }
    }, [selectedTopic]);

    const fetchTopics = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .schema('iavolution')
                .from('forum_topics')
                .select(`
                    *,
                    profiles:author_id (name, avatar_url, role:roles(name))
                `)
                .eq('course_id', courseId)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTopics(data || []);
        } catch (err) {
            console.error('Error fetching forum topics:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPosts = async (topicId) => {
        try {
            const { data, error } = await supabase
                .schema('iavolution')
                .from('forum_posts')
                .select(`
                    *,
                    profiles:author_id (name, avatar_url, role:roles(name))
                `)
                .eq('topic_id', topicId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setPosts(data || []);
        } catch (err) {
            console.error('Error fetching posts:', err);
        }
    };

    const handleCreateTopic = async (e) => {
        e.preventDefault();
        if (!newTopicTitle.trim() || !newTopicContent.trim() || isPosting) return;

        setIsPosting(true);
        setModerating(true);
        try {
            // AI Moderation for Title and Content
            const modSys = "Eres un moderador de IA para una academia profesional. Evalúa si el título y contenido son aptos (respetuosos, sin spam, sin insultos). Responde 'OK' si es apto o un breve mensaje de error si no lo es.";
            const modResp = await getGeminiResponse(`Título: ${newTopicTitle.trim()}\nContenido: ${newTopicContent.trim()}`, modSys);
            
            if (modResp.toUpperCase().trim() !== 'OK') {
                showAlert(`Tu tema ha sido filtrado: ${modResp}`, 'warning');
                setIsPosting(false);
                setModerating(false);
                return;
            }

            // 1. Create Topic
            const { data: topicData, error: topicError } = await supabase
                .schema('iavolution')
                .from('forum_topics')
                .insert({
                    course_id: courseId,
                    author_id: user.id,
                    title: newTopicTitle.trim()
                })
                .select()
                .single();

            if (topicError) throw topicError;

            // 2. Create Initial Post
            const { error: postError } = await supabase
                .schema('iavolution')
                .from('forum_posts')
                .insert({
                    topic_id: topicData.id,
                    author_id: user.id,
                    content: newTopicContent.trim()
                });

            if (postError) throw postError;

            setNewTopicTitle('');
            setNewTopicContent('');
            setShowNewTopicForm(false);
            fetchTopics();
        } catch (err) {
            console.error('Error creating topic:', err);
        } finally {
            setIsPosting(false);
            setModerating(false);
        }
    };

    const handleCreateReply = async (e) => {
        e.preventDefault();
        if (!newReplyContent.trim() || isPosting) return;

        setIsPosting(true);
        setModerating(true);
        try {
            // AI Moderation
            const modSys = "Eres un moderador de IA para una academia profesional. Evalúa si el mensaje es apto (comportamiento respetuoso, sin spam, sin insultos). Responde 'OK' si es apto o un breve mensaje de error si no lo es.";
            const modResp = await getGeminiResponse(newReplyContent.trim(), modSys);
            
            if (modResp.toUpperCase().trim() !== 'OK') {
                showAlert(`Tu mensaje ha sido filtrado: ${modResp}`, 'warning');
                setIsPosting(false);
                setModerating(false);
                return;
            }

            const { error } = await supabase
                .schema('iavolution')
                .from('forum_posts')
                .insert({
                    topic_id: selectedTopic.id,
                    author_id: user.id,
                    content: newReplyContent.trim()
                });

            if (error) throw error;

            setNewReplyContent('');
            fetchPosts(selectedTopic.id);
        } catch (err) {
            console.error('Error adding reply:', err);
        } finally {
            setIsPosting(false);
            setModerating(false);
        }
    };

    const generateSummary = async () => {
        if (!posts.length || isSummarizing) return;
        setIsSummarizing(true);
        try {
            const sys = "Eres un tutor IA. Resume esta discusión del foro en 3 puntos clave destacando la duda principal y la solución si la hay.";
            const ctx = posts.map(p => `${p.profiles?.name}: ${p.content}`).join('\n---\n');
            const resp = await getGeminiResponse("Resume esta discusión:", sys + "\n\nDISCUSIÓN:\n" + ctx);
            setTopicSummary(resp);
        } catch (error) {
            showAlert('Error al generar resumen.', 'error');
        } finally {
            setIsSummarizing(false);
        }
    };

    const suggestReply = async () => {
        if (!posts.length || isGeneratingSuggestion) return;
        setIsGeneratingSuggestion(true);
        try {
            const sys = "Eres un profesor mentor. Basándote en el hilo del foro, propón una respuesta profesional, motivadora y resolutiva. Máximo 3 frases.";
            const ctx = posts.map(p => `${p.profiles?.name}: ${p.content}`).join('\n---\n');
            const resp = await getGeminiResponse("Propón una respuesta para el profesor:", sys + "\n\nCONTEXTO:\n" + ctx);
            setNewReplyContent(resp);
        } catch (error) {
            showAlert('Error al generar sugerencia.', 'error');
        } finally {
            setIsGeneratingSuggestion(false);
        }
    };

    if (isLoading && !selectedTopic) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                <p>Cargando foro...</p>
            </div>
        );
    }

    if (selectedTopic) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <button 
                    onClick={() => { setSelectedTopic(null); setPosts([]); }}
                    className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest px-2 py-1"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver a los temas
                </button>

                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                 {selectedTopic.is_pinned && <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />}
                                 <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">DISCUSIÓN</span>
                            </div>
                            <h2 className="text-2xl font-black text-white">{selectedTopic.title}</h2>
                        </div>
                        <button 
                            onClick={generateSummary}
                            disabled={isSummarizing || posts.length < 2}
                            className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 transition-all flex items-center gap-2 shadow-xl shadow-indigo-600/5 disabled:opacity-50"
                        >
                            {isSummarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            Resumen IA
                        </button>
                    </div>

                    {topicSummary && (
                        <div className="px-8 py-6 bg-indigo-500/5 border-b border-slate-800 animate-in slide-in-from-top duration-300 relative">
                            <button onClick={() => setTopicSummary('')} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                                    <Brain className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Resumen del Hilo</h4>
                                    <div className="text-sm text-slate-300 leading-relaxed italic">
                                        {topicSummary.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-8 space-y-8">
                        {posts.map((post, index) => {
                             const isStaff = post.profiles?.role?.name === 'admin' || post.profiles?.role?.name === 'teacher' || post.profiles?.role?.name === 'manager';
                             const isOwn = post.author_id === user.id;

                             return (
                                <div key={post.id} className={`flex gap-6 ${index > 0 ? 'pt-8 border-t border-slate-800/50' : ''}`}>
                                    <div className="flex flex-col items-center gap-2 shrink-0">
                                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-bold text-lg ${
                                            isStaff ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-slate-800 border-slate-700 text-slate-500'
                                        }`}>
                                            {post.profiles?.avatar_url ? (
                                                <img src={post.profiles.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover" />
                                            ) : (
                                                <User className="w-6 h-6" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-bold ${isStaff ? 'text-amber-400' : 'text-slate-300'}`}>
                                                    {post.profiles?.name || 'Usuario'}
                                                </span>
                                                {isStaff && <span className="bg-amber-500/10 text-amber-500 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest border border-amber-500/20">Staff</span>}
                                            </div>
                                            <span className="text-xs text-slate-500 font-medium">
                                                {new Date(post.created_at).toLocaleDateString()} a las {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                            {post.content}
                                        </div>
                                    </div>
                                </div>
                             );
                        })}
                    </div>

                    <div className="p-8 bg-slate-950 border-t border-slate-800">
                        <form onSubmit={handleCreateReply} className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    {moderating ? <ShieldCheck className="w-4 h-4 text-emerald-500 animate-pulse" /> : <MessageSquare className="w-4 h-4" />}
                                    {moderating ? 'Validando con IA...' : 'Añadir una respuesta'}
                                </h4>
                                {(profile?.roleName === 'admin' || profile?.roleName === 'teacher') && (
                                    <button 
                                        type="button"
                                        onClick={suggestReply}
                                        disabled={isGeneratingSuggestion || !posts.length}
                                        className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 uppercase tracking-widest group"
                                    >
                                        <Brain className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                        Sugerir Respuesta IA
                                    </button>
                                )}
                            </div>
                            <textarea 
                                value={newReplyContent}
                                onChange={e => setNewReplyContent(e.target.value)}
                                placeholder="Escribe tu respuesta aquí..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all min-h-[120px] font-medium"
                            />
                            <div className="flex justify-between items-center">
                                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> Moderación activa por IA
                                </p>
                                <button
                                    type="submit"
                                    disabled={!newReplyContent.trim() || isPosting}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-3 rounded-xl transition-all shadow-xl shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50 group"
                                >
                                    {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                    PUBLICAR RESPUESTA
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900/50 p-6 border border-slate-800 rounded-3xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                        <MessageSquare className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Foro de Discusión</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Comunidad y resolución de dudas</p>
                    </div>
                </div>
                {!showNewTopicForm && (profile?.roleName === 'admin' || profile?.roleName === 'teacher' || profile?.roleName === 'manager') && (
                     <button 
                        onClick={() => setShowNewTopicForm(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-3 rounded-2xl transition-all shadow-xl shadow-indigo-600/30 flex items-center gap-2 group"
                    >
                        <Plus className="w-5 h-5 group-rotate-90 transition-transform" />
                        CREAR NUEVO TEMA
                    </button>
                )}
            </div>

            {showNewTopicForm ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                    <form onSubmit={handleCreateTopic} className="space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest">Crear nueva discusión</h3>
                            <button 
                                type="button"
                                onClick={() => setShowNewTopicForm(false)}
                                className="text-slate-500 hover:text-white font-bold text-xs"
                            >
                                CANCELAR
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Título del Tema</label>
                                <input 
                                    type="text"
                                    value={newTopicTitle}
                                    onChange={e => setNewTopicTitle(e.target.value)}
                                    placeholder="Ej: ¿Cómo instalar la librería X?"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Descripción / Mensaje inicial</label>
                                <textarea 
                                    value={newTopicContent}
                                    onChange={e => setNewTopicContent(e.target.value)}
                                    placeholder="Describe tu duda o sugerencia..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all min-h-[150px] font-medium"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={!newTopicTitle.trim() || !newTopicContent.trim() || isPosting}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                EMPEZAR DISCUSIÓN
                            </button>
                        </div>
                    </form>
                </div>
            ) : topics.length === 0 ? (
                <div className="bg-slate-900/30 border border-slate-800 border-dashed rounded-3xl p-12 text-center">
                    <p className="text-slate-500 font-bold italic">No hay temas abiertos en este curso aún.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {topics.map((topic) => {
                        const isPinned = topic.is_pinned;
                        return (
                            <button
                                key={topic.id}
                                onClick={() => setSelectedTopic(topic)}
                                className="w-full bg-slate-900 hover:bg-slate-900/80 border border-slate-800 hover:border-indigo-500/30 rounded-2xl p-6 flex items-center gap-6 transition-all group text-left"
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                                    isPinned ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-slate-950 border-slate-800 text-indigo-400'
                                }`}>
                                    {isPinned ? <Pin className="w-6 h-6 fill-amber-500/20" /> : <MessageSquare className="w-6 h-6" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {isPinned && <span className="bg-amber-500/10 text-amber-500 text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest border border-amber-500/20">Importante</span>}
                                        <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase truncate">{topic.profiles?.name || 'Usuario'}</span>
                                    </div>
                                    <h3 className="text-white font-bold text-lg group-hover:text-indigo-400 transition-colors truncate">{topic.title}</h3>
                                    <p className="text-xs text-slate-500 mt-1">Publicado el {new Date(topic.created_at).toLocaleDateString()}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-indigo-500 transition-colors shrink-0" />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CourseForum;
