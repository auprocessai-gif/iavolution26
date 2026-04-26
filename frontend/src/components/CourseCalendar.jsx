import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    Video,
    Plus,
    X,
    MoreVertical,
    Trash2,
    CalendarDays,
    Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';

const CourseCalendar = ({ courseId, editionId, isAdminView = false }) => {
    const { profile } = useAuth();
    const { showAlert, showConfirm } = useModal();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        event_type: 'tutoria',
        start_time: '',
        end_time: ''
    });

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .schema('iavolution')
                .from('events')
                .select('*')
                .eq('course_id', courseId);

            if (editionId) {
                query = query.or(`edition_id.eq.${editionId},edition_id.is.null`);
            } else if (!isAdminView) {
                query = query.is('edition_id', null);
            }

            const { data, error } = await query.order('start_time', { ascending: true });

            if (error) throw error;
            setEvents(data || []);
        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            setLoading(false);
        }
    }, [courseId, editionId, isAdminView]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleAddEvent = async () => {
        if (!newEvent.title || !newEvent.start_time) {
            await showAlert('Por favor, completa los campos obligatorios.', 'warning');
            return;
        }

        try {
            // Limpiar campos opcionales antes de insertar
            const eventToInsert = {
                title: newEvent.title,
                description: newEvent.description || null,
                event_type: newEvent.event_type,
                start_time: newEvent.start_time,
                end_time: newEvent.end_time || null,
                course_id: courseId,
                edition_id: editionId || null,
                created_by: profile.id
            };

            const { error } = await supabase
                .schema('iavolution')
                .from('events')
                .insert([eventToInsert]);

            if (error) throw error;

            await showAlert('Evento creado con éxito.', 'success');
            setShowAddModal(false);
            setNewEvent({ title: '', description: '', event_type: 'tutoria', start_time: '', end_time: '' });
            fetchEvents();
        } catch (err) {
            console.error(err);
            await showAlert('Error al crear el evento.', 'error');
        }
    };

    const handleDeleteEvent = async (id) => {
        if (!await showConfirm('¿Seguro que quieres eliminar este evento?')) return;

        try {
            const { error } = await supabase
                .schema('iavolution')
                .from('events')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchEvents();
        } catch (err) {
            console.error(err);
            await showAlert('Error al eliminar el evento.', 'error');
        }
    };

    // Calendar logic
    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const startDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days = [];
        const totalDays = daysInMonth(year, month);
        const startDay = startDayOfMonth(year, month);

        // Padding days for start of month
        for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) {
            days.push(<div key={`pad-${i}`} className="h-24 bg-slate-900/20 border border-slate-800/50" />);
        }

        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.start_time.startsWith(dateStr));
            const isToday = new Date().toISOString().startsWith(dateStr);

            days.push(
                <div key={d} className={`h-24 bg-slate-900/50 border border-slate-800 p-1 relative group hover:bg-slate-800/50 transition-colors ${isToday ? 'ring-2 ring-indigo-500/50 z-10' : ''}`}>
                    <span className={`text-xs font-bold ${isToday ? 'text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded' : 'text-slate-500'}`}>
                        {d}
                    </span>
                    <div className="mt-1 space-y-1 overflow-y-auto max-h-[60px] scrollbar-hide">
                        {dayEvents.map(e => (
                            <div
                                key={e.id}
                                className={`text-[10px] px-1.5 py-0.5 rounded truncate border flex items-center gap-1 ${e.event_type === 'tutoria' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                    e.event_type === 'exam' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    }`}
                                title={e.title}
                            >
                                <div className={`w-1 h-1 rounded-full ${e.event_type === 'tutoria' ? 'bg-indigo-400' :
                                    e.event_type === 'exam' ? 'bg-rose-400' : 'bg-emerald-400'
                                    }`} />
                                {e.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return days;
    };

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-950/30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                        <CalendarDays className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Calendario de Clases</h2>
                        <p className="text-xs text-slate-500">Eventos, tutorías y fechas clave</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-950 rounded-xl border border-slate-800 p-1">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                        <div className="px-4 py-1.5 text-sm font-bold text-white min-w-[140px] text-center">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </div>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-all"><ChevronRight className="w-5 h-5" /></button>
                    </div>

                    {isAdminView && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                        >
                            <Plus className="w-4 h-4" /> Crear Evento
                        </button>
                    )}
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4 bg-slate-950/20">
                <div className="grid grid-cols-7 mb-2">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                        <div key={day} className="text-center text-[10px] font-black uppercase text-slate-600 tracking-widest pb-2">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 border-t border-l border-slate-800">
                    {renderCalendar()}
                </div>
            </div>

            {/* Upcoming Events List */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/30">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Próximos Eventos
                </h3>
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex items-center gap-2 text-slate-500 text-sm py-4"><Loader2 className="w-4 h-4 animate-spin" /> Cargando eventos...</div>
                    ) : events.filter(e => new Date(e.start_time) >= new Date()).length === 0 ? (
                        <p className="text-sm text-slate-500 italic py-4">No hay eventos próximos programados.</p>
                    ) : (
                        events
                            .filter(e => new Date(e.start_time) >= new Date())
                            .slice(0, 3)
                            .map(event => (
                                <div key={event.id} className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl group hover:border-indigo-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${event.event_type === 'tutoria' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                            event.event_type === 'exam' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            }`}>
                                            {event.event_type === 'tutoria' ? <Video className="w-6 h-6" /> : <CalendarIcon className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{event.title}</h4>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(event.start_time).toLocaleString()}</span>
                                                {event.description && <span className="truncate max-w-[200px]">{event.description}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {isAdminView && (
                                        <button
                                            onClick={() => handleDeleteEvent(event.id)}
                                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))
                    )}
                </div>
            </div>

            {/* Add Event Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-indigo-400" /> Nuevo Evento
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-widest">Título del Evento</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Tutoría Grupal Módulo 1"
                                    value={newEvent.title}
                                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-widest">Tipo</label>
                                    <select
                                        value={newEvent.event_type}
                                        onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                    >
                                        <option value="tutoria">Tutoría</option>
                                        <option value="exam">Examen / Hito</option>
                                        <option value="milestone">Inauguración</option>
                                        <option value="other">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-widest">Fecha y Hora</label>
                                    <input
                                        type="datetime-local"
                                        value={newEvent.start_time}
                                        onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-widest">Descripción (Opcional)</label>
                                <textarea
                                    value={newEvent.description}
                                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none text-sm"
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddEvent}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all"
                            >
                                Confirmar Evento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseCalendar;
