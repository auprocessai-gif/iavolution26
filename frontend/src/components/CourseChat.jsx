import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Loader2, User, Hash, Sparkles, Brain, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getGeminiResponse } from '../lib/gemini';
import { useModal } from '../contexts/ModalContext';

const CourseChat = ({ courseId }) => {
    const { user, profile } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const { showAlert } = useModal();
    const messagesEndRef = useRef(null);

    // AI States
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [chatSummary, setChatSummary] = useState('');
    const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
    const [moderating, setModerating] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        fetchMessages();

        // Subscribe to real-time changes
        const channel = supabase
            .channel(`course_chat_${courseId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'iavolution',
                    table: 'course_messages',
                    filter: `course_id=eq.${courseId}`
                },
                (payload) => {
                    // Fetch the user profile for the new message
                    fetchUserProfile(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [courseId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .schema('iavolution')
                .from('course_messages')
                .select(`
                    *,
                    profiles:user_id (name, avatar_url, role:roles(name))
                `)
                .eq('course_id', courseId)
                .order('created_at', { ascending: true })
                .limit(50);

            if (error) throw error;
            setMessages(data || []);
        } catch (err) {
            console.error('Error fetching chat messages:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUserProfile = async (newMessage) => {
        try {
            const { data: profileData } = await supabase
                .schema('iavolution')
                .from('profiles')
                .select('name, avatar_url, role:roles(name)')
                .eq('id', newMessage.user_id)
                .single();

            const messageWithProfile = {
                ...newMessage,
                profiles: profileData
            };

            setMessages(current => [...current, messageWithProfile]);
        } catch (err) {
            console.error('Error fetching profile for real-time message:', err);
            setMessages(current => [...current, newMessage]);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        setModerating(true);
        try {
            // AI Moderation
            const modSys = "Eres un moderador de IA para un chat de academia profesional. El mensaje debe ser respetuoso y apto para un entorno educativo. Responde 'OK' si es apto o un breve mensaje de error si no lo es.";
            const modResp = await getGeminiResponse(newMessage.trim(), modSys);
            
            if (modResp.toUpperCase().trim() !== 'OK') {
                showAlert(`Tu mensaje ha sido filtrado: ${modResp}`, 'warning');
                setIsSending(false);
                setModerating(false);
                return;
            }

            const { error } = await supabase
                .schema('iavolution')
                .from('course_messages')
                .insert({
                    course_id: courseId,
                    user_id: user.id,
                    content: newMessage.trim()
                });

            if (error) throw error;
            setNewMessage('');
            // Fallback: refetch messages in case Realtime isn't active
            setTimeout(() => fetchMessages(), 300);
        } catch (err) {
            console.error('Error sending message:', err);
            showAlert('Error al enviar mensaje: ' + (err.message || 'Inténtalo de nuevo'), 'error');
        } finally {
            setIsSending(false);
            setModerating(false);
        }
    };

    const generateChatSummary = async () => {
        if (!messages.length || isSummarizing) return;
        setIsSummarizing(true);
        try {
            const sys = "Eres un tutor IA. Resume los últimos mensajes de este chat del curso en 3 puntos clave para que un alumno se ponga al día.";
            const ctx = messages.map(m => `${m.profiles?.name}: ${m.content}`).join('\n');
            const resp = await getGeminiResponse("Resume esta conversación de chat:", sys + "\n\nCHAT:\n" + ctx);
            setChatSummary(resp);
        } catch (error) {
            showAlert('Error al generar resumen del chat.', 'error');
        } finally {
            setIsSummarizing(false);
        }
    };

    const suggestChatReply = async () => {
        if (!messages.length || isGeneratingSuggestion) return;
        setIsGeneratingSuggestion(true);
        try {
            const sys = "Eres un profesor mentor en un chat en vivo. Basándote en la conversación actual, propón una respuesta profesional y rápida. Máximo 2 frases.";
            const ctx = messages.map(m => `${m.profiles?.name}: ${m.content}`).join('\n');
            const resp = await getGeminiResponse("Propón una respuesta para el chat:", sys + "\n\nCHAT:\n" + ctx);
            setNewMessage(resp);
        } catch (error) {
            showAlert('Error al generar sugerencia de chat.', 'error');
        } finally {
            setIsGeneratingSuggestion(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                <p className="font-medium">Cargando chat del curso...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[600px] bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                        <Hash className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold">Canal del Curso</h3>
                        <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">En tiempo real</p>
                    </div>
                </div>
                <button 
                    onClick={generateChatSummary}
                    disabled={isSummarizing || messages.length < 2}
                    className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {isSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Resumen IA
                </button>
            </div>

            {chatSummary && (
                <div className="px-6 py-4 bg-indigo-500/5 border-b border-slate-800 animate-in slide-in-from-top duration-300 relative group">
                    <button onClick={() => setChatSummary('')} className="absolute top-2 right-2 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                    </button>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                            <Brain className="w-3 h-3 text-indigo-400" />
                        </div>
                        <div>
                            <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Resumen del Chat</h4>
                            <div className="text-xs text-slate-400 leading-relaxed italic">
                                {chatSummary}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-12">
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 border border-slate-700">
                            <Send className="w-8 h-8 text-slate-500" />
                        </div>
                        <h4 className="text-white font-bold mb-1">¡Sé el primero en saludar!</h4>
                        <p className="text-sm text-slate-500">Usa este espacio para interactuar en tiempo real con tus compañeros y tutores.</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOwn = msg.user_id === user.id;
                        const isStaff = msg.profiles?.role?.name === 'admin' || msg.profiles?.role?.name === 'teacher' || msg.profiles?.role?.name === 'manager';
                        
                        return (
                            <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[80%] flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs ${
                                        isOwn ? 'bg-indigo-600 text-white' : isStaff ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                                    }`}>
                                        {msg.profiles?.avatar_url ? (
                                            <img src={msg.profiles.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" />
                                        ) : (
                                            <User className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isOwn ? 'text-indigo-400' : isStaff ? 'text-amber-400' : 'text-slate-500'}`}>
                                                {msg.profiles?.name || 'Usuario'} {isStaff && '(Staff)'}
                                            </span>
                                            <span className="text-[9px] text-slate-600 font-bold">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                            isOwn 
                                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                                : isStaff 
                                                    ? 'bg-slate-800 text-amber-50 border border-amber-500/20 rounded-tl-none'
                                                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50'
                                        }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-slate-900 border-t border-slate-800">
                <div className="flex justify-between items-center mb-2 px-2">
                    <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest flex items-center gap-1">
                        {moderating ? <ShieldCheck className="w-3 h-3 text-emerald-500 animate-pulse" /> : <ShieldCheck className="w-3 h-3" />}
                        {moderating ? 'Validando con IA...' : 'Moderación activa por IA'}
                    </p>
                    {(profile?.roleName === 'admin' || profile?.roleName === 'teacher') && (
                        <button 
                            type="button"
                            onClick={suggestChatReply}
                            disabled={isGeneratingSuggestion || !messages.length}
                            className="text-[8px] font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 uppercase tracking-widest group"
                        >
                            <Brain className="w-2.5 h-2.5 group-hover:scale-110 transition-transform" />
                            Sugerir Respuesta IA
                        </button>
                    )}
                </div>
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 pr-16 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || isSending}
                        className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 group"
                    >
                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CourseChat;
