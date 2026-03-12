import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Faltan credenciales de Supabase en el archivo .env")
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

// Secondary client for admin operations (user creation) — uses isolated storage
// so signUp calls don't overwrite the admin's active session
export const supabaseAdmin = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        storageKey: 'sb-admin-auth',
        autoRefreshToken: false,
        persistSession: false,
    }
})
