import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession()
            .then(({ data, error }) => {
                if (error) {
                    console.error("Error getting session:", error);
                }
                const session = data?.session || null;
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchProfile(session.user.id);
                } else {
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error("Exception getting session:", err);
                setLoading(false);
            });

        // Listen for auth changes
        const authChangeResult = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            if (authChangeResult?.data?.subscription) {
                authChangeResult.data.subscription.unsubscribe();
            }
        };
    }, []);

    const fetchProfile = async (userId) => {
        try {
            let { data, error } = await supabase
                .schema('iavolution')
                .from('profiles')
                .select(`
          *,
          roles (
            name,
            description
          )
        `)
                .eq('id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.warn("Profile not found. Attempting to auto-recover...");
                    // Try to auto-create missing profile
                    const { data: authData } = await supabase.auth.getUser();
                    if (authData?.user && authData.user.id === userId) {
                        const { data: roleData } = await supabase.schema('iavolution').from('roles').select('id').eq('name', 'student').single();
                        if (roleData) {
                            const { data: newProfile, error: insertError } = await supabase.schema('iavolution').from('profiles').insert([{
                                id: userId,
                                email: authData.user.email,
                                name: authData.user.user_metadata?.name || authData.user.user_metadata?.full_name || authData.user.email,
                                role_id: roleData.id,
                                status: 'active',
                                app: 'iavolution'
                            }]).select(`*, roles(name, description)`).single();
                            
                            if (!insertError && newProfile) {
                                console.log("Profile auto-recovered successfully.");
                                data = newProfile;
                                error = null;
                            }
                        }
                    }
                }
                
                if (error) {
                    console.error("Error fetching profile:", error);
                    return;
                }
            }
            
            if (data) {
                // Check if user is blocked
                if (data.status === 'blocked') {
                    console.warn("User is blocked. Logging out...");
                    await supabase.auth.signOut();
                    setProfile(null);
                    setUser(null);
                    setSession(null);
                    alert("Tu cuenta ha sido desactivada. Contacta con el administrador.");
                    return;
                }
                setProfile({ ...data, roleName: data.roles?.name });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id);
    };

    const login = async (email, password) => {
        return supabase.auth.signInWithPassword({ email, password });
    };

    const register = async (email, password, name, role = 'student') => {
        return supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name,
                    full_name: name,
                    role: role
                }
            }
        });
    };

    const logout = async () => {
        return supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, loading, login, register, logout, refreshProfile }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
