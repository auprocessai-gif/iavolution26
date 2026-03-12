import React, { useState, useRef, useEffect } from 'react';
import {
    Bell,
    Check,
    ChevronRight,
    Clock,
    Trash2,
    AlertCircle,
    GraduationCap,
    Calendar,
    UserPlus,
    X,
    CheckCircle2,
    Info
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { Link } from 'react-router-dom';

const NotificationBell = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getTypeIcon = (type) => {
        switch (type) {
            case 'grade': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
            case 'event': return <Calendar className="w-5 h-5 text-amber-400" />;
            case 'enrollment': return <UserPlus className="w-5 h-5 text-indigo-400" />;
            case 'system': return <Info className="w-5 h-5 text-blue-400" />;
            default: return <Bell className="w-5 h-5 text-slate-400" />;
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) return 'Ahora';
        if (diffInMinutes < 60) return `${diffInMinutes} min`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h`;

        return date.toLocaleDateString();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-xl transition-all ${isOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
                <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'animate-tada' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-4 ring-slate-950">
                        {unreadCount > 9 ? '+9' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/30">
                        <div>
                            <h3 className="text-white font-bold">Notificaciones</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Tienes {unreadCount} mensajes sin leer</p>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                Leer todas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-10 text-center">
                                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                <p className="text-sm text-slate-500">Cargando...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <Bell className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                                <p className="text-slate-500 text-sm font-medium">No hay notificaciones</p>
                                <p className="text-slate-600 text-xs mt-1">Te avisaremos cuando pase algo importante.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800/50">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`p-4 flex gap-4 transition-all hover:bg-slate-800/50 group relative ${!notif.is_read ? 'bg-indigo-500/5' : ''}`}
                                    >
                                        <div className="shrink-0 pt-1">
                                            {getTypeIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className={`text-sm font-bold truncate ${notif.is_read ? 'text-slate-300' : 'text-white'}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                                                {notif.message}
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1 font-medium">
                                                <Clock className="w-3 h-3" /> {formatTime(notif.created_at)}
                                            </p>
                                        </div>
                                        {!notif.is_read && (
                                            <button
                                                onClick={() => markAsRead(notif.id)}
                                                className="absolute right-4 top-4 w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-500 text-indigo-400 hover:text-white"
                                                title="Marcar como leída"
                                            >
                                                <Check className="w-3 h-3" />
                                            </button>
                                        )}
                                        {notif.link && (
                                            <Link
                                                to={notif.link}
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    markAsRead(notif.id);
                                                }}
                                                className="absolute inset-0 z-0"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-950/30 text-center border-t border-slate-800">
                        <button className="text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors">
                            Ver todo el historial
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
