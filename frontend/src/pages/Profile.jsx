import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import {
    User,
    Mail,
    Phone,
    Calendar,
    Camera,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    Clock,
    FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Profile = () => {
    const { user, profile, refreshProfile } = useAuth();
    const { showAlert } = useModal();
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        phone: '',
        birth_date: ''
    });

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(null);

    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name || '',
                bio: profile.bio || '',
                phone: profile.phone || '',
                birth_date: profile.birth_date || ''
            });
            setAvatarUrl(profile.avatar_url);
        }
    }, [profile]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .schema('iavolution')
                .from('profiles')
                .update({
                    name: formData.name,
                    bio: formData.bio,
                    phone: formData.phone,
                    birth_date: formData.birth_date || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            await showAlert('Perfil actualizado con éxito.', 'success');
            if (refreshProfile) refreshProfile();
        } catch (err) {
            console.error('Error updating profile:', err);
            await showAlert('Error al actualizar el perfil: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        try {
            setUploading(true);

            if (!e.target.files || e.target.files.length === 0) {
                throw new Error('Debes seleccionar una imagen para subir.');
            }

            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}-${Math.random()}.${fileExt}`;

            // 1. Upload image to 'avatars' bucket
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update profile with new avatar URL
            const { error: updateError } = await supabase
                .schema('iavolution')
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);
            await showAlert('Foto de perfil actualizada.', 'success');
            if (refreshProfile) refreshProfile();
        } catch (err) {
            console.error('Error uploading avatar:', err);
            // If bucket doesn't exist, provide helpful message
            if (err.message.includes('bucket')) {
                await showAlert('El contenedor de imágenes "avatars" no existe. Contacta al administrador.', 'error');
            } else {
                await showAlert('Error al subir la imagen: ' + err.message, 'error');
            }
        } finally {
            setUploading(false);
        }
    };

    if (!profile) return (
        <div className="flex justify-center items-center h-screen bg-slate-950">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-8 animate-in fade-in duration-500">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header/Back Link */}
                <div className="flex items-center justify-between">
                    <Link
                        to={profile.roleName === 'student' ? '/dashboard' : '/admin'}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
                    >
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 group-hover:bg-slate-800">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="font-medium">Volver</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${profile.roleName === 'admin' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                profile.roleName === 'teacher' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                    'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            }`}>
                            {profile.roleName}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Avatar & Quick Info */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl text-center relative overflow-hidden group">
                            {/* Decorative background blur */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-indigo-500/20 transition-all"></div>

                            <div className="relative mb-6 mx-auto w-32 h-32">
                                <div className="w-32 h-32 rounded-3xl bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-2xl transition-transform group-hover:scale-105 duration-500 flex items-center justify-center">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-16 h-16 text-slate-600" />
                                    )}
                                </div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="absolute -bottom-2 -right-2 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                                    title="Cambiar foto de perfil"
                                >
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                />
                            </div>

                            <h2 className="text-xl font-bold text-white mb-1 truncate">{profile.name}</h2>
                            <p className="text-sm text-slate-400 mb-6 truncate">{profile.email}</p>

                            <div className="pt-6 border-t border-slate-800 space-y-4">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500 flex items-center gap-1.5 font-medium"><Clock className="w-3 h-3" /> Miembro desde</span>
                                    <span className="text-slate-300 font-bold">{new Date(profile.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500 flex items-center gap-1.5 font-medium"><Calendar className="w-3 h-3" /> Nacimiento</span>
                                    <span className="text-slate-300 font-bold">{formData.birth_date ? new Date(formData.birth_date).toLocaleDateString() : '--'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-3xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <AlertCircle className="w-5 h-5 text-indigo-400" />
                                <h4 className="text-white font-bold text-sm">Seguridad</h4>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                Para cambiar tu contraseña o email, por favor utiliza el flujo de recuperación de contraseña en la pantalla de inicio de sesión.
                            </p>
                            <button className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all">
                                Solicitar cambio de clave
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Edit Form */}
                    <div className="lg:col-span-2">
                        <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl space-y-8">
                            <div className="flex items-center gap-3 mb-2">
                                <FileText className="w-6 h-6 text-indigo-400" />
                                <h3 className="text-xl font-bold text-white">Información Personal</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Name */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                        <User className="w-3 h-3" /> Nombre Completo
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Tu nombre..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-700 font-medium"
                                        required
                                    />
                                </div>

                                {/* Phone */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                        <Phone className="w-3 h-3" /> Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="+34 ..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-700 font-medium"
                                    />
                                </div>

                                {/* Email (Read-only) */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                        <Mail className="w-3 h-3" /> Email (No editable)
                                    </label>
                                    <div className="w-full bg-slate-950/50 border border-slate-900 rounded-2xl px-5 py-3.5 text-slate-500 font-medium italic cursor-not-allowed">
                                        {profile.email}
                                    </div>
                                </div>

                                {/* Birth Date */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                        <Calendar className="w-3 h-3" /> Fecha de Nacimiento
                                    </label>
                                    <input
                                        type="date"
                                        name="birth_date"
                                        value={formData.birth_date}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Bio */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Biografía / Acerca de ti</label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    placeholder="Cuéntanos un poco sobre ti..."
                                    rows="4"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-700 font-medium resize-none"
                                ></textarea>
                            </div>

                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
