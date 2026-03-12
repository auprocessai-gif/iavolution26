import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    BarChart3,
    Users,
    Clock,
    GraduationCap,
    Download,
    Filter,
    Search,
    TrendingUp,
    Activity,
    ChevronDown,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    FileSpreadsheet,
    FileJson,
    CalendarDays
} from 'lucide-react';

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
    const [weeklyActivity, setWeeklyActivity] = useState([0, 0, 0, 0, 0, 0, 0]); // Lun to Dom


    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const { data: coursesData } = await supabase
                .schema('iavolution')
                .from('courses')
                .select('id, title')
                .eq('status', 'published');
            setCourses(coursesData || []);

            fetchMetrics();
            fetchWeeklyActivity();
        } catch (err) {

            console.error('Error fetching initial data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            let query = supabase
                .schema('iavolution')
                .from('v_student_performance')
                .select('*');

            if (selectedCourse !== 'all') {
                query = query.eq('course_id', selectedCourse);
            }
            if (selectedEdition !== 'all') {
                query = query.eq('edition_id', selectedEdition);
            }

            const { data, error } = await query;
            if (error) throw error;
            setMetrics(data || []);
        } catch (err) {
            console.error('Error fetching metrics:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCourse !== 'all') {
            fetchEditions(selectedCourse);
        } else {
            setEditions([]);
            setSelectedEdition('all');
        }
        fetchMetrics();
    }, [selectedCourse, selectedEdition]);

    const fetchEditions = async (courseId) => {
        try {
            const { data } = await supabase
                .schema('iavolution')
                .from('course_editions')
                .select('id, name')
                .eq('course_id', courseId);
            setEditions(data || []);
        } catch (err) {
            console.error('Error fetching editions:', err);
        }
    };

    const fetchWeeklyActivity = async () => {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            let query = supabase
                .schema('iavolution')
                .from('user_sessions')
                .select('start_time, total_minutes')
                .gte('start_time', sevenDaysAgo.toISOString());

            if (selectedCourse !== 'all') {
                query = query.eq('course_id', selectedCourse);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Simple aggregation by day of week (mapping 0-6 to our Mon-Sun chart)
            // Backend JS getDay() returns 0 for Sunday, 1 for Monday, etc.
            // Our UI expects Lun (0), Mar (1), ..., Dom (6)
            const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
            data?.forEach(session => {
                const day = new Date(session.start_time).getDay();
                const uiIdx = day === 0 ? 6 : day - 1; // Convert Sun(0)->6, Mon(1)->0
                dailyTotals[uiIdx] += session.total_minutes || 0;
            });

            setWeeklyActivity(dailyTotals);
        } catch (err) {
            console.error('Error fetching weekly activity:', err);
        }
    };


    const fetchSessionHistory = async (student) => {
        setLoadingHistory(true);
        setSelectedStudent(student);
        try {
            let query = supabase
                .schema('iavolution')
                .from('user_sessions')
                .select('start_time, last_ping, total_minutes')
                .eq('user_id', student.user_id)
                .order('start_time', { ascending: false })
                .limit(20);

            if (selectedCourse !== 'all') {
                query = query.eq('course_id', selectedCourse);
            }

            const { data, error } = await query;
            if (error) throw error;
            setSessionHistory(data || []);
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };
    const filteredMetrics = useMemo(() => {
        return metrics.filter(m =>
            m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [metrics, searchTerm]);

    const gradeDistribution = useMemo(() => {
        const bins = [0, 0, 0, 0, 0, 0, 0]; // 0-2, 2-4, 4-5, 5-7, 7-8, 8-9, 9-10
        metrics.forEach(m => {
            const grade = m.final_grade_10;
            if (grade < 2) bins[0]++;
            else if (grade < 4) bins[1]++;
            else if (grade < 5) bins[2]++;
            else if (grade < 7) bins[3]++;
            else if (grade < 8) bins[4]++;
            else if (grade < 9) bins[5]++;
            else bins[6]++;
        });
        
        // Find max for scaling
        const max = Math.max(...bins, 1);
        return bins.map(count => ({
            count,
            height: (count / max) * 100
        }));
    }, [metrics]);


    const stats = useMemo(() => {
        if (metrics.length === 0) return { avgGrade: 0, totalTime: 0, completion: 0, activeStudents: 0 };

        const totalGrade = metrics.reduce((acc, curr) => acc + curr.final_grade_10, 0);
        const totalMinutes = metrics.reduce((acc, curr) => acc + curr.total_minutes_spent, 0);

        return {
            avgGrade: (totalGrade / metrics.length).toFixed(1),
            totalTime: Math.round(totalMinutes / 60),
            activeStudents: metrics.length,
            passingRate: Math.round((metrics.filter(m => m.final_grade_10 >= 5).length / metrics.length) * 100)
        };
    }, [metrics]);

    const exportToCSV = () => {
        const headers = ["Nombre", "Email", "Media Tareas (100)", "Media Cuestionarios (10)", "Nota Final (10)", "Tiempo Total (min)", "Estado"];
        const rows = filteredMetrics.map(m => [
            m.name,
            m.email,
            m.avg_task_100,
            m.avg_quiz_10,
            m.final_grade_10,
            m.total_minutes_spent,
            m.final_grade_10 >= 5 ? 'APTO' : 'NO APTO'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `metricas_alumnos_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Analíticas Avanzadas</h1>
                    <p className="text-slate-400 mt-1 text-sm">Monitoriza el rendimiento y actividad de tus alumnos en tiempo real.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all border border-slate-700 text-sm font-medium"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        Exportar CSV
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/20 text-sm font-bold">
                        <CalendarDays className="w-4 h-4" />
                        Reporte Mensual
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-2 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="p-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Curso</label>
                    <div className="relative">
                        <select
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                        >
                            <option value="all">Todos los Cursos</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                </div>
                <div className="p-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Edición / Grupo</label>
                    <div className="relative">
                        <select
                            value={selectedEdition}
                            onChange={(e) => setSelectedEdition(e.target.value)}
                            disabled={selectedCourse === 'all'}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm disabled:opacity-50"
                        >
                            <option value="all">Todas las Ediciones</option>
                            {editions.map(ed => (
                                <option key={ed.id} value={ed.id}>{ed.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                </div>
                <div className="p-3 space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Buscar Alumno</label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full -mr-8 -mt-8 group-hover:bg-indigo-500/10 transition-colors" />
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                            <GraduationCap className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Nota Media</p>
                            <div className="flex items-end gap-2">
                                <h3 className="text-2xl font-bold text-white">{stats.avgGrade}</h3>
                                <span className="text-[10px] text-emerald-400 font-bold flex items-center mb-1">
                                    <ArrowUpRight className="w-3 h-3" /> +0.4
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-8 -mt-8 group-hover:bg-emerald-500/10 transition-colors" />
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                            <Clock className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Tiempo Formación</p>
                            <div className="flex items-end gap-2">
                                <h3 className="text-2xl font-bold text-white">{stats.totalTime}h</h3>
                                <span className="text-[10px] text-emerald-400 font-bold flex items-center mb-1">
                                    <ArrowUpRight className="w-3 h-3" /> +12%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full -mr-8 -mt-8 group-hover:bg-amber-500/10 transition-colors" />
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <Users className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Alumnos Activos</p>
                            <div className="flex items-end gap-2">
                                <h3 className="text-2xl font-bold text-white">{stats.activeStudents}</h3>
                                <span className="text-[10px] text-slate-500 font-bold mb-1">Total</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full -mr-8 -mt-8 group-hover:bg-rose-500/10 transition-colors" />
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                            <TrendingUp className="w-6 h-6 text-rose-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Tasa Aprobados</p>
                            <div className="flex items-end gap-2">
                                <h3 className="text-2xl font-bold text-white">{stats.passingRate}%</h3>
                                <span className="text-[10px] text-rose-400 font-bold flex items-center mb-1">
                                    <ArrowDownRight className="w-3 h-3" /> -2%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Visual Charts Component (Simplified Premium Look) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-indigo-400" /> Distribución de Notas
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Comparativa de rendimiento académico.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-indigo-500 rounded-sm"></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Aptos</span>
                        </div>
                    </div>
                    {/* Simplified CSS Chart bars */}
                    <div className="flex items-end justify-between h-48 gap-4 px-4 border-b border-slate-800 pb-2 relative">
                        {(!loading && metrics.length === 0) && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs italic bg-slate-900/50 backdrop-blur-[1px] z-20">
                                No hay datos de rendimiento para mostrar.
                            </div>
                        )}
                        {gradeDistribution.map((bin, i) => (
                            <div key={i} className="flex-1 group relative">
                                <div
                                    className={`w-full rounded-t-lg transition-all duration-1000 ${i >= 3 ? 'bg-indigo-500/40 hover:bg-indigo-500' : 'bg-rose-500/40 hover:bg-rose-500'}`}
                                    style={{ height: `${bin.height}%` }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        {bin.count} alumnos
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-600 font-bold text-center mt-2">
                                    {['0-2', '2-4', '4-5', '5-7', '7-8', '8-9', '9-10'][i]}
                                </div>
                            </div>
                        ))}
                    </div>


                </div>

                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-400" /> Evolución de Actividad
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Tiempo de conexión semanal.</p>
                        </div>
                    </div>
                    {/* Simplified Line Chart visualization using SVG */}
                    <div className="h-48 relative">
                        {(!loading && weeklyActivity.every(a => a === 0)) && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs italic bg-slate-900/50 backdrop-blur-[1px] z-20">
                                No hay registros de actividad esta semana.
                            </div>
                        )}
                        {(() => {
                            const maxMinutes = Math.max(...weeklyActivity, 60);
                            const points = weeklyActivity.map((mins, i) => {
                                const x = (i / 6) * 400;
                                const y = 100 - (mins / maxMinutes) * 80; // 80 because we want some padding at top
                                return { x, y, mins };
                            });

                            const d = points.reduce((acc, p, i) => 
                                i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, 
                            '');
                            
                            const areaD = `${d} L 400 100 L 0 100 Z`;

                            return (
                                <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path d={areaD} fill="url(#gradient)" className="transition-all duration-1000" />
                                    <path d={d} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" className="transition-all duration-1000" />
                                    {points.map((p, i) => (
                                        <g key={i} className="group/dot">
                                            <circle cx={p.x} cy={p.y} r="4" fill="#10b981" className="opacity-0 group-hover/dot:opacity-100 transition-opacity" />
                                            <foreignObject x={p.x - 25} y={p.y - 30} width="50" height="25" className="opacity-0 group-hover/dot:opacity-100 transition-opacity">
                                                <div className="bg-slate-800 text-white text-[8px] font-bold rounded px-1 py-0.5 text-center shadow-lg">
                                                    {p.mins}m
                                                </div>
                                            </foreignObject>
                                        </g>
                                    ))}
                                </svg>
                            );
                        })()}


                        <div className="flex justify-between mt-4">
                            {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(day => (
                                <span key={day} className="text-[10px] text-slate-600 font-bold uppercase">{day}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-white">Detalle de Alumnos</h3>
                    <div className="text-xs text-slate-500 font-medium">
                        Mostrando {filteredMetrics.length} resultados
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center text-slate-500 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                            <p className="font-medium">Calculando métricas académicas...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-slate-800">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alumno</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Progreso Global</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Tareas (100)</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Cuestionarios (10)</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Nota Final (10)</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Tiempo Total</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredMetrics.map((m) => (
                                    <tr key={m.user_id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-sm border border-slate-700 shadow-inner group-hover:border-indigo-500/30 transition-colors">
                                                    {m.name?.[0]?.toUpperCase() || 'A'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{m.name}</p>
                                                    <p className="text-xs text-slate-500 truncate max-w-[150px]">{m.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-sm font-bold text-indigo-400">{m.progress_percent || 0}%</span>
                                                <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 transition-all duration-500"
                                                        style={{ width: `${m.progress_percent || 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-medium text-slate-300">{m.avg_task_100}%</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-medium text-slate-300">{m.avg_quiz_10}/10</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <span className={`text-sm font-bold ${m.final_grade_10 >= 5 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {m.final_grade_10}
                                                </span>
                                                <div className="w-12 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className={`h-full ${m.final_grade_10 >= 5 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                        style={{ width: `${m.final_grade_10 * 10}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-medium text-slate-400 flex items-center justify-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {Math.floor((m.total_minutes_spent || 0) / 60)}h {(m.total_minutes_spent || 0) % 60}m
                                                </span>
                                                {m.total_platform_minutes > m.total_minutes_spent && (
                                                    <span className="text-[9px] text-slate-600">
                                                        Total plataforma: {Math.floor(m.total_platform_minutes / 60)}h {m.total_platform_minutes % 60}m
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-slate-600 font-medium mt-1">
                                                    {m.last_seen ? 'Visto: ' + new Date(m.last_seen).toLocaleDateString() : 'Nunca'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => fetchSessionHistory(m)}
                                                className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                                            >
                                                <Calendar className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredMetrics.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-500 italic text-sm">
                                            No se han encontrado alumnos que coincidan con los filtros.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Session History Sidebar/Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-end animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedStudent(null)} />
                    <div className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">
                                    {selectedStudent.name?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{selectedStudent.name}</h3>
                                    <p className="text-xs text-slate-500">Historial de Sesiones (Últimas 20)</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                <ChevronDown className="w-6 h-6 rotate-90 md:rotate-0" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {loadingHistory ? (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                                    <p className="text-sm">Cargando actividad...</p>
                                </div>
                            ) : sessionHistory.length > 0 ? (
                                sessionHistory.map((session, i) => (
                                    <div key={i} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-indigo-400">
                                                <Calendar className="w-4 h-4" />
                                                <span className="text-sm font-bold">
                                                    {new Date(session.start_time).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                <Clock className="w-3 h-3" />
                                                <span className="text-[10px] font-bold">{session.total_minutes} min</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                                            <div className="flex flex-col">
                                                <span className="uppercase font-bold text-[9px] text-slate-600">Entrada</span>
                                                <span className="text-slate-300">{new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className="text-center">
                                                <div className="w-8 h-[1px] bg-slate-800 relative">
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-slate-700 rounded-full" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="uppercase font-bold text-[9px] text-slate-600">Última Actividad</span>
                                                <span className="text-slate-300">{new Date(session.last_ping).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-10 text-center text-slate-600 italic border-2 border-dashed border-slate-800 rounded-2xl">
                                    No hay registros de actividad para este curso.
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-slate-950/50">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Total Acumulado:</span>
                                <span className="text-white font-bold">{selectedStudent.total_minutes_spent} minutos</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analytics;
