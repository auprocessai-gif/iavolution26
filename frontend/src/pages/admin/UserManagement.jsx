import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { supabaseAdmin } from '../../lib/supabase';
import { useModal } from '../../contexts/ModalContext';
import {
    Users,
    UserPlus,
    Mail,
    Shield,
    Search,
    Filter,
    Loader2,
    MoreVertical,
    CheckCircle2,
    BookPlus,
    X,
    Upload,
    Calendar,
    AlertCircle,
    Lock,
    Unlock,
    User,
    Trash2,
    Power,
    Ban
} from 'lucide-react';

const UserManagement = () => {
    const { showAlert, showConfirm } = useModal();
    const [profiles, setProfiles] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Enrollment Modal State
    const [enrollingUser, setEnrollingUser] = useState(null);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedEditionId, setSelectedEditionId] = useState('');
    const [courseEditions, setCourseEditions] = useState([]);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [loadingEditions, setLoadingEditions] = useState(false);

    // CSV Upload Modal State
    const [showCSVModal, setShowCSVModal] = useState(false);
    const [csvCourseId, setCsvCourseId] = useState('');
    const [csvEditionId, setCsvEditionId] = useState('');
    const [csvEditions, setCsvEditions] = useState([]);
    const [csvFile, setCsvFile] = useState(null);
    const [csvResults, setCsvResults] = useState(null);
    const [isProcessingCSV, setIsProcessingCSV] = useState(false);
    const [loadingCsvEditions, setLoadingCsvEditions] = useState(false);

    // Create User Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'student' });
    const [createCourseId, setCreateCourseId] = useState('');
    const [createEditionId, setCreateEditionId] = useState('');
    const [createEditions, setCreateEditions] = useState([]);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [loadingCreateEditions, setLoadingCreateEditions] = useState(false);
    const [createError, setCreateError] = useState('');

    useEffect(() => {
        fetchProfiles();
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const { data, error } = await supabase
                .schema('iavolution')
                .from('courses')
                .select('id, title')
                .eq('status', 'published');
            if (error) throw error;
            setCourses(data || []);
        } catch (err) { console.error(err); }
    };

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .schema('iavolution')
                .from('profiles')
                .select(`
                    *,
                    roles (
                        name,
                        description
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProfiles(data || []);
        } catch (err) {
            console.error('Error fetching profiles:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch editions when a course is selected (enrollment modal)
    const handleCourseChange = async (courseId) => {
        setSelectedCourseId(courseId);
        setSelectedEditionId('');
        setCourseEditions([]);

        if (!courseId) return;
        setLoadingEditions(true);
        try {
            const { data, error } = await supabase
                .schema('iavolution')
                .from('course_editions')
                .select('*')
                .eq('course_id', courseId)
                .eq('status', 'active')
                .order('start_date', { ascending: true });
            if (error) throw error;
            setCourseEditions(data || []);
        } catch (err) { console.error(err); }
        finally { setLoadingEditions(false); }
    };

    // Fetch editions when a course is selected (CSV modal)
    const handleCsvCourseChange = async (courseId) => {
        setCsvCourseId(courseId);
        setCsvEditionId('');
        setCsvEditions([]);

        if (!courseId) return;
        setLoadingCsvEditions(true);
        try {
            const { data, error } = await supabase
                .schema('iavolution')
                .from('course_editions')
                .select('*')
                .eq('course_id', courseId)
                .eq('status', 'active')
                .order('start_date', { ascending: true });
            if (error) throw error;
            setCsvEditions(data || []);
        } catch (err) { console.error(err); }
        finally { setLoadingCsvEditions(false); }
    };

    const handleEnroll = async () => {
        if (!selectedCourseId || !enrollingUser) return;
        setIsEnrolling(true);
        try {
            const insertData = {
                user_id: enrollingUser.id,
                course_id: selectedCourseId
            };
            if (selectedEditionId) insertData.edition_id = selectedEditionId;

            const { error } = await supabase
                .schema('iavolution')
                .from('enrollments')
                .insert([insertData]);

            if (error) {
                if (error.code === '23505') await showAlert('Este alumno ya está matriculado en esta edición.', 'warning');
                else throw error;
            } else {
                await showAlert('Alumno matriculado con éxito.', 'success');
                setEnrollingUser(null);
                setSelectedCourseId('');
                setSelectedEditionId('');
                setCourseEditions([]);
            }
        } catch (err) {
            console.error(err);
            await showAlert('Error al matricular al alumno.', 'error');
        } finally {
            setIsEnrolling(false);
        }
    };

    // CSV Processing
    const handleCSVUpload = async () => {
        if (!csvFile || !csvCourseId) return;

        setIsProcessingCSV(true);
        setCsvResults(null);

        try {
            const text = await csvFile.text();
            const lines = text.split(/\r?\n/).filter(l => l.trim());

            // Skip header if present
            const hasHeader = lines[0]?.toLowerCase().includes('email') || lines[0]?.toLowerCase().includes('nombre');
            const dataLines = hasHeader ? lines.slice(1) : lines;

            let success = 0;
            let errors = [];
            let alreadyEnrolled = 0;

            for (const line of dataLines) {
                const parts = line.split(/[,;]/).map(s => s.trim().replace(/^["']|["']$/g, ''));
                const email = parts[0];

                if (!email || !email.includes('@')) {
                    errors.push(`Línea inválida: "${line}"`);
                    continue;
                }

                // Find user by email
                const { data: userProfile, error: fetchErr } = await supabase
                    .schema('iavolution')
                    .from('profiles')
                    .select('id')
                    .eq('email', email)
                    .maybeSingle();

                if (fetchErr) {
                    errors.push(`Error buscando ${email}: ${fetchErr.message}`);
                    continue;
                }

                if (!userProfile) {
                    errors.push(`Usuario no encontrado: ${email}`);
                    continue;
                }

                // Enroll the user
                const insertData = {
                    user_id: userProfile.id,
                    course_id: csvCourseId
                };
                if (csvEditionId) insertData.edition_id = csvEditionId;

                const { error: enrollErr } = await supabase
                    .schema('iavolution')
                    .from('enrollments')
                    .insert([insertData]);

                if (enrollErr) {
                    if (enrollErr.code === '23505') {
                        alreadyEnrolled++;
                    } else {
                        errors.push(`Error matriculando ${email}: ${enrollErr.message}`);
                    }
                } else {
                    success++;
                }
            }

            setCsvResults({ total: dataLines.length, success, alreadyEnrolled, errors });
        } catch (err) {
            console.error(err);
            await showAlert('Error procesando el archivo CSV.', 'error');
        } finally {
            setIsProcessingCSV(false);
        }
    };

    // Fetch editions for create student modal
    const handleCreateCourseChange = async (courseId) => {
        setCreateCourseId(courseId);
        setCreateEditionId('');
        setCreateEditions([]);
        if (!courseId) return;
        setLoadingCreateEditions(true);
        try {
            const { data, error } = await supabase
                .schema('iavolution')
                .from('course_editions')
                .select('*')
                .eq('course_id', courseId)
                .eq('status', 'active')
                .order('start_date', { ascending: true });
            if (error) throw error;
            setCreateEditions(data || []);
        } catch (err) { console.error(err); }
        finally { setLoadingCreateEditions(false); }
    };

    // Create user from scratch
    const handleCreateUser = async () => {
        const { name, email, password, role } = newUser;
        if (!name || !email || !password) return;
        if (password.length < 6) {
            setCreateError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setIsCreatingUser(true);
        setCreateError('');

        try {
            // 1. Sign up user via isolated client (won't affect admin session)
            const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
                email,
                password,
                options: {
                    data: { name, role: role || 'student' }
                }
            });

            if (signUpError) throw signUpError;
            if (!signUpData.user) throw new Error('No se pudo crear el usuario.');

            const newUserId = signUpData.user.id;

            // 2. Get the role_id for the selected role
            const { data: roleData, error: roleError } = await supabase
                .schema('iavolution')
                .from('roles')
                .select('id')
                .eq('name', role)
                .single();

            if (roleError) console.warn('Could not fetch role:', roleError);

            // 3. Upsert profile explicitly — garantiza que el perfil existe
            // aunque el trigger de DB tarde o falle silenciosamente.
            const { error: profileError } = await supabase
                .schema('iavolution')
                .from('profiles')
                .upsert({
                    id: newUserId,
                    email: email,
                    name: name,
                    role_id: roleData?.id || null,
                    status: 'active'
                }, { onConflict: 'id' });

            if (profileError) {
                console.error('Profile upsert error:', profileError);
                // No es fatal: el trigger puede haberlo creado ya, continuamos
            }

            // 3. Optionally enroll in course + edition
            if (createCourseId && role === 'student') {
                const enrollData = { user_id: newUserId, course_id: createCourseId };
                if (createEditionId) enrollData.edition_id = createEditionId;

                const { error: enrollErr } = await supabase
                    .schema('iavolution')
                    .from('enrollments')
                    .insert([enrollData]);

                if (enrollErr && enrollErr.code !== '23505') {
                    console.error('Enrollment error:', enrollErr);
                }
            }

            await showAlert(`Usuario "${name}" (${role}) creado con éxito.`, 'success');
            setShowCreateModal(false);
            setNewUser({ name: '', email: '', password: '', role: 'student' });
            setCreateCourseId('');
            setCreateEditionId('');
            setCreateEditions([]);
            
            // Wait for DB to settle and refresh
            setTimeout(() => {
                fetchProfiles();
            }, 500);
        } catch (err) {
            console.error(err);
            if (err.message?.includes('already registered')) {
                setCreateError('Este email ya está registrado en la plataforma.');
            } else {
                setCreateError(err.message || 'Error al crear el usuario.');
            }
        } finally {
            setIsCreatingUser(false);
        }
    };

    const handleToggleStatus = async (user) => {
        const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
        const confirmMsg = newStatus === 'blocked' ?
            `¿Estás seguro de que quieres BLOQUEAR el acceso a ${user.name || user.email}?` :
            `¿Quieres reactivar el acceso para ${user.name || user.email}?`;

        if (!await showConfirm(confirmMsg, newStatus === 'blocked' ? 'Bloquear Usuario' : 'Activar Usuario')) return;

        try {
            const { error } = await supabase
                .schema('iavolution')
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', user.id);

            if (error) throw error;
            await showAlert(`Usuario ${newStatus === 'blocked' ? 'bloqueado' : 'activado'} con éxito.`, 'success');
            fetchProfiles();
        } catch (err) {
            console.error(err);
            await showAlert('Error al cambiar el estado del usuario.', 'error');
        }
    };

    const handleDeleteUser = async (user) => {
        if (!await showConfirm(`¿ESTÁS SEGURO? Esta acción eliminará COMPLETAMENTE a ${user.name || user.email} de la plataforma (perfil, matrículas y cuenta de acceso). Esta acción NO se puede deshacer.`, 'Eliminar Usuario')) return;

        try {
            const { error } = await supabase
                .schema('iavolution')
                .rpc('delete_user_completely', { target_user_id: user.id });

            if (error) throw error;
            await showAlert('Usuario eliminado completamente de la plataforma.', 'success');
            fetchProfiles();
        } catch (err) {
            console.error(err);
            await showAlert('Error al eliminar el usuario: ' + (err.message || 'Inténtalo de nuevo'), 'error');
        }
    };

    const filteredProfiles = profiles.filter(p => {
        const name = (p.name || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        
        const matchesSearch = name.includes(search) || email.includes(search);
        const matchesRole = roleFilter === 'all' || p.roles?.name === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Gestión de Usuarios</h1>
                    <p className="text-slate-400 mt-2">Administra alumnos, profesores y sus accesos a la plataforma.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setShowCreateModal(true); setCreateError(''); setNewUser({ name: '', email: '', password: '', role: 'student' }); setCreateCourseId(''); setCreateEditionId(''); setCreateEditions([]); }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                    >
                        <UserPlus className="w-4 h-4" /> Registrar Usuario
                    </button>
                    <button
                        onClick={() => { setShowCSVModal(true); setCsvResults(null); setCsvFile(null); setCsvCourseId(''); setCsvEditionId(''); setCsvEditions([]); }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                    >
                        <Upload className="w-4 h-4" /> Matrícula Masiva (CSV)
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Todos los Roles</option>
                        <option value="student">Alumnos</option>
                        <option value="teacher">Profesores</option>
                        <option value="manager">Gestores</option>
                        <option value="admin">Administradores</option>
                    </select>
                </div>
                <div className="flex items-center justify-end text-sm text-slate-500">
                    Mostrando {filteredProfiles.length} usuarios
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        <p className="text-slate-500 text-sm">Cargando usuarios...</p>
                    </div>
                ) : filteredProfiles.length === 0 ? (
                    <div className="text-center py-20">
                        <Users className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                        <p className="text-slate-400">No se encontraron usuarios que coincidan con la búsqueda.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950/50">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">Usuario</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">Rol</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">Estado</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">Registro</th>
                                    <th className="px-6 py-4 border-b border-slate-800"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredProfiles.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {p.name?.charAt(0) || p.email?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-white">{p.name || 'Sin nombre'}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Mail className="w-3 h-3" /> {p.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-950 border border-slate-800">
                                                <Shield className={`w-3 h-3 ${p.roles?.name === 'admin' ? 'text-rose-400' : p.roles?.name === 'teacher' ? 'text-amber-400' : 'text-blue-400'}`} />
                                                <span className="capitalize text-slate-300">
                                                    {p.roles?.name === 'student' ? 'Alumno' :
                                                        p.roles?.name === 'teacher' ? 'Profesor' :
                                                            p.roles?.name === 'manager' ? 'Gestor' : 'Admin'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {p.status === 'blocked' ? (
                                                <span className="flex items-center gap-1.5 text-xs text-rose-400 font-bold bg-rose-500/10 px-2 py-1 rounded-full border border-rose-500/20">
                                                    <Ban className="w-3 h-3" /> Bloqueado
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                                                    <CheckCircle2 className="w-3 h-3" /> Activo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(p.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {p.roles?.name === 'student' && p.status !== 'blocked' && (
                                                <button
                                                    onClick={() => setEnrollingUser(p)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all"
                                                    title="Matricular"
                                                >
                                                    <BookPlus className="w-3.5 h-3.5" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleToggleStatus(p)}
                                                className={`p-1.5 rounded-lg transition-all ${p.status === 'blocked'
                                                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                                    : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white'}`}
                                                title={p.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                                            >
                                                {p.status === 'blocked' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                            </button>

                                            <button
                                                onClick={() => handleDeleteUser(p)}
                                                className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Enrollment Modal (Single User) */}
            {enrollingUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <BookPlus className="w-5 h-5 text-indigo-400" /> Matricular Alumno
                            </h3>
                            <button onClick={() => { setEnrollingUser(null); setSelectedCourseId(''); setSelectedEditionId(''); setCourseEditions([]); }} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Alumno</p>
                                <p className="text-white font-medium">{enrollingUser.name || enrollingUser.email}</p>
                                <p className="text-xs text-slate-500">{enrollingUser.email}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Selecciona el curso</label>
                                <select
                                    value={selectedCourseId}
                                    onChange={(e) => handleCourseChange(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                >
                                    <option value="">-- Elige un curso --</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Edition selector */}
                            {selectedCourseId && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Edición (Grupo)</label>
                                    {loadingEditions ? (
                                        <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Cargando ediciones...
                                        </div>
                                    ) : courseEditions.length === 0 ? (
                                        <p className="text-xs text-slate-500 py-2 italic">No hay ediciones activas. Se matriculará sin edición.</p>
                                    ) : (
                                        <select
                                            value={selectedEditionId}
                                            onChange={(e) => setSelectedEditionId(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                        >
                                            <option value="">-- Sin edición específica --</option>
                                            {courseEditions.map(ed => (
                                                <option key={ed.id} value={ed.id}>
                                                    {ed.name} {ed.start_date ? `(${new Date(ed.start_date).toLocaleDateString()})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex gap-3">
                            <button
                                onClick={() => { setEnrollingUser(null); setSelectedCourseId(''); setSelectedEditionId(''); setCourseEditions([]); }}
                                className="flex-1 px-4 py-2.5 rounded-lg font-bold text-slate-400 hover:bg-slate-800 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEnroll}
                                disabled={!selectedCourseId || isEnrolling}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isEnrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Matrícula'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSV Bulk Enrollment Modal */}
            {showCSVModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Upload className="w-5 h-5 text-emerald-400" /> Matrícula Masiva por CSV
                            </h3>
                            <button onClick={() => setShowCSVModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Instructions */}
                            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-sm text-slate-400 space-y-2">
                                <p className="font-bold text-slate-300">Formato del CSV:</p>
                                <p>Una línea por alumno con el email (obligatorio) y nombre (opcional), separados por coma o punto y coma.</p>
                                <code className="block bg-slate-900 text-emerald-400 p-2 rounded text-xs">
                                    email,nombre<br />
                                    alumno1@email.com,Juan Pérez<br />
                                    alumno2@email.com,María García
                                </code>
                                <p className="text-xs text-amber-400 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Los usuarios deben existir previamente en la plataforma.
                                </p>
                            </div>

                            {/* Course selector */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Curso destino</label>
                                <select
                                    value={csvCourseId}
                                    onChange={(e) => handleCsvCourseChange(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                                >
                                    <option value="">-- Elige un curso --</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Edition selector */}
                            {csvCourseId && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Edición (Grupo)</label>
                                    {loadingCsvEditions ? (
                                        <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
                                        </div>
                                    ) : csvEditions.length === 0 ? (
                                        <p className="text-xs text-slate-500 py-2 italic">No hay ediciones activas.</p>
                                    ) : (
                                        <select
                                            value={csvEditionId}
                                            onChange={(e) => setCsvEditionId(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                                        >
                                            <option value="">-- Sin edición específica --</option>
                                            {csvEditions.map(ed => (
                                                <option key={ed.id} value={ed.id}>
                                                    {ed.name} {ed.start_date ? `(${new Date(ed.start_date).toLocaleDateString()})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* File input */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Archivo CSV</label>
                                <label className="flex items-center justify-center gap-2 w-full bg-slate-950 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-4 cursor-pointer transition-colors text-sm">
                                    <Upload className="w-5 h-5 text-slate-400" />
                                    <span className="text-slate-400">{csvFile ? csvFile.name : 'Seleccionar archivo .csv'}</span>
                                    <input
                                        type="file"
                                        accept=".csv,.txt"
                                        onChange={(e) => setCsvFile(e.target.files[0])}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            {/* Results */}
                            {csvResults && (
                                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                                    <p className="font-bold text-white text-sm">Resultados del procesamiento:</p>
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                                            <p className="text-2xl font-black text-emerald-400">{csvResults.success}</p>
                                            <p className="text-[10px] uppercase text-emerald-400/70 font-bold">Matriculados</p>
                                        </div>
                                        <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                                            <p className="text-2xl font-black text-amber-400">{csvResults.alreadyEnrolled}</p>
                                            <p className="text-[10px] uppercase text-amber-400/70 font-bold">Ya inscritos</p>
                                        </div>
                                        <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                                            <p className="text-2xl font-black text-red-400">{csvResults.errors.length}</p>
                                            <p className="text-[10px] uppercase text-red-400/70 font-bold">Errores</p>
                                        </div>
                                    </div>
                                    {csvResults.errors.length > 0 && (
                                        <div className="max-h-32 overflow-y-auto mt-2 text-xs text-red-400 space-y-1">
                                            {csvResults.errors.map((err, i) => (
                                                <p key={i}>• {err}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex gap-3">
                            <button
                                onClick={() => setShowCSVModal(false)}
                                className="flex-1 px-4 py-2.5 rounded-lg font-bold text-slate-400 hover:bg-slate-800 transition-all"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={handleCSVUpload}
                                disabled={!csvFile || !csvCourseId || isProcessingCSV}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isProcessingCSV ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                                ) : (
                                    'Procesar CSV'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Student Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-indigo-400" /> Registrar Nuevo Usuario
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {createError && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    {createError}
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nombre completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Juan Pérez"
                                        value={newUser.name}
                                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Rol del usuario</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <select
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                                    >
                                        <option value="student">Alumno</option>
                                        <option value="teacher">Profesor</option>
                                        <option value="manager">Gestor</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="email"
                                        placeholder="usuario@email.com"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Mínimo 6 caracteres"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-600 mt-1">La contraseña se muestra para que puedas comunicarla al usuario.</p>
                            </div>

                            {newUser.role === 'student' && (
                                <div className="border-t border-slate-800 pt-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Matricular en curso (opcional)</label>
                                    <select
                                        value={createCourseId}
                                        onChange={(e) => handleCreateCourseChange(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                    >
                                        <option value="">-- No matricular ahora --</option>
                                        {courses.map(c => (
                                            <option key={c.id} value={c.id}>{c.title}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {newUser.role === 'student' && createCourseId && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Edición</label>
                                    {loadingCreateEditions ? (
                                        <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
                                        </div>
                                    ) : createEditions.length === 0 ? (
                                        <p className="text-xs text-slate-500 py-2 italic">No hay ediciones activas.</p>
                                    ) : (
                                        <select
                                            value={createEditionId}
                                            onChange={(e) => setCreateEditionId(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                        >
                                            <option value="">-- Sin edición --</option>
                                            {createEditions.map(ed => (
                                                <option key={ed.id} value={ed.id}>
                                                    {ed.name} {ed.start_date ? `(${new Date(ed.start_date).toLocaleDateString()})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2.5 rounded-lg font-bold text-slate-400 hover:bg-slate-800 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateUser}
                                disabled={!newUser.name || !newUser.email || !newUser.password || isCreatingUser}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isCreatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Usuario'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-amber-200 mb-2">Seguridad y Accesos</h3>
                    <p className="text-sm text-slate-400">
                        Como administrador, puedes gestionar las credenciales de los alumnos. Recuerda que no pueden darse de alta ellos mismos; tú eres responsable de crear sus cuentas y matricularlos en los cursos correspondientes.
                    </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/10 p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-emerald-200 mb-2">Matrícula Masiva</h3>
                    <p className="text-sm text-slate-400">
                        Usa el botón "Matrícula Masiva (CSV)" para subir una lista de emails y matricular a todos los alumnos en un curso y edición de una sola vez.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
