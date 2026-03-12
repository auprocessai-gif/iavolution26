import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle, Loader2 } from 'lucide-react';

const ModalContext = createContext({});

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState({
        title: '',
        message: '',
        type: 'info', // 'info' | 'success' | 'error' | 'warning' | 'confirm'
        onConfirm: null,
        onCancel: null,
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        loading: false
    });

    const closeModal = useCallback(() => {
        setIsOpen(false);
        // Clear config after animation
        setTimeout(() => {
            setConfig(prev => ({ ...prev, loading: false }));
        }, 300);
    }, []);

    const showAlert = useCallback((message, type = 'info', title = '') => {
        return new Promise((resolve) => {
            setConfig({
                title: title || (type === 'error' ? 'Error' : type === 'success' ? 'Éxito' : 'Atención'),
                message,
                type,
                confirmText: 'Entendido',
                onConfirm: () => {
                    closeModal();
                    resolve(true);
                },
                onCancel: null
            });
            setIsOpen(true);
        });
    }, [closeModal]);

    const showConfirm = useCallback((message, title = '¿Estás seguro?') => {
        return new Promise((resolve) => {
            setConfig({
                title,
                message,
                type: 'confirm',
                confirmText: 'Confirmar',
                cancelText: 'Cancelar',
                onConfirm: () => {
                    closeModal();
                    resolve(true);
                },
                onCancel: () => {
                    closeModal();
                    resolve(false);
                }
            });
            setIsOpen(true);
        });
    }, [closeModal]);

    const getIcon = () => {
        switch (config.type) {
            case 'success': return <CheckCircle2 className="w-12 h-12 text-emerald-400" />;
            case 'error': return <AlertCircle className="w-12 h-12 text-rose-400" />;
            case 'warning': return <AlertTriangle className="w-12 h-12 text-amber-400" />;
            case 'confirm': return <AlertTriangle className="w-12 h-12 text-indigo-400" />;
            default: return <Info className="w-12 h-12 text-blue-400" />;
        }
    };

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm }}>
            {children}

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        onClick={config.type !== 'confirm' ? closeModal : undefined}
                    />

                    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/50 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        {/* Status Bar */}
                        <div className={`h-1.5 w-full ${config.type === 'success' ? 'bg-emerald-500' :
                                config.type === 'error' ? 'bg-rose-500' :
                                    config.type === 'warning' ? 'bg-amber-500' :
                                        config.type === 'confirm' ? 'bg-indigo-500' : 'bg-blue-500'
                            }`} />

                        <div className="p-8 flex flex-col items-center text-center">
                            <div className="mb-6 bg-slate-950/50 p-4 rounded-2xl border border-slate-800 shadow-inner">
                                {getIcon()}
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                                {config.title}
                            </h3>

                            <p className="text-slate-400 text-sm leading-relaxed">
                                {config.message}
                            </p>
                        </div>

                        <div className="p-6 pt-0 flex gap-3">
                            {config.type === 'confirm' && (
                                <button
                                    onClick={config.onCancel}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
                                >
                                    {config.cancelText}
                                </button>
                            )}
                            <button
                                onClick={config.onConfirm}
                                className={`flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${config.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' :
                                        config.type === 'error' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' :
                                            config.type === 'warning' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' :
                                                'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                                    }`}
                            >
                                {config.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
};
