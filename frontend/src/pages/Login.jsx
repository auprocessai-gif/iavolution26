import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Loader2, Sparkles, GraduationCap, Bot } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        const { error } = await login(email, password);

        if (error) {
            setError(error.message);
            setIsSubmitting(false);
        } else {
            navigate('/dashboard');
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-950">

            {/* Left Side — Hero Image + Branding */}
            <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden">
                {/* Background Image */}
                <img
                    src="/ai-hero-bg.png"
                    alt="AI Neural Network Visualization"
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/30 via-slate-950/10 to-slate-950" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />

                {/* Content over image */}
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    {/* Logo top-left */}
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <BrainCircuit className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white font-bold text-2xl tracking-tight">IAVolution</span>
                    </div>

                    {/* Center tagline */}
                    <div className="max-w-lg">
                        <h1 className="text-5xl font-black text-white leading-tight mb-6">
                            Domina la
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400"> Inteligencia Artificial</span>
                        </h1>
                        <p className="text-xl text-slate-300 leading-relaxed mb-8">
                            Formación práctica y certificada para profesionales que quieren liderar la revolución de la IA.
                        </p>

                        {/* Feature pills */}
                        <div className="flex flex-wrap gap-3">
                            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                <span className="text-sm text-slate-200 font-medium">Proyectos Reales</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
                                <GraduationCap className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm text-slate-200 font-medium">Certificación</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
                                <Bot className="w-4 h-4 text-blue-400" />
                                <span className="text-sm text-slate-200 font-medium">IA Aplicada</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom quote */}
                    <p className="text-slate-500 text-sm italic">
                        "La IA no reemplaza a las personas, potencia a quienes la dominan."
                    </p>
                </div>
            </div>

            {/* Right Side — Login Form */}
            <div className="w-full lg:w-2/5 flex items-center justify-center relative px-6 py-12">
                {/* Subtle background effects */}
                <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="w-full max-w-sm relative z-10">
                    {/* Mobile-only logo */}
                    <div className="flex flex-col items-center mb-10 lg:hidden">
                        <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
                            <BrainCircuit className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">IAVolution</h1>
                        <p className="text-slate-400 text-sm mt-1">La academia del futuro</p>
                    </div>

                    {/* Desktop heading */}
                    <div className="hidden lg:block mb-8">
                        <h2 className="text-3xl font-bold text-white tracking-tight">Bienvenido</h2>
                        <p className="text-slate-400 mt-2">Inicia sesión para acceder a tu formación</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm px-4 py-3 rounded-xl mb-6 animate-in fade-in">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                            <input
                                type="email"
                                required
                                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
                            <input
                                type="password"
                                required
                                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98]"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Iniciar Sesión'}
                        </button>
                    </form>

                    {/* Footer info */}
                    <div className="mt-8 pt-6 border-t border-slate-800/50">
                        <p className="text-slate-600 text-xs text-center leading-relaxed">
                            Plataforma de acceso restringido.
                            <br />Contacta con tu tutor si no tienes credenciales.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
