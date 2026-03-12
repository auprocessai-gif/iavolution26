import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { BrainCircuit, Loader2 } from 'lucide-react';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student'); // Nuevo: Alumno por defecto
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setMessage('');

        // Pass role to the register function
        const { error: signUpError, data } = await register(email, password, name, role);

        if (signUpError) {
            setError(signUpError.message);
            setIsSubmitting(false);
        } else {
            if (data?.user?.identities?.length === 0) {
                setError("Este email ya está registrado.");
            } else {
                setMessage("Cuenta creada exitosamente. Iniciando sesión...");
                setTimeout(() => {
                    navigate('/dashboard');
                }, 1500);
            }
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">
            {/* Background gradients */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
                            <BrainCircuit className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Únete a IAVolution</h1>
                        <p className="text-slate-400 text-sm mt-1">Crea tu cuenta de alumno</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm px-4 py-3 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="bg-green-500/10 border border-green-500/50 text-green-400 text-sm px-4 py-3 rounded-lg mb-6">
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Nombre Completo</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                placeholder="Tu nombre"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                            <input
                                type="email"
                                required
                                className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                placeholder="Min 6 caracteres"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className="pt-2">
                            <label className="block text-sm font-medium text-slate-300 mb-3">¿Qué quieres hacer?</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole('student')}
                                    className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${role === 'student'
                                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-600/10'
                                            : 'bg-slate-950/50 border-slate-700 text-slate-500 hover:border-slate-600'
                                        }`}
                                >
                                    Quiero Aprender
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('teacher')}
                                    className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${role === 'teacher'
                                            ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-lg shadow-purple-600/10'
                                            : 'bg-slate-950/50 border-slate-700 text-slate-500 hover:border-slate-600'
                                        }`}
                                >
                                    Quiero Enseñar
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center mt-6 disabled:opacity-70"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Registrarse'}
                        </button>
                    </form>

                    <p className="text-slate-400 text-sm text-center mt-6">
                        ¿Ya tienes cuenta?{' '}
                        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                            Inicia sesión
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
