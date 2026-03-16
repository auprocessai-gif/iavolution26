import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    BarChart3,
    Users,
    Clock,
    GraduationCap,
    Download,
    Search,
    TrendingUp,
    ChevronDown,
    Calendar,
    Loader2,
    BrainCircuit,
    X,
    FileText,
    Target,
    Zap,
    History
} from 'lucide-react';
import { getGeminiResponse } from '../../lib/gemini';
import { useModal } from '../../contexts/ModalContext';

const Analytics = () => {
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [selectedEdition, setSelectedEdition] = useState('all');
    const [editions, setEditions] = useState([]);
    const [metrics, setMetrics] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [sessionHistory, setSessionHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [weeklyActivity, setWeeklyActivity] = useState([0, 0, 0, 0, 0, 0, 0]);
    const { showAlert } = useModal();

    const [globalSummary, setGlobalSummary] = useState('');
    const [isGeneratingGlobal, setIsGeneratingGlobal] = useState(false);
    const [studentSummary, setStudentSummary] = useState('');
    const [isGeneratingStudent, setIsGeneratingStudent] = useState(false);

    const [isScanning, setIsScanning] = useState(false);
    const [scanningProgress, setScanningProgress] = useState(0);
    const [scanResults, setScanResults] = useState(null);

    useEffect(() => {
        const fetchInitial = async () => {
            setLoading(true);
            try {
                const { data: cData } = await supabase.schema('iavolution').from('courses').select('id, title').eq('status', 'published');
                setCourses(cData || []);
                await fetchMetrics();
                await fetchWeeklyActivity();
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitial();
    }, []);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            let q = supabase.schema('iavolution').from('v_student_performance').select('*');
            if (selectedCourse !== 'all') q = q.eq('course_id', selectedCourse);
            if (selectedEdition !== 'all') q = q.eq('edition_id', selectedEdition);
            const { data } = await q;
            setMetrics(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCourse !== 'all') fetchEditions(selectedCourse);
        fetchMetrics();
    }, [selectedCourse, selectedEdition]);

    const fetchEditions = async (cid) => {
        const { data } = await supabase.schema('iavolution').from('course_editions').select('id, name').eq('course_id', cid);
        setEditions(data || []);
    };

    const fetchWeeklyActivity = async () => {
        const days7 = new Date();
        days7.setDate(days7.getDate() - 7);
        let q = supabase.schema('iavolution').from('user_sessions').select('start_time, total_minutes').gte('start_time', days7.toISOString());
        if (selectedCourse !== 'all') q = q.eq('course_id', selectedCourse);
        try {
            const { data } = await q;
            const sums = [0, 0, 0, 0, 0, 0, 0];
            data?.forEach(s => {
                const d = new Date(s.start_time).getDay();
                sums[d === 0 ? 6 : d - 1] += s.total_minutes || 0;
            });
            setWeeklyActivity(sums);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchHistory = async (stu) => {
        setLoadingHistory(true);
        setSelectedStudent(stu);
        setStudentSummary('');
        try {
            let q = supabase.schema('iavolution').from('user_sessions').select('start_time, last_ping, total_minutes').eq('user_id', stu.user_id).order('start_time', { ascending: false }).limit(20);
            if (selectedCourse !== 'all') q = q.eq('course_id', selectedCourse);
            const { data } = await q;
            setSessionHistory(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const genGlobal = async () => {
        if (!metrics.length) return;
        setIsGeneratingGlobal(true);
        try {
            const sys = "Eres un analista experto. Resume el rendimiento en 3-4 frases.";
            const ctx = `Alumnos: ${metrics.length}, Nota: ${stats.avgGrade}, Aprobados: ${stats.passingRate}%.`;
            const resp = await getGeminiResponse(ctx, sys);
            setGlobalSummary(resp);
        } catch (error) {
            showAlert('Error al generar resumen.', 'error');
        } finally {
            setIsGeneratingGlobal(false);
        }
    };

    const genStudent = async () => {
        if (!selectedStudent) return;
        setIsGeneratingStudent(true);
        try {
            const sys = "Eres un tutor IA. Analiza al alumno en 3 frases.";
            const ctx = `Nombre: ${selectedStudent.name}, Nota: ${selectedStudent.final_grade_10}, Progreso: ${selectedStudent.progress_percent}%.`;
            const resp = await getGeminiResponse(ctx, sys);
            setStudentSummary(resp);
        } catch (error) {
            showAlert('Error al generar informe.', 'error');
        } finally {
            setIsGeneratingStudent(false);
        }
    };

    const runSmartScan = async () => {
        if (!metrics.length || isScanning) return;
        setIsScanning(true);
        setScanningProgress(0);
        setScanResults(null);
        
        try {
            // Criteria: Progress < 20% OR Grade < 5 OR Inactive > 14 days
            const atRisk = metrics.filter(m => {
                const progressNum = parseInt(m.progress_percent) || 0;
                const gradeNum = parseFloat(m.final_grade_10) || 0;
                const lowProgress = progressNum < 20;
                const lowGrade = gradeNum < 5;
                const inactiveDays = m.last_seen ? (new Date() - new Date(m.last_seen)) / (1000 * 60 * 60 * 24) : 999;
                return lowProgress || lowGrade || inactiveDays > 14;
            });

            if (atRisk.length === 0) {
                setScanResults({ total: 0, sent: 0, message: 'No se han detectado alumnos en riesgo en este momento.' });
                return;
            }

            let sentCount = 0;
            for (let i = 0; i < atRisk.length; i++) {
                const student = atRisk[i];
                setScanningProgress(Math.round(((i + 1) / atRisk.length) * 100));

                const sys = `Eres un asistente educativo de IAVolution. Tu objetivo es enviar una notificación privada y motivadora a un alumno que está teniendo dificultades. 
                Sé empático, profesional y breve (máximo 150 caracteres para que quepa en una notificación). 
                Usa el nombre del alumno. Si tiene nota baja, menciónalo suavemente. Si tiene poca actividad, anímale a volver.`;
                
                const ctx = `Alumno: ${student.name}. Nota media: ${student.final_grade_10}. Progreso: ${student.progress_percent}%. Último acceso: ${student.last_seen || 'Nunca'}.`;
                
                const aiMessage = await getGeminiResponse(ctx, sys);

                // Insert into notifications
                const { error } = await supabase.schema('iavolution').from('notifications').insert({
                    user_id: student.user_id,
                    type: 'ai_suggestion',
                    title: '💡 Sugerencia de tu Tutor IA',
                    message: aiMessage,
                    link: `/dashboard/player/${student.course_id}`
                });

                if (!error) sentCount++;
            }

            setScanResults({ total: atRisk.length, sent: sentCount, message: `Escaneo completado. Se han enviado ${sentCount} notificaciones personalizadas.` });
            showAlert(`Se han enviado ${sentCount} notificaciones a alumnos en riesgo.`, 'success');

        } catch (err) {
            console.error('Scan error:', err);
            showAlert('Error durante el escaneo inteligente.', 'error');
        } finally {
            setIsScanning(false);
        }
    };

    const filtered = useMemo(() => metrics.filter(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || m.email?.toLowerCase().includes(searchTerm.toLowerCase())), [metrics, searchTerm]);

    const stats = useMemo(() => {
        if (!metrics.length) return { avgGrade: 0, totalTime: 0, passingRate: 0, activeStudents: 0 };
        const tg = metrics.reduce((a, b) => a + (b.final_grade_10 || 0), 0);
        const tm = metrics.reduce((a, b) => a + (b.total_minutes_spent || 0), 0);
        return {
            avgGrade: (tg / metrics.length).toFixed(1),
            totalTime: Math.round(tm / 60),
            activeStudents: metrics.length,
            passingRate: Math.round((metrics.filter(m => (m.final_grade_10 || 0) >= 5).length / metrics.length) * 100)
        };
    }, [metrics]);

    const gradeDist = useMemo(() => {
        const bins = [0, 0, 0, 0, 0];
        metrics.forEach(m => {
            const g = m.final_grade_10 || 0;
            if (g < 5) bins[0]++;
            else if (g < 7) bins[1]++;
            else if (g < 8) bins[2]++;
            else if (g < 9) bins[3]++;
            else bins[4]++;
        });
        const max = Math.max(...bins, 1);
        return bins.map(c => ({ count: c, h: (c / max) * 100 }));
    }, [metrics]);

    const exportCSV = () => {
        const h = "Nombre,Email,Progreso,Tareas,Quizzes,Proyecto,Nota,Tiempo\n";
        const r = filtered.map(m => `${m.name},${m.email},${m.progress_percent}%,${m.avg_task_100}%,${m.avg_quiz_10}/10,${m.project_grade}/10,${m.final_grade_10},${m.total_minutes_spent}`).join("\n");
        const blob = new Blob([h + r], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'alumnos.csv';
        a.click();
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Analíticas de Curso</h2>
                    <p className="text-slate-400 mt-1">Visión global y detallada del rendimiento académico.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={runSmartScan} 
                        disabled={isScanning || !metrics.length} 
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                    >
                        {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        {isScanning ? `Escaneando (${scanningProgress}%)` : 'Notificaciones Inteligentes'}
                    </button>
                    <button onClick={genGlobal} disabled={isGeneratingGlobal || !metrics.length} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20">
                        {isGeneratingGlobal ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                        ✨ Resumen IA
                    </button>
                    <button onClick={exportCSV} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                        <Download className="w-4 h-4" /> Exportar
                    </button>
                </div>
            </header>

            {/* Scan Results Info */}
            {scanResults && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-emerald-400" />
                            <p className="text-sm text-slate-300 font-medium">{scanResults.message}</p>
                        </div>
                        <button onClick={() => setScanResults(null)} className="text-slate-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* AI Summary */}
            {globalSummary && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-2xl relative animate-in slide-in-from-top duration-500">
                    <button onClick={() => setGlobalSummary('')} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <BrainCircuit className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2">Diagnóstico de Inteligencia Artificial</h3>
                            <p className="text-slate-200 text-sm italic leading-relaxed">"{globalSummary}"</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Statistics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Nota Media', val: stats.avgGrade, icon: GraduationCap, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'hover:border-indigo-500/30' },
                    { label: 'Tiempo Formación', val: `${stats.totalTime}h`, icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/30' },
                    { label: 'Alumnos Activos', val: stats.activeStudents, icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'hover:border-amber-500/30' },
                    { label: 'Tasa Aprobados', val: `${stats.passingRate}%`, icon: TrendingUp, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'hover:border-rose-500/30' }
                ].map((s, idx) => (
                    <div key={idx} className={`bg-slate-900 border border-slate-800 p-6 rounded-2xl group transition-all ${s.border}`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 ${s.bg} rounded-xl border border-white/5`}>
                                <s.icon className={`w-6 h-6 ${s.color}`} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
                                <h3 className="text-2xl font-black text-white">{s.val}</h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950">
                    <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-400" /> Distribución de Notas</h3>
                    <div className="flex items-end h-48 gap-4 px-4 border-b border-slate-800/50 pb-2 relative">
                        {gradeDist.map((bin, i) => (
                            <div key={i} className="flex-1 group relative h-full flex items-end">
                                <div 
                                    className={`w-full rounded-t-lg transition-all duration-700 ${
                                        i === 0 ? 'bg-rose-500/40 hover:bg-rose-500' : 
                                        i === 1 ? 'bg-indigo-500/40 hover:bg-indigo-500' :
                                        i === 2 ? 'bg-emerald-500/40 hover:bg-emerald-500' :
                                        'bg-amber-500/40 hover:bg-amber-500'
                                    }`} 
                                    style={{ height: `${Math.max(bin.h, 2)}%`, minHeight: '4px' }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 whitespace-nowrap border border-white/10 shadow-xl">{bin.count} alumnos</div>
                                </div>
                                <div className="absolute -bottom-8 left-0 w-full text-[10px] text-slate-500 font-bold text-center">{['<5', '5-7', '7-8', '8-9', '9-10'][i]}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950">
                    <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-2"><Clock className="w-5 h-5 text-emerald-400" /> Actividad Semanal (min)</h3>
                    <div className="flex items-end h-48 gap-3 px-2 border-b border-slate-800/50 pb-2 relative">
                        {weeklyActivity.map((mins, i) => {
                            const maxW = Math.max(...weeklyActivity, 60);
                            const h = (mins / maxW) * 100;
                            return (
                                <div key={i} className="flex-1 group relative h-full flex items-end">
                                    <div 
                                        className="w-full bg-emerald-500/30 hover:bg-emerald-500 rounded-t-lg transition-all duration-500" 
                                        style={{ height: `${Math.max(h, 2)}%`, minHeight: '4px' }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 border border-white/10 shadow-xl">{mins}m</div>
                                    </div>
                                    <div className="absolute -bottom-8 left-0 w-full text-[10px] text-slate-500 font-bold text-center">{['L', 'M', 'X', 'J', 'V', 'S', 'D'][i]}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 mt-12 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm">
                <div className="relative">
                    <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white appearance-none text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none">
                        <option value="all">Todos los Cursos</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
                <div className="relative">
                    <select value={selectedEdition} onChange={e => setSelectedEdition(e.target.value)} disabled={selectedCourse === 'all'} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white appearance-none text-sm disabled:opacity-50 focus:ring-2 focus:ring-indigo-500/50 outline-none">
                        <option value="all">Todas las Ediciones</option>
                        {editions.map(ed => <option key={ed.id} value={ed.id}>{ed.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" placeholder="Buscar alumnos por nombre o email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none" />
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-950/40 border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-5">Nombre / Email</th>
                                <th className="px-6 py-5 text-center">Progreso</th>
                                <th className="px-6 py-5 text-center">Tareas</th>
                                <th className="px-6 py-5 text-center">Quizzes</th>
                                <th className="px-6 py-5 text-center">Proyecto</th>
                                <th className="px-6 py-5 text-center">Tiempo</th>
                                <th className="px-6 py-5 text-center">Últ. Acceso</th>
                                <th className="px-6 py-5 text-center">Nota Final</th>
                                <th className="px-6 py-5 text-center">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr><td colSpan="8" className="py-20 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" /> Cargando datos...</td></tr>
                            ) : filtered.length > 0 ? filtered.map(m => (
                                <tr key={m.user_id} className="hover:bg-indigo-500/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">{m.name}</div>
                                        <div className="text-xs text-slate-500">{m.email}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-xs font-black text-indigo-400">{m.progress_percent}%</span>
                                            <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500" style={{ width: `${m.progress_percent}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs font-bold text-slate-300">{m.avg_task_100 || 0}%</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs font-bold text-slate-300">{m.avg_quiz_10 || 0}/10</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-xs font-bold ${m.project_status === 'graded' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                            {m.project_grade || 0}/10
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs font-bold text-slate-400">
                                            {m.total_minutes_spent > 60 
                                                ? `${Math.floor(m.total_minutes_spent/60)}h ${m.total_minutes_spent%60}m` 
                                                : `${m.total_minutes_spent || 0}m`}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-[10px] font-bold text-slate-500">
                                            {m.last_seen ? new Date(m.last_seen).toLocaleDateString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-xs font-black px-2.5 py-1.5 rounded-lg border ${parseFloat(m.final_grade_10) >= 5 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                            {m.final_grade_10 || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => fetchHistory(m)} className="p-2.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all">
                                            <Calendar className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="8" className="py-20 text-center text-slate-500 italic">No se han encontrado alumnos.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sidebar Modal for Student Details */}
            {selectedStudent && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setSelectedStudent(null)}></div>
                    <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-indigo-950/20">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 text-2xl font-black">
                                        {selectedStudent.name?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white">{selectedStudent.name}</h3>
                                        <p className="text-slate-400 text-sm">{selectedStudent.email}</p>
                                        <div className="flex gap-2 mt-4">
                                            <button onClick={genStudent} disabled={isGeneratingStudent} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20">
                                                {isGeneratingStudent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />} 
                                                IA Informe
                                            </button>
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${parseFloat(selectedStudent.final_grade_10) >= 5 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                                {parseFloat(selectedStudent.final_grade_10) >= 5 ? 'Aprobado' : 'Suspenso'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedStudent(null)} className="p-2.5 bg-slate-800 text-slate-500 rounded-xl hover:text-white transition-all shadow-lg border border-white/5">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 overflow-y-auto space-y-8">
                            {studentSummary && (
                                <div className="bg-indigo-500/5 p-6 rounded-2xl border border-indigo-500/10 relative animate-in slide-in-from-top duration-500">
                                    <div className="flex items-center gap-2 mb-3">
                                        <BrainCircuit className="w-4 h-4 text-indigo-400" />
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Informe Pedagógico IA</span>
                                    </div>
                                    <p className="text-slate-200 text-sm italic leading-relaxed">"{studentSummary}"</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Tareas</p>
                                    <div className="flex items-end gap-2 text-indigo-400">
                                        <FileText className="w-5 h-5 mb-1" />
                                        <span className="text-xl font-black">{selectedStudent.avg_task_100}%</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Quizzes</p>
                                    <div className="flex items-end gap-2 text-amber-400">
                                        <Target className="w-5 h-5 mb-1" />
                                        <span className="text-xl font-black">{selectedStudent.avg_quiz_10}/10</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Proyecto</p>
                                    <div className="flex items-end gap-2 text-emerald-400">
                                        <Zap className="w-5 h-5 mb-1" />
                                        <span className="text-xl font-black">{selectedStudent.project_grade}/10</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> Historial de Actividad
                                    </h4>
                                    <span className="text-[10px] text-slate-600 font-bold">{sessionHistory.length} registros</span>
                                </div>
                                
                                {loadingHistory ? (
                                    <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                                ) : sessionHistory.length > 0 ? (
                                    <div className="space-y-3">
                                        {sessionHistory.map((s, i) => (
                                            <div key={i} className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl flex justify-between items-center group hover:border-slate-700 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 bg-slate-900 rounded-xl group-hover:bg-indigo-500/10 transition-all border border-white/5">
                                                        <Calendar className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-200">{new Date(s.start_time).toLocaleDateString()}</p>
                                                        <p className="text-[10px] text-slate-500 font-medium">{new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-white">{s.total_minutes} min</p>
                                                    <p className="text-[10px] text-slate-600 uppercase font-black">Conexión</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-slate-600 italic border border-slate-800 border-dashed rounded-2xl">Sin actividad reciente.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analytics;
